-- =============================================================================
-- MIGRAÇÃO: scout_influencer - ON DELETE SET NULL para created_by
-- Execute no Supabase SQL Editor.
--
-- A) created_by: permite exclusão do usuário criador sem quebrar o registro
-- =============================================================================

-- Remover a FK atual (nome pode variar - ajuste se necessário)
ALTER TABLE scout_influencer DROP CONSTRAINT IF EXISTS scout_influencer_created_by_fkey;

-- Recriar com ON DELETE SET NULL
ALTER TABLE scout_influencer
ADD CONSTRAINT scout_influencer_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================================
-- NOTA: Se o nome da constraint for diferente, descubra com:
-- SELECT conname FROM pg_constraint 
-- WHERE conrelid = 'scout_influencer'::regclass AND contype = 'f'
--   AND pg_get_constraintdef(oid) LIKE '%created_by%';
-- =============================================================================
