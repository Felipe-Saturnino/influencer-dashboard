-- =============================================================================
-- MIGRAÇÃO: RLS em profiles — Admin pode SELECT (ler) todos os perfis
-- Necessário para: UPDATE ... RETURNING, listagem de usuários, gestão.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- Garantir que a função is_admin existe (caso migration-profiles-rls-admin-update não tenha sido executada)
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Política: admin pode ler qualquer perfil (para gestão de usuários)
DROP POLICY IF EXISTS "Admin podem ler qualquer perfil" ON profiles;
CREATE POLICY "Admin podem ler qualquer perfil" ON profiles
  FOR SELECT
  USING (is_admin());
