-- Home Prestador: Informativos e Spin na Rede sem permissão das páginas fonte.
-- Fotos da galeria usam RLS existente de marketing_fotos (_galeria_fotos_perm / vínculo RH).

BEGIN;

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_prestador ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed_prestador ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'prestador'
        AND p.role::text = ANY (perfis)
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed_prestador ON public.conteudo_informativo IS
  'Home Prestador: informativos publicados com perfil prestador no array perfis.';

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_prestador ON public.spin_na_rede_mencao;

CREATE POLICY spin_na_rede_mencao_select_home_feed_prestador ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'prestador'
    )
  );

COMMENT ON POLICY spin_na_rede_mencao_select_home_feed_prestador ON public.spin_na_rede_mencao IS
  'Home Prestador: menções Spin na Rede (leitura na Home sem page perm spin_na_rede).';

COMMIT;
