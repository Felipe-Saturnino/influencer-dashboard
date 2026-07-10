-- Customer Success — Atendimento: origem Instagram (DM + Comentário) + thread de mensagens.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cs_chamado_protocolo_contador_dm (
  ano    int NOT NULL PRIMARY KEY,
  ultimo int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.cs_chamado_protocolo_contador_coment (
  ano    int NOT NULL PRIMARY KEY,
  ultimo int NOT NULL DEFAULT 0
);

ALTER TABLE public.cs_chamados
  DROP CONSTRAINT IF EXISTS cs_chamados_origem_check;

ALTER TABLE public.cs_chamados
  ADD CONSTRAINT cs_chamados_origem_check
  CHECK (origem IN ('site_spin', 'email', 'instagram_dm', 'instagram_comentario'));

ALTER TABLE public.cs_chamados
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS instagram_scoped_user_id text,
  ADD COLUMN IF NOT EXISTS instagram_conversation_id text,
  ADD COLUMN IF NOT EXISTS instagram_message_id text,
  ADD COLUMN IF NOT EXISTS instagram_comment_id text,
  ADD COLUMN IF NOT EXISTS instagram_media_id text,
  ADD COLUMN IF NOT EXISTS instagram_post_tipo text,
  ADD COLUMN IF NOT EXISTS instagram_post_caption text,
  ADD COLUMN IF NOT EXISTS primeira_resposta_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_mensagem_usuario_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_chamados_instagram_message_id
  ON public.cs_chamados (instagram_message_id)
  WHERE instagram_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_chamados_instagram_comment_id
  ON public.cs_chamados (instagram_comment_id)
  WHERE instagram_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cs_chamados_instagram_username
  ON public.cs_chamados (instagram_username);

CREATE INDEX IF NOT EXISTS idx_cs_chamados_origem_instagram
  ON public.cs_chamados (origem)
  WHERE origem IN ('instagram_dm', 'instagram_comentario');

CREATE TABLE IF NOT EXISTS public.cs_chamado_mensagens (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id           uuid        NOT NULL REFERENCES public.cs_chamados (id) ON DELETE CASCADE,
  direcao              text        NOT NULL
    CHECK (direcao IN ('inbound', 'outbound', 'sistema')),
  texto                text,
  midia_url            text,
  content_type         text,
  instagram_message_id text,
  autor_tipo           text        NOT NULL DEFAULT 'cliente'
    CHECK (autor_tipo IN ('cliente', 'atendente', 'sistema')),
  usuario_id           uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_chamado_mensagens_chamado
  ON public.cs_chamado_mensagens (chamado_id, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_chamado_mensagens_ig_msg
  ON public.cs_chamado_mensagens (instagram_message_id)
  WHERE instagram_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cs_gerar_protocolo_dm()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int := extract(year FROM timezone('America/Sao_Paulo', now()))::int;
  v_num int;
BEGIN
  INSERT INTO public.cs_chamado_protocolo_contador_dm (ano, ultimo)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET ultimo = public.cs_chamado_protocolo_contador_dm.ultimo + 1
  RETURNING ultimo INTO v_num;

  RETURN 'DM-' || v_ano::text || '/' || lpad(v_num::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_gerar_protocolo_coment()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano int := extract(year FROM timezone('America/Sao_Paulo', now()))::int;
  v_num int;
BEGIN
  INSERT INTO public.cs_chamado_protocolo_contador_coment (ano, ultimo)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
    SET ultimo = public.cs_chamado_protocolo_contador_coment.ultimo + 1
  RETURNING ultimo INTO v_num;

  RETURN 'COMENT-' || v_ano::text || '/' || lpad(v_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.cs_gerar_protocolo_dm() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_gerar_protocolo_coment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_gerar_protocolo_dm() TO service_role;
GRANT EXECUTE ON FUNCTION public.cs_gerar_protocolo_coment() TO service_role;

CREATE OR REPLACE FUNCTION public.cs_chamado_criar_instagram_dm(
  p_username                text,
  p_scoped_user_id          text,
  p_conversation_id         text,
  p_mensagem                text,
  p_recebido_em             timestamptz DEFAULT now(),
  p_instagram_message_id    text DEFAULT NULL,
  p_midia_url               text DEFAULT NULL,
  p_content_type            text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id              uuid;
  v_protocolo       text;
  v_username        text := lower(btrim(regexp_replace(coalesce(p_username, ''), '^@', '')));
  v_scoped          text := nullif(btrim(coalesce(p_scoped_user_id, '')), '');
  v_conversation    text := nullif(btrim(coalesce(p_conversation_id, '')), '');
  v_texto           text := btrim(coalesce(p_mensagem, ''));
  v_recebido        timestamptz := coalesce(p_recebido_em, now());
  v_ig_msg_id       text := nullif(btrim(coalesce(p_instagram_message_id, '')), '');
  v_email           text;
BEGIN
  IF v_username = '' OR v_scoped IS NULL OR v_conversation IS NULL THEN
    RAISE EXCEPTION 'Username, scoped_user_id e conversation_id são obrigatórios';
  END IF;

  IF v_ig_msg_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.cs_chamados WHERE instagram_message_id = v_ig_msg_id LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_email := 'ig+' || v_scoped || '@cs.spin.internal';
  v_protocolo := public.cs_gerar_protocolo_dm();

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
    instagram_username,
    instagram_scoped_user_id,
    instagram_conversation_id,
    instagram_message_id,
    ultima_mensagem_usuario_em,
    created_at,
    updated_at
  ) VALUES (
    v_protocolo,
    'instagram_dm',
    'aberto',
    '@' || v_username,
    NULL,
    v_email,
    'outros',
    NULL,
    v_texto,
    v_username,
    v_scoped,
    v_conversation,
    v_ig_msg_id,
    v_recebido,
    v_recebido,
    v_recebido
  )
  RETURNING id INTO v_id;

  INSERT INTO public.cs_chamado_historico (
    chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
  ) VALUES (
    v_id, 'abertura', NULL, '@' || v_username, NULL
  );

  INSERT INTO public.cs_chamado_mensagens (
    chamado_id, direcao, texto, midia_url, content_type, instagram_message_id, autor_tipo, created_at
  ) VALUES (
    v_id,
    'inbound',
    NULLIF(v_texto, ''),
    nullif(btrim(coalesce(p_midia_url, '')), ''),
    nullif(btrim(coalesce(p_content_type, '')), ''),
    v_ig_msg_id,
    'cliente',
    v_recebido
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cs_chamado_criar_instagram_comentario(
  p_username              text,
  p_scoped_user_id        text,
  p_media_id              text,
  p_post_caption          text,
  p_post_tipo             text,
  p_comentario            text,
  p_recebido_em           timestamptz DEFAULT now(),
  p_instagram_comment_id  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id              uuid;
  v_protocolo       text;
  v_username        text := lower(btrim(regexp_replace(coalesce(p_username, ''), '^@', '')));
  v_scoped          text := nullif(btrim(coalesce(p_scoped_user_id, '')), '');
  v_media           text := nullif(btrim(coalesce(p_media_id, '')), '');
  v_caption         text := btrim(coalesce(p_post_caption, ''));
  v_tipo            text := nullif(btrim(coalesce(p_post_tipo, '')), '');
  v_texto           text := btrim(coalesce(p_comentario, ''));
  v_recebido        timestamptz := coalesce(p_recebido_em, now());
  v_comment_id      text := nullif(btrim(coalesce(p_instagram_comment_id, '')), '');
  v_email           text;
BEGIN
  IF v_username = '' OR v_scoped IS NULL OR v_media IS NULL THEN
    RAISE EXCEPTION 'Username, scoped_user_id e media_id são obrigatórios';
  END IF;

  IF v_comment_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.cs_chamados WHERE instagram_comment_id = v_comment_id LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_email := 'ig+' || v_scoped || '@cs.spin.internal';
  v_protocolo := public.cs_gerar_protocolo_coment();

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
    instagram_username,
    instagram_scoped_user_id,
    instagram_media_id,
    instagram_post_tipo,
    instagram_post_caption,
    instagram_comment_id,
    created_at,
    updated_at
  ) VALUES (
    v_protocolo,
    'instagram_comentario',
    'aberto',
    '@' || v_username,
    NULL,
    v_email,
    'outros',
    NULL,
    v_texto,
    v_username,
    v_scoped,
    v_media,
    v_tipo,
    NULLIF(v_caption, ''),
    v_comment_id,
    v_recebido,
    v_recebido
  )
  RETURNING id INTO v_id;

  INSERT INTO public.cs_chamado_historico (
    chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
  ) VALUES (
    v_id, 'abertura', NULL, '@' || v_username, NULL
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_chamado_criar_instagram_dm(text, text, text, text, timestamptz, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_chamado_criar_instagram_comentario(text, text, text, text, text, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_chamado_criar_instagram_dm(text, text, text, text, timestamptz, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cs_chamado_criar_instagram_comentario(text, text, text, text, text, text, timestamptz, text) TO service_role;

ALTER TABLE public.cs_chamado_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_chamado_mensagens_select ON public.cs_chamado_mensagens;
CREATE POLICY cs_chamado_mensagens_select ON public.cs_chamado_mensagens FOR SELECT TO authenticated
  USING (
    public._cs_atendimento_perm('view')
    AND EXISTS (
      SELECT 1 FROM public.cs_chamados c WHERE c.id = chamado_id
    )
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.cs_chamado_mensagens FROM authenticated;
GRANT SELECT ON TABLE public.cs_chamado_mensagens TO authenticated;

COMMENT ON TABLE public.cs_chamado_mensagens IS
  'Customer Success — thread de mensagens Instagram DM (inbound/outbound/sistema).';
COMMENT ON FUNCTION public.cs_chamado_criar_instagram_dm IS
  'Ingestão Meta DM: cria chamado origem instagram_dm com protocolo DM-ANO/NNNN. service_role.';
COMMENT ON FUNCTION public.cs_chamado_criar_instagram_comentario IS
  'Ingestão Meta comentário: cria chamado origem instagram_comentario com protocolo COMENT-ANO/NNNN. service_role.';
COMMENT ON TABLE public.cs_chamados IS
  'Customer Success — chamados (Site Spin, E-mail, Instagram DM e Comentário).';

COMMIT;
