-- Horários de turno dos dealers passam a ser configurados por estúdio (Gestão de Estúdios).
-- Colunas em operadoras permanecem como legado até migração de leitura completa.

ALTER TABLE public.estudios_spin
  ADD COLUMN IF NOT EXISTS turno_manha_inicio time NULL,
  ADD COLUMN IF NOT EXISTS turno_tarde_inicio time NULL,
  ADD COLUMN IF NOT EXISTS turno_noite_inicio time NULL;

COMMENT ON COLUMN public.estudios_spin.turno_manha_inicio IS 'Hora de início do turno da manhã (dealers) no estúdio.';
COMMENT ON COLUMN public.estudios_spin.turno_tarde_inicio IS 'Hora de início do turno da tarde (dealers) no estúdio.';
COMMENT ON COLUMN public.estudios_spin.turno_noite_inicio IS 'Hora de início do turno da noite (dealers) no estúdio.';
