-- =============================================================================
-- MIGRAÇÃO: influencer_metricas - UNIQUE para UPSERT na integração
-- Execute no Supabase SQL Editor (após migration-influencer-metricas-operadora).
--
-- Permite UPSERT em (influencer_id, data, operadora_slug) para evitar duplicatas
-- quando a integração roda múltiplas vezes no mesmo dia.
-- =============================================================================

-- Garantir backfill antes: operadora_slug NULL → duplicatas possíveis no UNIQUE
UPDATE influencer_metricas SET operadora_slug = 'casa_apostas' WHERE operadora_slug IS NULL;

ALTER TABLE influencer_metricas DROP CONSTRAINT IF EXISTS influencer_metricas_influencer_data_operadora_key;

ALTER TABLE influencer_metricas
ADD CONSTRAINT influencer_metricas_influencer_data_operadora_key
UNIQUE (influencer_id, data, operadora_slug);

-- NOTA: Se falhar por duplicatas existentes, deduplicar antes:
-- DELETE FROM influencer_metricas a USING influencer_metricas b
-- WHERE a.id > b.id AND a.influencer_id = b.influencer_id
--   AND a.data = b.data AND COALESCE(a.operadora_slug, 'casa_apostas') = COALESCE(b.operadora_slug, 'casa_apostas');
