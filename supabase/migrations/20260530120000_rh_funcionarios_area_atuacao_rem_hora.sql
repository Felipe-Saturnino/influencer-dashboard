-- Área de atuação (Estúdio / Escritório) e remuneração por hora (Estúdio).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS area_atuacao text NOT NULL DEFAULT 'escritorio'
    CHECK (area_atuacao IN ('estudio', 'escritorio'));

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS remuneracao_hora_centavos bigint;

COMMENT ON COLUMN public.rh_funcionarios.area_atuacao IS
  'escritorio: remuneração mensal (salario). estudio: remuneracao_hora_centavos + escala + staff_turno; salario pode ser 0.';

COMMENT ON COLUMN public.rh_funcionarios.remuneracao_hora_centavos IS
  'Centavos por hora quando area_atuacao = estudio; nulo no Escritório.';

COMMIT;
