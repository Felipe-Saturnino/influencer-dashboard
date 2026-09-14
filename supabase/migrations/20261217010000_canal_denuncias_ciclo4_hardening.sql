-- Ciclo 4 Verificação 2.0 — Canal de Denúncias público
-- B2: REVOKE helpers de anexo (oráculo RPC) + checks inline nas policies
-- B3: teto 5 anexos + janela 1 h (envio) / 1 h (resposta)
-- B4: rate limit fail-closed sem IP
-- B1: rate mais estrito para protocolo legado
-- B5: validação de e-mail no registrar
-- O4: bucket alinhado à UI (20 MB, PDF/JPG/PNG/MP4)

BEGIN;

-- ---------------------------------------------------------------------------
-- B4 — IP desconhecido nega (não compartilha balde «unknown»)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._canal_denuncia_spin_client_ip_hash()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  h jsonb;
  ip text;
BEGIN
  BEGIN
    h := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    h := '{}'::jsonb;
  END;
  ip := nullif(btrim(split_part(COALESCE(h->>'x-forwarded-for', ''), ',', 1)), '');
  IF ip IS NULL THEN
    ip := nullif(btrim(COALESCE(h->>'cf-connecting-ip', h->>'x-real-ip', '')), '');
  END IF;
  IF ip IS NULL OR ip = '' THEN
    RETURN NULL;
  END IF;
  RETURN md5(ip);
END;
$$;

