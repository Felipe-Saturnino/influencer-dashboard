-- ─── Adiciona tipo e jogos em roteiro_mesa_sugestoes ───────────────────────────
-- tipo: script | orientacao | alerta
-- jogos: array de text (todos | blackjack | roleta | baccarat)

ALTER TABLE roteiro_mesa_sugestoes
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'script',
  ADD COLUMN IF NOT EXISTS jogos text[] DEFAULT ARRAY['todos'];

-- Garante default em linhas existentes (caso migração parcial)
UPDATE roteiro_mesa_sugestoes
SET tipo = COALESCE(tipo, 'script'),
    jogos = COALESCE(jogos, ARRAY['todos'])
WHERE tipo IS NULL OR jogos IS NULL;

-- Constraints
ALTER TABLE roteiro_mesa_sugestoes
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN jogos SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roteiro_mesa_sugestoes_tipo_check') THEN
    ALTER TABLE roteiro_mesa_sugestoes ADD CONSTRAINT roteiro_mesa_sugestoes_tipo_check CHECK (tipo IN ('script', 'orientacao', 'alerta'));
  END IF;
END $$;

COMMENT ON COLUMN roteiro_mesa_sugestoes.tipo IS 'Tipo da sugestão: script, orientacao ou alerta';
COMMENT ON COLUMN roteiro_mesa_sugestoes.jogos IS 'Jogos aplicáveis: todos, blackjack, roleta, baccarat (array)';
