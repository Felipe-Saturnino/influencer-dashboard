-- Painel de Notícias: leitura pública também para sessão autenticada
-- (TV no mesmo browser de quem já entrou na plataforma).

BEGIN;

DROP POLICY IF EXISTS painel_noticia_select_anon ON public.painel_noticia;

CREATE POLICY painel_noticia_select_publico ON public.painel_noticia
  FOR SELECT TO anon, authenticated
  USING (passou_filtro = true);

COMMENT ON TABLE public.painel_noticia IS
  'Notícias RSS para painel TV (/painel-noticias). Leitura anon + authenticated. Purge físico após janela de 4h quando não necessárias para mínimo de 5. TV exibe até 15.';

COMMIT;
