-- Canal público: protocolo imprevisível, e-mail na consulta identificada,
-- limite de tentativas e insert só via RPC (sem INSERT direto anon/auth).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Protocolo novo: CDSPIN- + 16 hex (não sequencial). Legado CDSPIN##### permanece.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canal_denuncia_spin_next_protocol()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v text;
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    v := 'CDSPIN-' || upper(encode(gen_random_bytes(8), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.canal_denuncias_spin d WHERE d.protocolo = v
    );
  END LOOP;
  RETURN v;
END;
$$;

COMMENT ON FUNCTION public.canal_denuncia_spin_next_protocol() IS
  'Protocolo público imprevisível (CDSPIN- + 16 hex). Protocolos CDSPIN00001… antigos continuam válidos na consulta.';

CREATE OR REPLACE FUNCTION public._canal_denuncia_spin_protocolo_ok(p_protocolo text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_protocolo ~ '^CDSPIN[0-9]{5}$' OR p_protocolo ~ '^CDSPIN-[0-9A-F]{16}$';
$$;

REVOKE ALL ON FUNCTION public._canal_denuncia_spin_protocolo_ok(text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Rate limit por IP (hash). Sem políticas RLS → cliente não lê/grava.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canal_denuncia_spin_rate_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('registrar', 'consultar', 'responder')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canal_denuncia_spin_rate_ip_kind_created
  ON public.canal_denuncia_spin_rate_event (ip_hash, kind, created_at DESC);

ALTER TABLE public.canal_denuncia_spin_rate_event ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.canal_denuncia_spin_rate_event FROM PUBLIC;
REVOKE ALL ON TABLE public.canal_denuncia_spin_rate_event FROM anon, authenticated;

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
    ip := 'unknown';
  END IF;
  RETURN md5(ip);
END;
$$;

REVOKE ALL ON FUNCTION public._canal_denuncia_spin_client_ip_hash() FROM PUBLIC;

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

REVOKE ALL ON FUNCTION public._canal_denuncia_spin_rate_allow(text, integer, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._canal_denuncia_spin_email_consulta_ok(
  p_email_registro text,
  p_email_informado text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    p_email_registro IS NULL
    OR length(btrim(p_email_registro)) < 1
    OR (
      p_email_informado IS NOT NULL
      AND lower(btrim(p_email_informado)) = lower(btrim(p_email_registro))
    );
$$;

REVOKE ALL ON FUNCTION public._canal_denuncia_spin_email_consulta_ok(text, text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Insert público só via RPC (SECURITY DEFINER).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS canal_denuncias_spin_anon_insert ON public.canal_denuncias_spin;
DROP POLICY IF EXISTS canal_denuncias_spin_authenticated_public_insert ON public.canal_denuncias_spin;

REVOKE INSERT ON TABLE public.canal_denuncias_spin FROM anon;
REVOKE INSERT ON TABLE public.canal_denuncias_spin FROM authenticated;

-- ---------------------------------------------------------------------------
-- registrar_denuncia_spin (+ honeypot p_hp)
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

DROP FUNCTION IF EXISTS public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text);

REVOKE ALL ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.registrar_denuncia_spin(boolean, text, text, text, text[], text, text, text) IS
  'Canal de denúncias Spin — insert público (bypass RLS); rate limit; honeypot p_hp; protocolo imprevisível.';

-- ---------------------------------------------------------------------------
-- consultar_denuncia_spin (e-mail obrigatório se o registro tiver e-mail)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.consultar_denuncia_spin(text);

CREATE FUNCTION public.consultar_denuncia_spin(p_protocolo text, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_id uuid;
  v_status text;
  v_created timestamptz;
  v_res text;
  v_email text;
  t_avaliacao timestamptz;
  t_atendida timestamptz;
  v_mensagens jsonb;
BEGIN
  IF NOT public._canal_denuncia_spin_rate_allow('consultar', 30, 80) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  v_norm := upper(btrim(p_protocolo));
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

-- ---------------------------------------------------------------------------
-- responder_denuncia_spin (mesmo critério de e-mail)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.responder_denuncia_spin(text, text);

CREATE FUNCTION public.responder_denuncia_spin(
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
  v_id uuid;
  v_status text;
  v_email text;
  v_txt text;
  v_nota_id uuid;
BEGIN
  IF NOT public._canal_denuncia_spin_rate_allow('responder', 15, 40) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  v_norm := upper(btrim(p_protocolo));
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
