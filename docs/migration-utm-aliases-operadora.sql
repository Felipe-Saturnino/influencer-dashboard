-- =============================================================================
-- MIGRAÇÃO: utm_aliases — operadora_slug
-- Execute no Supabase SQL Editor.
-- Para remover ggr: execute docs/migration-utm-aliases-drop-ggr.sql
-- após refatorar a integração para não enviar ggr.
-- =============================================================================

-- 1. Adicionar coluna operadora_slug
ALTER TABLE utm_aliases
ADD COLUMN IF NOT EXISTS operadora_slug text REFERENCES operadoras(slug);

-- 2. Backfill: preencher 'casa_apostas' em todos os registros existentes
UPDATE utm_aliases
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

-- 3. Índices para consultas filtradas por operadora
CREATE INDEX IF NOT EXISTS idx_utm_aliases_operadora
  ON utm_aliases (operadora_slug);

CREATE INDEX IF NOT EXISTS idx_utm_aliases_status_operadora
  ON utm_aliases (status, operadora_slug);
