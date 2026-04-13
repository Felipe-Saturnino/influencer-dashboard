-- Ajuste semântico: o registrationDate da PLS é a primeira vez que o jogador jogou nas mesas Spin,
-- não o cadastro na operadora de apostas. Cadastro na Bet passa a coluna manual data_cadastro_bet.

ALTER TABLE public.pls_jogador_dados
  ADD COLUMN IF NOT EXISTS primeiro_jogo_spin timestamptz,
  ADD COLUMN IF NOT EXISTS data_cadastro_bet timestamptz;

COMMENT ON COLUMN public.pls_jogador_dados.primeiro_jogo_spin IS
  'Primeira vez nas mesas Spin (UTC). Preenchido pelo sync a partir de registrationDate do JSON PLS.';
COMMENT ON COLUMN public.pls_jogador_dados.data_cadastro_bet IS
  'Data de cadastro na casa de apostas (UTC). Preenchimento manual; o sync não altera esta coluna.';

-- Migra registration_date_utc → primeiro_jogo_spin só se a coluna antiga ainda existir
-- (evita erro se a migration falhou a meio ou a coluna já foi removida à mão).
DO $mig$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pls_jogador_dados'
      AND column_name = 'registration_date_utc'
  ) THEN
    UPDATE public.pls_jogador_dados
    SET primeiro_jogo_spin = registration_date_utc
    WHERE registration_date_utc IS NOT NULL
      AND primeiro_jogo_spin IS NULL;
    ALTER TABLE public.pls_jogador_dados DROP COLUMN registration_date_utc;
  END IF;
END $mig$;
