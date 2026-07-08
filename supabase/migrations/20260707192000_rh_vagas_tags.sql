-- RH Vagas: tags por vaga; remove campos legados requisitos e escala de trabalho.

BEGIN;

ALTER TABLE public.rh_vagas
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.rh_vagas
  DROP COLUMN IF EXISTS requisitos,
  DROP COLUMN IF EXISTS escala_trabalho;

COMMENT ON COLUMN public.rh_vagas.tags IS 'Tags livres definidas no cadastro da vaga (ex.: remoto, noturno).';

COMMIT;
