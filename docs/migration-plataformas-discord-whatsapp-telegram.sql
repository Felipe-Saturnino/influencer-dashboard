-- =============================================================================
-- MIGRAÇÃO: Novas plataformas Discord, WhatsApp e Telegram
-- Execute no SQL Editor do Supabase
--
-- Adiciona colunas de link e views para as novas plataformas em:
--   - scout_influencer
--   - influencer_perfil
-- =============================================================================

-- 1. scout_influencer: novas colunas de link e views
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS link_discord TEXT;
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS link_whatsapp TEXT;
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS link_telegram TEXT;
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS views_discord INTEGER;
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS views_whatsapp INTEGER;
ALTER TABLE scout_influencer ADD COLUMN IF NOT EXISTS views_telegram INTEGER;

-- 2. influencer_perfil: novas colunas de link
ALTER TABLE influencer_perfil ADD COLUMN IF NOT EXISTS link_discord TEXT;
ALTER TABLE influencer_perfil ADD COLUMN IF NOT EXISTS link_whatsapp TEXT;
ALTER TABLE influencer_perfil ADD COLUMN IF NOT EXISTS link_telegram TEXT;

-- Nota: A tabela lives usa a coluna plataforma como TEXT livre (sem CHECK),
-- então já aceita "Discord", "WhatsApp" e "Telegram" sem alteração.
