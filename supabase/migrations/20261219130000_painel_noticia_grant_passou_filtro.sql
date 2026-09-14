-- Hotfix Ciclo 5 B3: o filtro PostgREST `.eq("passou_filtro", true)` exige
-- SELECT na coluna. Sem isso, anon/authenticated recebem permission denied e a TV fica vazia.
-- Continua sem expor item_url / feed_url / fonte_host.

BEGIN;

GRANT SELECT (id, titulo, resumo, visivel_desde, visivel_ate, passou_filtro)
  ON public.painel_noticia
  TO anon, authenticated;

COMMENT ON TABLE public.painel_noticia IS
  'Notícias RSS para painel TV (/painel-noticias). SELECT anon/authenticated: colunas de exibição + passou_filtro (filtro RLS/PostgREST). Sem item_url/feed_url. Purge após 4h fora do mínimo de 5. TV até 15.';

COMMIT;
