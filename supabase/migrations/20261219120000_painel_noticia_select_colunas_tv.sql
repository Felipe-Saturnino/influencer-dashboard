-- Painel de Notícias TV: anon/authenticated só leem colunas de exibição
-- (não item_url / feed_url / fonte_host). RLS de linha permanece.

BEGIN;

REVOKE SELECT ON public.painel_noticia FROM anon, authenticated;

-- passou_filtro entra no GRANT: o cliente filtra `passou_filtro=eq.true` (PostgREST exige SELECT).
GRANT SELECT (id, titulo, resumo, visivel_desde, visivel_ate, passou_filtro)
  ON public.painel_noticia
  TO anon, authenticated;

COMMENT ON TABLE public.painel_noticia IS
  'Notícias RSS para painel TV (/painel-noticias). SELECT anon/authenticated: colunas de exibição + passou_filtro. Sem item_url/feed_url. Purge após 4h fora do mínimo de 5. TV até 15.';

COMMIT;
