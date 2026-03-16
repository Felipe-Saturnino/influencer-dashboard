-- =============================================================================
-- MIGRAÇÃO: live_resultados - DEFAULT timestamps + trigger + UNIQUE live_id
-- Execute no Supabase SQL Editor.
--
-- A) created_at e updated_at com DEFAULT now()
-- A) Trigger para atualizar updated_at em UPDATE
-- C) UNIQUE(live_id) — 1 resultado por live
-- =============================================================================

-- Default para created_at e updated_at
ALTER TABLE live_resultados ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE live_resultados ALTER COLUMN updated_at SET DEFAULT now();

-- Trigger para updated_at em UPDATE
CREATE OR REPLACE FUNCTION live_resultados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_resultados_updated_at ON live_resultados;
CREATE TRIGGER live_resultados_updated_at
  BEFORE UPDATE ON live_resultados
  FOR EACH ROW EXECUTE FUNCTION live_resultados_updated_at();

-- UNIQUE: apenas 1 resultado por live
ALTER TABLE live_resultados DROP CONSTRAINT IF EXISTS live_resultados_live_id_key;
ALTER TABLE live_resultados
ADD CONSTRAINT live_resultados_live_id_key UNIQUE (live_id);

-- =============================================================================
-- NOTA: Se falhar por duplicatas existentes (múltiplos resultados por live):
-- DELETE FROM live_resultados a USING live_resultados b
-- WHERE a.id > b.id AND a.live_id = b.live_id;
-- Depois rode a migração novamente.
-- =============================================================================
