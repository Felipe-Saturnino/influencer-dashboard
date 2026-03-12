-- =============================================================================
-- MIGRAÇÃO: Lives e Pagamentos por Operadora
-- Execute no Supabase SQL Editor (após renomear produto → operadora_slug em lives)
--
-- IMPORTANTE: Verifique o slug da operadora "Casa de Apostas" antes de executar:
--   SELECT slug, nome FROM operadoras;
-- Se o slug for diferente (ex: casa-de-apostas), ajuste nas linhas abaixo.
-- =============================================================================

-- 1. Backfill lives.operadora_slug (valores nulos → parceria histórica: Casa de Apostas)
UPDATE lives
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

-- 2. pagamentos: adicionar operadora_slug
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS operadora_slug text REFERENCES operadoras(slug);

-- Backfill pagamentos existentes (usar slug da primeira operadora do influencer)
UPDATE pagamentos p
SET operadora_slug = (
  SELECT io.operadora_slug
  FROM influencer_operadoras io
  WHERE io.influencer_id = p.influencer_id AND io.ativo = true
  LIMIT 1
)
WHERE p.operadora_slug IS NULL;

-- Para quaisquer órfãos, use Casa de Apostas (legado)
UPDATE pagamentos SET operadora_slug = 'casa_apostas' WHERE operadora_slug IS NULL;

-- Remover constraint única antiga (ciclo_id, influencer_id) se existir
-- Nomes comuns: pagamentos_ciclo_id_influencer_id_key
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_ciclo_id_influencer_id_key;

-- Criar constraint única (ciclo_id, influencer_id, operadora_slug)
ALTER TABLE pagamentos
ADD CONSTRAINT pagamentos_ciclo_influencer_operadora_key
UNIQUE (ciclo_id, influencer_id, operadora_slug);

-- Tornar operadora_slug obrigatório para novos registros
ALTER TABLE pagamentos ALTER COLUMN operadora_slug SET NOT NULL;

-- 3. pagamentos_agentes: adicionar operadora_slug
ALTER TABLE pagamentos_agentes ADD COLUMN IF NOT EXISTS operadora_slug text REFERENCES operadoras(slug);

-- Backfill pagamentos_agentes existentes
UPDATE pagamentos_agentes SET operadora_slug = 'casa_apostas' WHERE operadora_slug IS NULL;

ALTER TABLE pagamentos_agentes ALTER COLUMN operadora_slug SET NOT NULL;

-- =============================================================================
-- NOTA: Se houver erro em DROP CONSTRAINT, liste as constraints com:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pagamentos'::regclass;
-- e ajuste o nome na linha DROP CONSTRAINT.
-- =============================================================================
