-- =============================================================================
-- MIGRAÇÃO: Permitir que usuários autenticados leiam perfis (id, name)
-- 
-- Necessário para: Agenda, Feedback, Resultados e Influencers exibirem
-- o nome do influencer nas lives e listagens. Gestor e demais roles
-- precisam ler profiles para o join retornar influencer_name.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- Política: qualquer usuário autenticado pode ler id e name de perfis
-- (Usuário já pode ler próprio perfil; Admin já pode ler todos)
DROP POLICY IF EXISTS "Allow authenticated read profiles for display" ON profiles;
CREATE POLICY "Allow authenticated read profiles for display" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
