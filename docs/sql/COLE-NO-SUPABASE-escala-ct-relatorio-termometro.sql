-- Cole no Supabase SQL Editor se a migration ainda não estiver aplicada.
-- Espelha: supabase/migrations/20261214120000_escala_ct_relatorio_termometro.sql

ALTER TABLE public.escala_ct_relatorio_turno
  ADD COLUMN IF NOT EXISTS termometro smallint;

ALTER TABLE public.escala_ct_relatorio_turno
  DROP CONSTRAINT IF EXISTS escala_ct_relatorio_termometro_chk;

ALTER TABLE public.escala_ct_relatorio_turno
  ADD CONSTRAINT escala_ct_relatorio_termometro_chk CHECK (
    termometro IS NULL OR (termometro >= 0 AND termometro <= 5)
  );

COMMENT ON COLUMN public.escala_ct_relatorio_turno.termometro IS
  'Complexidade/qualidade do turno: 0 = horrível · 5 = maravilhoso. NULL = não informado.';
