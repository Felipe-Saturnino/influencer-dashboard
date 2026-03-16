-- =============================================================================
-- MIGRAÇÃO: Corrigir trigger de criação de usuário no Auth
--
-- Erro "Database error creating user" ocorre quando o trigger on_auth_user_created
-- tenta inserir em profiles com colunas ou valores incompatíveis.
--
-- Esta migration substitui o trigger para usar o schema correto: id, name, email, role
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- 1. Remover trigger antigo (se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Criar função que insere em profiles com o schema correto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, ativo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'influencer'),
    true
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile já existe (ex.: criado manualmente ou por Edge Function)
    RETURN new;
END;
$$;

-- 3. Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
