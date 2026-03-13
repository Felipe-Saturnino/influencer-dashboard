-- =============================================================================
-- MIGRAÇÃO: scout_anotacoes - DEFAULT created_at + ON DELETE SET NULL usuario_id
-- Execute no Supabase SQL Editor.
--
-- D) Garantir created_at com DEFAULT now()
-- B) usuario_id ON DELETE SET NULL (permite exclusão de usuário sem quebrar anotações)
-- =============================================================================

-- 1. Default para created_at em novos registros
ALTER TABLE scout_anotacoes
ALTER COLUMN created_at SET DEFAULT now();

-- 2. Ajustar FK usuario_id para ON DELETE SET NULL
-- Primeiro remove a constraint atual (nome pode variar - ajuste se necessário)
ALTER TABLE scout_anotacoes DROP CONSTRAINT IF EXISTS scout_anotacoes_usuario_id_fkey;

-- Recria com ON DELETE SET NULL
ALTER TABLE scout_anotacoes
ADD CONSTRAINT scout_anotacoes_usuario_id_fkey
FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================================
-- NOTA: Se o nome da constraint for diferente, descubra com:
-- SELECT conname FROM pg_constraint 
-- WHERE conrelid = 'scout_anotacoes'::regclass AND contype = 'f';
-- =============================================================================
