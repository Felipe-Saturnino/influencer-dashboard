-- Reações de layout em postagens (UX). Não é ciência nem «Li e Ocultar».
-- Origens: informativo, comunicado de RH, comunicado/dica da Academy.

BEGIN;

CREATE TABLE IF NOT EXISTS public.conteudo_reacao (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem      text NOT NULL,
  content_id  uuid NOT NULL,
  user_id     uuid NOT NULL,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conteudo_reacao_origem_check CHECK (
    origem IN ('informativo', 'rh_comunicado', 'academy_comunicado', 'academy_dica')
  ),
  CONSTRAINT conteudo_reacao_emoji_check CHECK (
    emoji IN ('up', 'heart', 'clap', 'party', 'wow')
  ),
  CONSTRAINT conteudo_reacao_unique UNIQUE (origem, content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conteudo_reacao_post
  ON public.conteudo_reacao (origem, content_id);

ALTER TABLE public.conteudo_reacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY conteudo_reacao_select ON public.conteudo_reacao
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY conteudo_reacao_insert ON public.conteudo_reacao
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY conteudo_reacao_update ON public.conteudo_reacao
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY conteudo_reacao_delete ON public.conteudo_reacao
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_reacao TO authenticated;

COMMENT ON TABLE public.conteudo_reacao IS
  'Reação de layout (um emoji por usuário por postagem). Não substitui ciência nem leitura.';

COMMIT;
