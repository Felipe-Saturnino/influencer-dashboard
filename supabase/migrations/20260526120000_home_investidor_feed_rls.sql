-- Home Investidor (e perfis _role_sem_escopo_app): leitura de feed sem permissão das páginas
-- Informativos, Spin na Rede, Streamers (métricas/lives).
-- Aplicar manualmente no SQL do Supabase se esta migration não rodar via CLI.

BEGIN;

-- ─── Informativos: publicados para o perfil do usuário (ex.: investidor em perfis[]) ───

DROP POLICY IF EXISTS conteudo_informativo_select_home_feed ON public.conteudo_informativo;

CREATE POLICY conteudo_informativo_select_home_feed ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    status = 'publicado'
    AND public._role_sem_escopo_app()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text = ANY (perfis)
    )
  );

COMMENT ON POLICY conteudo_informativo_select_home_feed ON public.conteudo_informativo IS
  'Home: informativos publicados cujo array perfis contém o role do usuário (Investidor/Executivo/staff sem escopo).';

-- ─── Spin na Rede: menções aprovadas pelo filtro editorial ───────────────────────

DROP POLICY IF EXISTS spin_na_rede_mencao_select_home_feed ON public.spin_na_rede_mencao;

CREATE POLICY spin_na_rede_mencao_select_home_feed ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (
    passou_filtro = true
    AND public._role_sem_escopo_app()
  );

COMMENT ON POLICY spin_na_rede_mencao_select_home_feed ON public.spin_na_rede_mencao IS
  'Home: menções Spin na Rede para perfis sem escopo (Investidor, Executivo, staff Spin).';

-- ─── Streamers / aquisição na Home: dados agregados globais ─────────────────────

DROP POLICY IF EXISTS influencer_metricas_select_home_sem_escopo ON public.influencer_metricas;

CREATE POLICY influencer_metricas_select_home_sem_escopo ON public.influencer_metricas
  FOR SELECT TO authenticated
  USING (public._role_sem_escopo_app());

DROP POLICY IF EXISTS lives_select_home_sem_escopo ON public.lives;

CREATE POLICY lives_select_home_sem_escopo ON public.lives
  FOR SELECT TO authenticated
  USING (public._role_sem_escopo_app());

DROP POLICY IF EXISTS live_resultados_select_home_sem_escopo ON public.live_resultados;

CREATE POLICY live_resultados_select_home_sem_escopo ON public.live_resultados
  FOR SELECT TO authenticated
  USING (public._role_sem_escopo_app());

COMMIT;
