-- Home Performance Coach: Informativos e Spin na Rede sem permissão das páginas fonte.
-- Galeria de fotos: políticas existentes de marketing_fotos.

BEGIN;

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_performance_coach ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed_performance_coach ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'performance_coach'
        AND p.role::text = ANY (perfis)
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed_performance_coach ON public.conteudo_informativo IS
  'Home Performance Coach: informativos publicados com perfil performance_coach no array perfis.';

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_performance_coach ON public.spin_na_rede_mencao;

CREATE POLICY spin_na_rede_mencao_select_home_feed_performance_coach ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'performance_coach'
    )
  );

COMMENT ON POLICY spin_na_rede_mencao_select_home_feed_performance_coach ON public.spin_na_rede_mencao IS
  'Home Performance Coach: menções Spin na Rede (leitura na Home sem page perm spin_na_rede).';

COMMIT;
