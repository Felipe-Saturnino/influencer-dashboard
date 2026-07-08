-- RH Vagas: remuneracao_centavos → repasse_inicial_centavos (valor em centavos, R$).
-- Idempotente: renomeia se legado existir; ignora se já renomeado; cria coluna se ausente.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_vagas'
      AND column_name = 'remuneracao_centavos'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_vagas'
      AND column_name = 'repasse_inicial_centavos'
  ) THEN
    ALTER TABLE public.rh_vagas
      RENAME COLUMN remuneracao_centavos TO repasse_inicial_centavos;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rh_vagas'
      AND column_name = 'repasse_inicial_centavos'
  ) THEN
    ALTER TABLE public.rh_vagas
      ADD COLUMN repasse_inicial_centavos bigint NOT NULL DEFAULT 0;
  END IF;
END $$;

COMMENT ON COLUMN public.rh_vagas.repasse_inicial_centavos IS
  'Repasse inicial da vaga em centavos (ex.: 150000 = R$ 1.500,00). Obrigatório no cadastro novo.';

COMMIT;
