-- ID operacional do staff (preenchimento manual; não substitui o UUID interno do prestador).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_id_operacional text;

COMMENT ON COLUMN public.rh_funcionarios.staff_id_operacional IS
  'Identificador de staff preenchido pela operação (Gestão de Staff). Distinto do UUID do registro.';

COMMIT;
