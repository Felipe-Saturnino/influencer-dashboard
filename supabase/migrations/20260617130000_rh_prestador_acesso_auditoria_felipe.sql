-- Auditoria de acesso: legado → Felipe Saturnino; contagem de logins a partir do deploy

BEGIN;

CREATE OR REPLACE FUNCTION public._profiles_auditoria_felipe_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE lower(trim(name)) = lower('Felipe Saturnino')
  ORDER BY created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._profiles_auditoria_felipe_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._profiles_auditoria_felipe_id() TO authenticated;

COMMENT ON FUNCTION public._profiles_auditoria_felipe_id() IS
  'Profile id de Felipe Saturnino — auditoria legada e criação manual em Gestão de Usuários.';

DO $$
DECLARE
  v_felipe uuid;
BEGIN
  v_felipe := public._profiles_auditoria_felipe_id();
  IF v_felipe IS NOT NULL THEN
    UPDATE public.profiles
    SET access_granted_by = v_felipe
    WHERE access_granted_by IS NULL
      AND id <> v_felipe;
  END IF;
END $$;

-- Primeiro acesso e quantidade: zerar histórico; trigger passa a contar só logins após este deploy
UPDATE public.profiles
SET
  sign_in_count = 0,
  first_sign_in_at = NULL;

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

  granter_name := coalesce(nullif(trim(granter_name), ''), 'Felipe Saturnino');

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

COMMIT;
