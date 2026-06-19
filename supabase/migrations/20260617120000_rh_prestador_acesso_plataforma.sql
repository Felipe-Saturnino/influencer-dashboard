-- Gestão de Prestadores: auditoria de acesso à plataforma + RPC de consulta

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_granted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS sign_in_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.access_granted_by IS
  'Usuário que criou/liberou o acesso (Gestão de Usuários ou sync RH após salvar prestador).';
COMMENT ON COLUMN public.profiles.access_granted_at IS
  'Data/hora da criação do usuário na plataforma (liberação de acesso).';
COMMENT ON COLUMN public.profiles.first_sign_in_at IS
  'Primeiro login registrado (auth.users.last_sign_in_at).';
COMMENT ON COLUMN public.profiles.sign_in_count IS
  'Quantidade de logins registrados (incremento a cada atualização de last_sign_in_at em auth.users).';

-- Backfill: liberação ≈ criação do profile (contagem de logins só após deploy — ver migration de auditoria Felipe)
UPDATE public.profiles
SET access_granted_at = COALESCE(access_granted_at, created_at)
WHERE access_granted_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_sign_in_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    last_sign_in_at = NEW.last_sign_in_at,
    first_sign_in_at = CASE
      WHEN NEW.last_sign_in_at IS NOT NULL THEN COALESCE(profiles.first_sign_in_at, NEW.last_sign_in_at)
      ELSE profiles.first_sign_in_at
    END,
    sign_in_count = CASE
      WHEN NEW.last_sign_in_at IS NOT NULL
        AND (TG_OP = 'INSERT' OR OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
      THEN COALESCE(profiles.sign_in_count, 0) + 1
      ELSE COALESCE(profiles.sign_in_count, 0)
    END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_last_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_last_sign_in
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_sign_in_stats();

CREATE OR REPLACE FUNCTION public.rh_prestador_acesso_plataforma(p_rh_funcionario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.rh_funcionarios%ROWTYPE;
  p public.profiles%ROWTYPE;
  granter_name text;
  em_spin text;
  em_pessoal text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public._rh_funcionario_perm('view') THEN
    RAISE EXCEPTION 'Sem permissão para consultar prestadores';
  END IF;

  SELECT * INTO f FROM public.rh_funcionarios WHERE id = p_rh_funcionario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prestador não encontrado';
  END IF;

  em_spin := lower(trim(coalesce(f.email_spin, '')));
  em_pessoal := lower(trim(coalesce(f.email, '')));

  SELECT * INTO p
  FROM public.profiles pr
  WHERE (
    (em_spin <> '' AND em_spin LIKE '%@%' AND lower(trim(pr.email)) = em_spin)
    OR (em_pessoal <> '' AND em_pessoal LIKE '%@%' AND lower(trim(pr.email)) = em_pessoal)
  )
  ORDER BY
    CASE
      WHEN em_spin <> '' AND lower(trim(pr.email)) = em_spin THEN 0
      ELSE 1
    END,
    pr.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tem_acesso', false,
      'access_granted_at', null,
      'access_granted_by_label', null,
      'first_sign_in_at', null,
      'last_sign_in_at', null,
      'sign_in_count', null
    );
  END IF;

  IF p.access_granted_by IS NOT NULL THEN
    SELECT coalesce(nullif(trim(gr.name), ''), nullif(trim(gr.email), ''), 'Usuário')
    INTO granter_name
    FROM public.profiles gr
    WHERE gr.id = p.access_granted_by
    LIMIT 1;
  ELSE
    granter_name := NULL;
  END IF;

  RETURN jsonb_build_object(
    'tem_acesso', true,
    'access_granted_at', COALESCE(p.access_granted_at, p.created_at),
    'access_granted_by_label', granter_name,
    'first_sign_in_at', p.first_sign_in_at,
    'last_sign_in_at', p.last_sign_in_at,
    'sign_in_count', p.sign_in_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_prestador_acesso_plataforma(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_prestador_acesso_plataforma(uuid) TO authenticated;

COMMENT ON FUNCTION public.rh_prestador_acesso_plataforma(uuid) IS
  'Gestão de Prestadores — aba Acesso a Plataforma: vínculo profile por e-mail pessoal ou Spin.';

COMMIT;
