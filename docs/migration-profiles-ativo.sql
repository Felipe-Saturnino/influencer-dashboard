-- =============================================================================
-- MIGRAÇÃO: Coluna ativo em profiles (desativação de usuário)
-- Execute no Supabase SQL Editor.
-- Permite desativar usuários sem excluir dados. ativo=false bloqueia login.
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

UPDATE profiles SET ativo = true WHERE ativo IS NULL;
