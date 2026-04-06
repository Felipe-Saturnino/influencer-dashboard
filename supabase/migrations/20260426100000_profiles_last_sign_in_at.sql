-- Último login na Gestão de Usuários: coluna em profiles + sincronia com auth.users

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Cópia de auth.users.last_sign_in_at para exibição no admin (atualizado por trigger).';

CREATE OR REPLACE FUNCTION public.sync_profile_last_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = NEW.last_sign_in_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_last_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_last_sign_in
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_last_sign_in();

-- Backfill existente
UPDATE public.profiles p
SET last_sign_in_at = u.last_sign_in_at
FROM auth.users u
WHERE u.id = p.id
  AND u.last_sign_in_at IS NOT NULL;
