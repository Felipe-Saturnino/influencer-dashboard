-- =============================================================================
-- LIMPEZA: sync_logs e tech_logs — "zerar" Status Técnico para nova API
-- Execute no Supabase SQL Editor.
-- Após migrar para CDA_INFLUENCERS_API_KEY, use este script para remover
-- logs antigos (erros de token expirado, etc.) e começar com dados limpos.
-- =============================================================================

-- Remove todos os sync_logs (inclui falhas de token antigo)
DELETE FROM sync_logs;

-- Remove todos os tech_logs (inclui "Token CDA expirado")
DELETE FROM tech_logs;

-- Opcional: conferir que ficou vazio
-- SELECT COUNT(*) FROM sync_logs;
-- SELECT COUNT(*) FROM tech_logs;
