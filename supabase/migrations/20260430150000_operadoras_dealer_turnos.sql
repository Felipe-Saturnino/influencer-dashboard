-- Horários de início de turno dos dealers por operadora (Gestão de Operadoras → aba Operações).
ALTER TABLE public.operadoras
  ADD COLUMN IF NOT EXISTS turno_manha_inicio time NULL,
  ADD COLUMN IF NOT EXISTS turno_tarde_inicio time NULL,
  ADD COLUMN IF NOT EXISTS turno_noite_inicio time NULL;

COMMENT ON COLUMN public.operadoras.turno_manha_inicio IS 'Hora de início do turno da manhã (dealers), fuso operacional da operadora.';
COMMENT ON COLUMN public.operadoras.turno_tarde_inicio IS 'Hora de início do turno da tarde (dealers).';
COMMENT ON COLUMN public.operadoras.turno_noite_inicio IS 'Hora de início do turno da noite (dealers).';