CREATE OR REPLACE FUNCTION public._canal_denuncia_spin_rate_allow(
  p_kind text,
  p_max_hora integer,
  p_max_dia integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_hora int;
  v_dia int;
BEGIN
  IF p_kind NOT IN ('registrar', 'consultar', 'responder') THEN
    RETURN false;
  END IF;

  v_hash := public._canal_denuncia_spin_client_ip_hash();
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.canal_denuncia_spin_rate_event
  WHERE created_at < now() - interval '48 hours';

  SELECT count(*)::int INTO v_hora
  FROM public.canal_denuncia_spin_rate_event
  WHERE ip_hash = v_hash AND kind = p_kind AND created_at > now() - interval '1 hour';

  SELECT count(*)::int INTO v_dia
  FROM public.canal_denuncia_spin_rate_event
  WHERE ip_hash = v_hash AND kind = p_kind AND created_at > now() - interval '24 hours';

  IF v_hora >= p_max_hora OR v_dia >= p_max_dia THEN
    RETURN false;
  END IF;

  INSERT INTO public.canal_denuncia_spin_rate_event (ip_hash, kind)
  VALUES (v_hash, p_kind);
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- B2 + B3 — helpers DEFINER fora do schema da API (sem oráculo REST)
-- Policies continuam a usar as funções; PostgREST não expõe `canal_internal`.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS canal_internal;
REVOKE ALL ON SCHEMA canal_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA canal_internal TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION canal_internal.anexo_envio_ok(p_denuncia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.canal_denuncias_spin d
    WHERE d.id = p_denuncia_id
      AND d.created_at > now() - interval '1 hour'
      AND (
        SELECT count(*)::int
        FROM public.canal_denuncia_anexos a
        WHERE a.denuncia_id = p_denuncia_id
          AND a.anotacao_id IS NULL
      ) < 5
  );
$$;

CREATE OR REPLACE FUNCTION canal_internal.anexo_resposta_ok(
  p_denuncia_id uuid,
  p_anotacao_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.canal_denuncia_anotacoes a
    WHERE a.id = p_anotacao_id
      AND a.denuncia_id = p_denuncia_id
      AND a.autor_origem = 'relator'
      AND a.created_at > now() - interval '1 hour'
      AND (
        SELECT count(*)::int
        FROM public.canal_denuncia_anexos x
        WHERE x.anotacao_id = p_anotacao_id
      ) < 5
  );
$$;

REVOKE ALL ON FUNCTION canal_internal.anexo_envio_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION canal_internal.anexo_envio_ok(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION canal_internal.anexo_resposta_ok(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION canal_internal.anexo_resposta_ok(uuid, uuid) TO anon, authenticated, service_role;

-- Helpers públicos legados: manter assinatura para não quebrar refs, mas negar EXECUTE
-- e apontar para a lógica nova (só útil se alguma policy antiga ainda chamar).
CREATE OR REPLACE FUNCTION public._denuncia_spin_anexo_anon_ok(p_denuncia_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, canal_internal
AS $$
  SELECT canal_internal.anexo_envio_ok(p_denuncia_id);
$$;

CREATE OR REPLACE FUNCTION public._denuncia_spin_anexo_resposta_ok(
  p_denuncia_id uuid,
  p_anotacao_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, canal_internal
AS $$
  SELECT canal_internal.anexo_resposta_ok(p_denuncia_id, p_anotacao_id);
$$;

REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_anon_ok(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_anon_ok(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_resposta_ok(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_resposta_ok(uuid, uuid) FROM anon, authenticated;

DROP POLICY IF EXISTS canal_denuncia_anexos_anon_insert ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_anon_insert
  ON public.canal_denuncia_anexos FOR INSERT TO anon
  WITH CHECK (
    (
      anotacao_id IS NULL
      AND canal_internal.anexo_envio_ok(denuncia_id)
    )
    OR (
      anotacao_id IS NOT NULL
      AND canal_internal.anexo_resposta_ok(denuncia_id, anotacao_id)
    )
  );

DROP POLICY IF EXISTS canal_denuncia_anexos_auth_public_upload ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_auth_public_upload
  ON public.canal_denuncia_anexos FOR INSERT TO authenticated
  WITH CHECK (
    (
      anotacao_id IS NULL
      AND canal_internal.anexo_envio_ok(denuncia_id)
    )
    OR (
      anotacao_id IS NOT NULL
      AND canal_internal.anexo_resposta_ok(denuncia_id, anotacao_id)
    )
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_anon ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_anon
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND (
      (
        (
          NULLIF(split_part(name, '/', 2), '') IS NULL
          OR split_part(name, '/', 2) ~ '^[0-9]+_'
        )
        AND canal_internal.anexo_envio_ok(split_part(name, '/', 1)::uuid)
      )
      OR (
        NULLIF(split_part(name, '/', 2), '') IS NOT NULL
        AND split_part(name, '/', 2) ~ '^[0-9a-f-]{36}$'
        AND canal_internal.anexo_resposta_ok(
          split_part(name, '/', 1)::uuid,
          split_part(name, '/', 2)::uuid
        )
      )
    )
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_auth_public ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_auth_public
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND (
      (
        (
          NULLIF(split_part(name, '/', 2), '') IS NULL
          OR split_part(name, '/', 2) ~ '^[0-9]+_'
        )
        AND canal_internal.anexo_envio_ok(split_part(name, '/', 1)::uuid)
      )
      OR (
        NULLIF(split_part(name, '/', 2), '') IS NOT NULL
        AND split_part(name, '/', 2) ~ '^[0-9a-f-]{36}$'
        AND canal_internal.anexo_resposta_ok(
          split_part(name, '/', 1)::uuid,
          split_part(name, '/', 2)::uuid
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- O4 — bucket
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'video/mp4'
  ]
WHERE id = 'canal-denuncias-spin';

-- ---------------------------------------------------------------------------
-- B5 — validação de e-mail no registrar (mantém trigger de protocolo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_denuncia_spin(
  p_deseja_identificar boolean,
  p_nome text,
  p_telefone text,
  p_email text,
  p_tipos_denuncia text[],
  p_tipo_outro_descricao text,
  p_relato text,
  p_hp text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_protocolo text;
BEGIN
  IF NOT public._canal_denuncia_spin_rate_allow('registrar', 5, 15) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF length(btrim(COALESCE(p_hp, ''))) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rejected');
  END IF;

  IF p_tipos_denuncia IS NULL OR cardinality(p_tipos_denuncia) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipos_vazio');
  END IF;
  IF p_relato IS NULL OR length(btrim(p_relato)) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'relato_vazio');
  END IF;

  IF p_deseja_identificar THEN
    IF p_nome IS NULL OR length(btrim(p_nome)) < 1
       OR p_email IS NULL OR length(btrim(p_email)) < 1
       OR p_telefone IS NULL OR length(btrim(p_telefone)) < 1
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'identificacao_incompleta');
    END IF;
    IF lower(btrim(p_email)) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
       OR length(btrim(p_email)) > 254
    THEN
      RETURN jsonb_build_object('ok', false, 'error', 'email_invalido');
    END IF;
  END IF;

  IF 'outro' = ANY (p_tipos_denuncia)
     AND (p_tipo_outro_descricao IS NULL OR length(btrim(p_tipo_outro_descricao)) < 1)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outro_sem_descricao');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_tipos_denuncia) AS u(x)
    WHERE u.x NOT IN (
      'assedio_moral',
      'assedio_sexual',
      'discriminacao',
      'fraudes_corrupcao',
      'conflito_interesses',
      'conduta_antietica',
      'violacao_politicas',
      'uso_indevido_recursos',
      'vazamento_info',
      'seguranca_trabalho',
      'retaliacao',
      'elogios',
      'outro'
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tipo_invalido');
  END IF;

  INSERT INTO public.canal_denuncias_spin (
    deseja_identificar,
    nome,
    telefone,
    email,
    tipos_denuncia,
    tipo_outro_descricao,
    relato
  )
  VALUES (
    p_deseja_identificar,
    CASE WHEN p_deseja_identificar THEN btrim(p_nome) END,
    CASE WHEN p_deseja_identificar THEN btrim(p_telefone) END,
    CASE WHEN p_deseja_identificar THEN lower(btrim(p_email)) END,
    p_tipos_denuncia,
    CASE WHEN 'outro' = ANY (p_tipos_denuncia) THEN btrim(p_tipo_outro_descricao) END,
    btrim(p_relato)
  )
  RETURNING id, protocolo INTO v_id, v_protocolo;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'protocolo', v_protocolo
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- B1 — rate estrito em protocolo legado (consultar / responder)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consultar_denuncia_spin(p_protocolo text, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_legado boolean;
  v_id uuid;
  v_status text;
  v_created timestamptz;
  v_res text;
  v_email text;
  t_avaliacao timestamptz;
  t_atendida timestamptz;
  v_mensagens jsonb;
  v_max_h int;
  v_max_d int;
BEGIN
  v_norm := upper(btrim(p_protocolo));
  v_legado := v_norm ~ '^CDSPIN[0-9]{5}$';
  v_max_h := CASE WHEN v_legado THEN 5 ELSE 30 END;
  v_max_d := CASE WHEN v_legado THEN 20 ELSE 80 END;

  IF NOT public._canal_denuncia_spin_rate_allow('consultar', v_max_h, v_max_d) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF NOT public._canal_denuncia_spin_protocolo_ok(v_norm) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT d.id, d.status::text, d.created_at, d.descricao_resolucao, d.email
  INTO v_id, v_status, v_created, v_res, v_email
  FROM public.canal_denuncias_spin d
  WHERE d.protocolo = v_norm;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT public._canal_denuncia_spin_email_consulta_ok(v_email, p_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT min(h.changed_at) INTO t_avaliacao
  FROM public.canal_denuncia_status_historico h
  WHERE h.denuncia_id = v_id AND h.status_novo = 'em_avaliacao';

  SELECT min(h.changed_at) INTO t_atendida
  FROM public.canal_denuncia_status_historico h
  WHERE h.denuncia_id = v_id AND h.status_novo IN ('procedente', 'nao_procedente');

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'texto', a.texto,
        'autor_origem', a.autor_origem,
        'created_at', a.created_at,
        'anexos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('id', x.id, 'file_name', x.file_name)
            ORDER BY x.created_at ASC
          )
          FROM public.canal_denuncia_anexos x
          WHERE x.anotacao_id = a.id
        ), '[]'::jsonb)
      )
      ORDER BY a.created_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_mensagens
  FROM public.canal_denuncia_anotacoes a
  WHERE a.denuncia_id = v_id
    AND a.visivel_externo = true;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'relatado_em', v_created,
    'em_avaliacao_em', t_avaliacao,
    'atendida_em', t_atendida,
    'descricao_resolucao',
    CASE WHEN v_status IN ('procedente', 'nao_procedente') THEN v_res ELSE NULL END,
    'mensagens', COALESCE(v_mensagens, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_denuncia_spin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_denuncia_spin(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.responder_denuncia_spin(
  p_protocolo text,
  p_texto text,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_legado boolean;
  v_id uuid;
  v_status text;
  v_email text;
  v_txt text;
  v_nota_id uuid;
  v_max_h int;
  v_max_d int;
BEGIN
  v_norm := upper(btrim(p_protocolo));
  v_legado := v_norm ~ '^CDSPIN[0-9]{5}$';
  v_max_h := CASE WHEN v_legado THEN 5 ELSE 15 END;
  v_max_d := CASE WHEN v_legado THEN 20 ELSE 40 END;

  IF NOT public._canal_denuncia_spin_rate_allow('responder', v_max_h, v_max_d) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF NOT public._canal_denuncia_spin_protocolo_ok(v_norm) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  v_txt := btrim(COALESCE(p_texto, ''));
  IF length(v_txt) < 1 OR length(v_txt) > 8000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_text');
  END IF;

  SELECT d.id, d.status::text, d.email
  INTO v_id, v_status, v_email
  FROM public.canal_denuncias_spin d
  WHERE d.protocolo = v_norm;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT public._canal_denuncia_spin_email_consulta_ok(v_email, p_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_status IN ('procedente', 'nao_procedente') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'closed');
  END IF;

  INSERT INTO public.canal_denuncia_anotacoes (
    denuncia_id,
    texto,
    created_by,
    autor_origem,
    visivel_externo
  )
  VALUES (v_id, v_txt, NULL, 'relator', true)
  RETURNING id INTO v_nota_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_nota_id,
    'denuncia_id', v_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.responder_denuncia_spin(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_denuncia_spin(text, text, text) TO anon, authenticated;

COMMIT;
