-- =============================================================================
-- MIGRAÇÃO: RLS em profiles — apenas ADMIN pode atualizar perfis de outros usuários
-- Gestores NÃO podem alterar perfis; apenas admins têm acesso à Gestão de Usuários.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- Garantir que RLS está ativo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: verifica se o usuário logado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Permissão para a função
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Remover política antiga se existir (com gestor)
DROP POLICY IF EXISTS "Admin e gestor podem atualizar qualquer perfil" ON profiles;
DROP POLICY IF EXISTS "Admin podem atualizar qualquer perfil" ON profiles;

-- Política: apenas admin pode atualizar qualquer perfil (incluindo role)
CREATE POLICY "Admin podem atualizar qualquer perfil" ON profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Manter função antiga por compatibilidade (se algo ainda usar)
DROP FUNCTION IF EXISTS public.is_admin_or_gestor();
