-- Termômetro do Turno (0–5) no Relatório de Turno do Controle de Turno.
-- NULL = ainda não informado (rascunho / legado).

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
