-- Performance Hub: Gerenciamento passa a exigir Criar = Sim na UI.
-- INSERT/UPDATE de avaliações (e histórico) devem aceitar create OU edit.

BEGIN;

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_insert ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_insert ON public.academy_performance_hub_avaliacao
  FOR INSERT TO authenticated
  WITH CHECK (
    public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
  );

DROP POLICY IF EXISTS academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao;
CREATE POLICY academy_performance_hub_avaliacao_update ON public.academy_performance_hub_avaliacao
  FOR UPDATE TO authenticated
  USING (
    public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
  )
  WITH CHECK (
    public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
  );

DROP POLICY IF EXISTS academy_ph_avaliacao_historico_insert ON public.academy_performance_hub_avaliacao_historico;
CREATE POLICY academy_ph_avaliacao_historico_insert
  ON public.academy_performance_hub_avaliacao_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    public._academy_performance_hub_perm('view')
    OR public._academy_performance_hub_perm('create')
    OR public._academy_performance_hub_perm('edit')
  );

COMMIT;
