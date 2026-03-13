-- MIGRAÇÃO: Coluna must_change_password em profiles
-- Objetivo: Forçar troca de senha no primeiro login (novos usuários)
--
-- Executar no SQL Editor do Supabase

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Novos usuários terão must_change_password=true via insert na aplicação
-- Usuários existentes permanecem com false (não precisam trocar)

COMMENT ON COLUMN profiles.must_change_password IS 'Se true, usuário deve trocar a senha no próximo login';
