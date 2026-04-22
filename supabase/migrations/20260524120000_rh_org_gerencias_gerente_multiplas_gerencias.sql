-- Permite o mesmo prestador (rh_funcionarios) como líder imediato de mais de uma gerência ativa.
-- Regra anterior: índice único parcial rh_org_gerencias_gerente_ativo_unique (20260503120000).

BEGIN;

DROP INDEX IF EXISTS public.rh_org_gerencias_gerente_ativo_unique;

COMMENT ON TABLE public.rh_org_gerencias IS 'RH organograma — nível 2 (Gerência). O mesmo prestador pode ser gerente de várias gerências ativas.';

COMMIT;
