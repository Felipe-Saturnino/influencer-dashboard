-- =============================================================================
-- MIGRAÇÃO: Coluna operadora_slug em influencer_metricas
-- Execute no Supabase SQL Editor.
-- Hoje só temos integração com Casa de Apostas; backfill com 'casa_apostas'.
-- Novas integrações (Blaze, Bet Nacional, etc.) preencherão ao inserir dados da API.
-- =============================================================================

-- 1. Adicionar coluna operadora_slug
ALTER TABLE influencer_metricas
ADD COLUMN IF NOT EXISTS operadora_slug text REFERENCES operadoras(slug);

-- 2. Backfill: preencher 'casa_apostas' em todos os registros existentes
UPDATE influencer_metricas
SET operadora_slug = 'casa_apostas'
WHERE operadora_slug IS NULL;

-- 3. Índice para consultas filtradas por operadora
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_operadora
  ON influencer_metricas (influencer_id, data, operadora_slug);

-- 4. (Opcional) Tornar NOT NULL após backfill — descomente quando confirmação ok
-- ALTER TABLE influencer_metricas ALTER COLUMN operadora_slug SET NOT NULL;

-- =============================================================================
-- PRÓXIMOS PASSOS (executar em migration separada ou junto):
-- - Atualizar view v_influencer_metricas_mensal (incluir operadora_slug no GROUP BY)
-- - Atualizar RPC get_metricas_financeiro (adicionar p_operadora_slug)
-- Ver: docs/dashboard-financeiro-operadora.sql
-- =============================================================================
