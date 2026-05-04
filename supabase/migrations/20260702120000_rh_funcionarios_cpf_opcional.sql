-- CPF opcional para cadastro mínimo de novo prestador (completar depois na edição).
-- Vários registos podem ter cpf NULL; unicidade só quando preenchido.

BEGIN;

DROP INDEX IF EXISTS public.rh_funcionarios_cpf_unique;

ALTER TABLE public.rh_funcionarios DROP CONSTRAINT IF EXISTS rh_funcionarios_cpf_digits;

ALTER TABLE public.rh_funcionarios ALTER COLUMN cpf DROP NOT NULL;

ALTER TABLE public.rh_funcionarios ADD CONSTRAINT rh_funcionarios_cpf_digits CHECK (
  cpf IS NULL OR (char_length(cpf) = 11 AND cpf ~ '^[0-9]+$')
);

CREATE UNIQUE INDEX rh_funcionarios_cpf_unique ON public.rh_funcionarios (cpf) WHERE cpf IS NOT NULL;

COMMENT ON COLUMN public.rh_funcionarios.cpf IS 'CPF só dígitos; NULL permitido até completar cadastro (novo prestador mínimo).';

COMMIT;
