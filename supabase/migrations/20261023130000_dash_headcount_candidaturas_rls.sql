-- Headcount: leitura de candidaturas para aba Vagas (origem + funil).

BEGIN;

DROP POLICY IF EXISTS rh_vaga_candidaturas_select_dash_headcount ON public.rh_vaga_candidaturas;
CREATE POLICY rh_vaga_candidaturas_select_dash_headcount
  ON public.rh_vaga_candidaturas FOR SELECT TO authenticated
  USING (public._dash_headcount_perm('view'));

COMMIT;
