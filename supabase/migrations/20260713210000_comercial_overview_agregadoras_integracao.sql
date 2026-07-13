-- Overview Comercial: leitura de Agregadoras e Integrações.

BEGIN;

DROP POLICY IF EXISTS comercial_agregadoras_select_overview ON public.comercial_agregadoras;
CREATE POLICY comercial_agregadoras_select_overview ON public.comercial_agregadoras
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));

DROP POLICY IF EXISTS comercial_agregadora_hist_select_overview ON public.comercial_agregadora_historico;
CREATE POLICY comercial_agregadora_hist_select_overview ON public.comercial_agregadora_historico
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));

DROP POLICY IF EXISTS comercial_integracoes_select_overview ON public.comercial_integracoes;
CREATE POLICY comercial_integracoes_select_overview ON public.comercial_integracoes
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));

DROP POLICY IF EXISTS comercial_integracao_hist_select_overview ON public.comercial_integracao_historico;
CREATE POLICY comercial_integracao_hist_select_overview ON public.comercial_integracao_historico
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));

COMMIT;
