-- Data de referência da função (ex.: revisão de contrato / cargo).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS data_funcao date;

COMMENT ON COLUMN public.rh_funcionarios.data_funcao IS 'Data da função/cargo (contexto de contratação; usada na revisão de contrato).';

COMMIT;
