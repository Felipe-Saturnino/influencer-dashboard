-- Home Operador: leitura de Informativos e Spin na Rede sem permissão das páginas fonte.
-- Aplicar manualmente no SQL do Supabase se esta migration não rodar via CLI.

BEGIN;

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'operador'
        AND p.role::text = ANY (perfis)
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed_operador ON public.conteudo_informativo IS
  'Home Operador: informativos publicados com perfil operador no array perfis.';

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed_operador ON public.spin_na_rede_mencao;

CREATE POLICY spin_na_rede_mencao_select_home_feed_operador ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'operador'
    )
  );

COMMENT ON POLICY spin_na_rede_mencao_select_home_feed_operador ON public.spin_na_rede_mencao IS
  'Home Operador: menções Spin na Rede (leitura na Home sem page perm spin_na_rede).';

COMMIT;
