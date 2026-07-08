-- Customer Success — Atendimento: origem E-mail (Outlook) + anexos + RPC de ingestão.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cs_chamado_protocolo_contador_email (
  ano    int  NOT NULL PRIMARY KEY,
  ultimo int  NOT NULL DEFAULT 0
);

ALTER TABLE public.cs_chamados
  DROP CONSTRAINT IF EXISTS cs_chamados_origem_check;

ALTER TABLE public.cs_chamados
  ADD CONSTRAINT cs_chamados_origem_check
  CHECK (origem IN ('site_spin', 'email'));

ALTER TABLE public.cs_chamados
  ADD COLUMN IF NOT EXISTS assunto text,
  ADD COLUMN IF NOT EXISTS email_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_chamados_email_message_id
  ON public.cs_chamados (email_message_id)
  WHERE email_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cs_chamados_assunto ON public.cs_chamados (assunto);

CREATE TABLE IF NOT EXISTS public.cs_chamado_anexos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id    uuid        NOT NULL REFERENCES public.cs_chamados (id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  storage_path  text        NOT NULL,
  content_type  text,
  tamanho_bytes bigint,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_chamado_anexos_chamado ON public.cs_chamado_anexos (chamado_id);

CREATE OR REPLACE FUNCTION public.cs_gerar_protocolo_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int := extract(year FROM timezone('America/Sao_Paulo', now()))::int;
  v_num int;
BEGIN
  INSERT INTO public.cs_chamado_protocolo_contador_email (ano, ultimo)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET ultimo = public.cs_chamado_protocolo_contador_email.ultimo + 1
  RETURNING ultimo INTO v_num;

  RETURN 'EMAIL-' || v_ano::text || '/' || lpad(v_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.cs_gerar_protocolo_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_gerar_protocolo_email() TO service_role;

CREATE OR REPLACE FUNCTION public.cs_chamado_criar_email(
  p_remetente_email   text,
  p_remetente_nome    text,
  p_assunto           text,
  p_corpo             text,
  p_recebido_em       timestamptz DEFAULT now(),
  p_email_message_id  text DEFAULT NULL,
  p_anexos            jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id              uuid;
  v_protocolo       text;
  v_email           text := lower(btrim(p_remetente_email));
  v_nome            text := btrim(coalesce(nullif(btrim(p_remetente_nome), ''), v_email));
  v_assunto         text := btrim(p_assunto);
  v_corpo           text := btrim(coalesce(p_corpo, ''));
  v_msg_id          text := nullif(btrim(coalesce(p_email_message_id, '')), '');
  v_recebido        timestamptz := coalesce(p_recebido_em, now());
  v_anexo           jsonb;
  v_nome_anexo      text;
  v_path_anexo      text;
  v_tipo_anexo      text;
  v_tamanho_anexo   bigint;
BEGIN
  IF v_email = '' OR v_assunto = '' THEN
    RAISE EXCEPTION 'Remetente e assunto são obrigatórios';
  END IF;

  IF v_msg_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.cs_chamados WHERE email_message_id = v_msg_id LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_protocolo := public.cs_gerar_protocolo_email();

  INSERT INTO public.cs_chamados (
    protocolo,
    origem,
    status,
    nome_completo,
    telefone,
    email,
    atuacao,
    empresa,
    mensagem,
    assunto,
    email_message_id,
    created_at,
    updated_at
  ) VALUES (
    v_protocolo,
    'email',
    'aberto',
    v_nome,
    NULL,
    v_email,
    'outros',
    NULL,
    v_corpo,
    v_assunto,
    v_msg_id,
    v_recebido,
    v_recebido
  )
  RETURNING id INTO v_id;

  INSERT INTO public.cs_chamado_historico (
    chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
  ) VALUES (
    v_id, 'abertura', NULL, v_nome, NULL
  );

  IF jsonb_typeof(p_anexos) = 'array' THEN
    FOR v_anexo IN SELECT value FROM jsonb_array_elements(p_anexos)
    LOOP
      v_nome_anexo := btrim(coalesce(v_anexo->>'nome', ''));
      v_path_anexo := btrim(coalesce(v_anexo->>'storage_path', ''));
      v_tipo_anexo := nullif(btrim(coalesce(v_anexo->>'content_type', '')), '');
      v_tamanho_anexo := NULL;
      IF (v_anexo ? 'tamanho_bytes') AND (v_anexo->>'tamanho_bytes') ~ '^[0-9]+$' THEN
        v_tamanho_anexo := (v_anexo->>'tamanho_bytes')::bigint;
      END IF;

      IF v_nome_anexo <> '' AND v_path_anexo <> '' THEN
        INSERT INTO public.cs_chamado_anexos (chamado_id, nome, storage_path, content_type, tamanho_bytes)
        VALUES (v_id, v_nome_anexo, v_path_anexo, v_tipo_anexo, v_tamanho_anexo);
      END IF;
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_chamado_criar_email(text, text, text, text, timestamptz, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_chamado_criar_email(text, text, text, text, timestamptz, text, jsonb) TO service_role;

ALTER TABLE public.cs_chamado_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_chamado_anexos_select ON public.cs_chamado_anexos FOR SELECT TO authenticated
  USING (
    public._cs_atendimento_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.cs_chamados c WHERE c.id = chamado_id
    )
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.cs_chamado_anexos FROM authenticated;
GRANT SELECT ON TABLE public.cs_chamado_anexos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cs-atendimento-email',
  'cs-atendimento-email',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS cs_atendimento_email_storage_select ON storage.objects;
CREATE POLICY cs_atendimento_email_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cs-atendimento-email'
    AND public._cs_atendimento_perm('view')
  );

COMMENT ON TABLE public.cs_chamado_anexos IS
  'Customer Success — anexos de chamados com origem E-mail (paths no bucket cs-atendimento-email).';
COMMENT ON FUNCTION public.cs_chamado_criar_email IS
  'Ingestão Outlook / integração: cria chamado origem email com protocolo EMAIL-ANO/NNNN. service_role. Dedupe por email_message_id.';
COMMENT ON TABLE public.cs_chamados IS
  'Customer Success — chamados (Site Spin e E-mail). Protocolos SITE-ANO/NNNN e EMAIL-ANO/NNNN.';

COMMIT;
