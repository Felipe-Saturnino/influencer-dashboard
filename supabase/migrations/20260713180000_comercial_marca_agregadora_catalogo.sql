-- Pipeline B2B — agregadora livre (nomes de comercial_agregadoras).

BEGIN;

ALTER TABLE public.comercial_marcas
  DROP CONSTRAINT IF EXISTS comercial_marcas_agregadora_check;

COMMENT ON COLUMN public.comercial_marcas.agregadora IS
  'Nome da agregadora (catálogo comercial_agregadoras) — editável no Pipeline B2B; NULL = sem agregadora.';

-- Quem vê Pipeline B2B precisa ler o catálogo de nomes (só SELECT).
DROP POLICY IF EXISTS comercial_agregadoras_select_pipeline_b2b ON public.comercial_agregadoras;
CREATE POLICY comercial_agregadoras_select_pipeline_b2b ON public.comercial_agregadoras
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));

COMMIT;
