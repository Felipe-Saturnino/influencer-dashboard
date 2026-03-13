-- =============================================================================
-- MIGRAÇÃO: profiles - created_at DEFAULT + CHECK role
-- Execute no Supabase SQL Editor.
--
-- C) created_at com DEFAULT now()
-- A) CHECK constraint em role (valores válidos)
-- =============================================================================

-- Default para created_at em novos registros
ALTER TABLE profiles
ALTER COLUMN created_at SET DEFAULT now();

-- Remover constraint antiga se existir
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Garantir que role só aceita valores válidos do app
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'gestor', 'executivo', 'influencer', 'operador', 'agencia'));
