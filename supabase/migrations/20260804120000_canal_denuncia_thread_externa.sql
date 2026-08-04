-- Thread bidirecional: anotações RH visíveis na consulta pública + respostas do relator.
BEGIN;

-- Relator não tem profile; RH mantém created_by.
ALTER TABLE public.canal_denuncia_anotacoes
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.canal_denuncia_anotacoes
  ADD COLUMN IF NOT EXISTS autor_origem text NOT NULL DEFAULT 'rh';

ALTER TABLE public.canal_denuncia_anotacoes
  ADD COLUMN IF NOT EXISTS visivel_externo boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'canal_denuncia_anotacoes_autor_origem'
  ) THEN
    ALTER TABLE public.canal_denuncia_anotacoes
      ADD CONSTRAINT canal_denuncia_anotacoes_autor_origem
      CHECK (autor_origem IN ('rh', 'relator'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'canal_denuncia_anotacoes_origem_created_by'
  ) THEN
    ALTER TABLE public.canal_denuncia_anotacoes
      ADD CONSTRAINT canal_denuncia_anotacoes_origem_created_by
      CHECK (
        (autor_origem = 'rh' AND created_by IS NOT NULL)
        OR (autor_origem = 'relator' AND created_by IS NULL)
      );
  END IF;
END $$;

-- Notas já existentes passam a aparecer na consulta (pedido de produto).
UPDATE public.canal_denuncia_anotacoes
SET visivel_externo = true
WHERE visivel_externo IS DISTINCT FROM true;

COMMENT ON COLUMN public.canal_denuncia_anotacoes.autor_origem IS
  'rh = equipe interna; relator = resposta na consulta pública por protocolo.';
COMMENT ON COLUMN public.canal_denuncia_anotacoes.visivel_externo IS
  'Se true, a mensagem aparece na consulta pública por protocolo.';

-- Anexo do relator: janela curta após criar a anotação (upload pós-RPC).
CREATE OR REPLACE FUNCTION public._denuncia_spin_anexo_resposta_ok(
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
      AND a.created_at > now() - interval '2 hours'
  );
$$;

REVOKE ALL ON FUNCTION public._denuncia_spin_anexo_resposta_ok(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._denuncia_spin_anexo_resposta_ok(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS canal_denuncia_anexos_anon_insert ON public.canal_denuncia_anexos;
CREATE POLICY canal_denuncia_anexos_anon_insert
  ON public.canal_denuncia_anexos FOR INSERT TO anon
  WITH CHECK (
    (
      anotacao_id IS NULL
      AND public._denuncia_spin_anexo_anon_ok(denuncia_id)
    )
    OR (
      anotacao_id IS NOT NULL
      AND public._denuncia_spin_anexo_resposta_ok(denuncia_id, anotacao_id)
    )
  );

DROP POLICY IF EXISTS canal_denuncias_spin_storage_insert_anon ON storage.objects;
CREATE POLICY canal_denuncias_spin_storage_insert_anon
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'canal-denuncias-spin'
    AND (
      public._denuncia_spin_anexo_anon_ok(split_part(name, '/', 1)::uuid)
      OR (
        NULLIF(split_part(name, '/', 2), '') IS NOT NULL
        AND public._denuncia_spin_anexo_resposta_ok(
          split_part(name, '/', 1)::uuid,
          split_part(name, '/', 2)::uuid
        )
      )
    )
  );

-- Consulta pública: status + timeline + mensagens visíveis (sem nomes de staff).
CREATE OR REPLACE FUNCTION public.consultar_denuncia_spin(p_protocolo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_id uuid;
  v_status text;
  v_created timestamptz;
  v_res text;
  t_avaliacao timestamptz;
  t_atendida timestamptz;
  v_mensagens jsonb;
BEGIN
  v_norm := upper(btrim(p_protocolo));
  IF v_norm !~ '^CDSPIN[0-9]{5}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT d.id, d.status::text, d.created_at, d.descricao_resolucao
  INTO v_id, v_status, v_created, v_res
  FROM public.canal_denuncias_spin d
  WHERE d.protocolo = v_norm;

  IF v_id IS NULL THEN
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

REVOKE ALL ON FUNCTION public.consultar_denuncia_spin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_denuncia_spin(text) TO anon, authenticated;

-- Resposta do relator (protocolo = credencial).
CREATE OR REPLACE FUNCTION public.responder_denuncia_spin(
  p_protocolo text,
  p_texto text
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
  v_txt text;
  v_nota_id uuid;
BEGIN
  v_norm := upper(btrim(p_protocolo));
  IF v_norm !~ '^CDSPIN[0-9]{5}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  v_txt := btrim(COALESCE(p_texto, ''));
  IF length(v_txt) < 1 OR length(v_txt) > 8000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_text');
  END IF;

  SELECT d.id, d.status::text
  INTO v_id, v_status
  FROM public.canal_denuncias_spin d
  WHERE d.protocolo = v_norm;

  IF v_id IS NULL THEN
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

REVOKE ALL ON FUNCTION public.responder_denuncia_spin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_denuncia_spin(text, text) TO anon, authenticated;

COMMIT;
