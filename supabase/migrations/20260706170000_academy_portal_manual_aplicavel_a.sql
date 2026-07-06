-- Portal da Academy — Manuais: público aplicável (times Game Floor / Operation Management)

BEGIN;

ALTER TABLE public.academy_portal_manual
  ADD COLUMN IF NOT EXISTS aplicavel_a text[];

COMMENT ON COLUMN public.academy_portal_manual.aplicavel_a IS
  'Times aplicáveis quando requires_acknowledgment = true (nomes do organograma — Game Floor / Operation Management).';

COMMIT;
