-- Painel de Notícias (TV) — ingestão RSS + leitura pública anon

BEGIN;

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'painel_noticias_rss',
  'Painel de Notícias (RSS)',
  'Ingestão horária de feeds RSS para public.painel_noticia (Edge sync-painel-noticias-rss).',
  true
)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.painel_noticia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_url        text        NOT NULL,
  titulo          text        NOT NULL,
  resumo          text,
  published_at    timestamptz,
  feed_url        text,
  fonte_host      text,
  passou_filtro   boolean     NOT NULL DEFAULT true,
  visivel_desde   timestamptz NOT NULL DEFAULT now(),
  visivel_ate     timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT painel_noticia_item_url_unique UNIQUE (item_url)
);

CREATE INDEX IF NOT EXISTS idx_painel_noticia_visivel_desde
  ON public.painel_noticia (visivel_desde DESC);

CREATE INDEX IF NOT EXISTS idx_painel_noticia_visivel_ate
  ON public.painel_noticia (visivel_ate);

CREATE INDEX IF NOT EXISTS idx_painel_noticia_passou_filtro
  ON public.painel_noticia (passou_filtro, visivel_desde DESC);

COMMENT ON TABLE public.painel_noticia IS
  'Notícias RSS para painel TV (/painel-noticias). Purge físico após janela de 4h quando não necessárias para mínimo de 5.';

CREATE OR REPLACE FUNCTION public.painel_noticia_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.visivel_desde := COALESCE(NEW.visivel_desde, now());
    NEW.visivel_ate := COALESCE(NEW.visivel_ate, NEW.visivel_desde + interval '4 hours');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_painel_noticia_timestamps ON public.painel_noticia;
CREATE TRIGGER trg_painel_noticia_timestamps
  BEFORE INSERT OR UPDATE ON public.painel_noticia
  FOR EACH ROW EXECUTE PROCEDURE public.painel_noticia_set_timestamps();

CREATE OR REPLACE FUNCTION public.upsert_painel_noticia_rss(
  p_item_url text,
  p_titulo text,
  p_resumo text,
  p_published_at timestamptz,
  p_feed_url text,
  p_fonte_host text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.painel_noticia (
    item_url, titulo, resumo, published_at, feed_url, fonte_host, passou_filtro
  )
  VALUES (
    p_item_url, p_titulo, p_resumo, p_published_at, p_feed_url, p_fonte_host, true
  )
  ON CONFLICT (item_url) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    resumo = EXCLUDED.resumo,
    published_at = EXCLUDED.published_at,
    feed_url = EXCLUDED.feed_url,
    fonte_host = EXCLUDED.fonte_host,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_painel_noticia_rss(text, text, text, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_painel_noticia_rss(text, text, text, timestamptz, text, text) TO service_role;

ALTER TABLE public.painel_noticia ENABLE ROW LEVEL SECURITY;

CREATE POLICY painel_noticia_select_anon ON public.painel_noticia
  FOR SELECT TO anon
  USING (passou_filtro = true);

CREATE POLICY painel_noticia_service_all ON public.painel_noticia
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
