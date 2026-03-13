-- =============================================================================
-- MIGRAÇÃO: influencer_perfil - created_at DEFAULT + CHECK status
-- Execute no Supabase SQL Editor.
--
-- D) created_at com DEFAULT now()
-- B) CHECK constraint em status (valores válidos do app)
-- =============================================================================

-- Default para created_at em novos registros
ALTER TABLE influencer_perfil
ALTER COLUMN created_at SET DEFAULT now();

-- Remover constraint antiga se existir
ALTER TABLE influencer_perfil DROP CONSTRAINT IF EXISTS influencer_perfil_status_check;

-- Garantir que status só aceita valores válidos
ALTER TABLE influencer_perfil
ADD CONSTRAINT influencer_perfil_status_check
CHECK (status IS NULL OR status IN ('ativo', 'inativo', 'cancelado'));
