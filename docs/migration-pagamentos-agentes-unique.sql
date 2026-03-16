-- =============================================================================
-- MIGRAÇÃO: pagamentos_agentes - backfill operadora_slug + UNIQUE por ciclo/operadora
-- Execute no Supabase SQL Editor.
-- 
-- B) Backfill operadora_slug = casa_apostas para registros sem valor
-- D) Constraint: 1 agente por ciclo por operadora
-- =============================================================================

-- Backfill: valor padrão "Casa de Apostas" para operadora_slug nulo
UPDATE pagamentos_agentes
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

-- Tornar operadora_slug obrigatório (se coluna ainda aceitar NULL)
ALTER TABLE pagamentos_agentes ALTER COLUMN operadora_slug SET NOT NULL;

-- Remover constraint antiga se existir (ajuste o nome se necessário)
ALTER TABLE pagamentos_agentes DROP CONSTRAINT IF EXISTS pagamentos_agentes_ciclo_operadora_key;

-- Constraint: apenas 1 agente por ciclo por operadora
ALTER TABLE pagamentos_agentes
ADD CONSTRAINT pagamentos_agentes_ciclo_operadora_key
UNIQUE (ciclo_id, operadora_slug);

-- NOTA: Se falhar por duplicatas existentes, deduplicar antes:
-- DELETE FROM pagamentos_agentes a USING pagamentos_agentes b
-- WHERE a.id < b.id AND a.ciclo_id = b.ciclo_id AND a.operadora_slug = b.operadora_slug;
