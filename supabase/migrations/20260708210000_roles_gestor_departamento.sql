-- Gestores de departamento: perfis gerenciais dedicados, atribuição manual, só role_permissions (sem gestor_tipo).

BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'customer_service',
    'game_presenter',
    'shuffler',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ));

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'customer_service',
    'game_presenter',
    'shuffler',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ));

-- Permissões iniciais: Não em todas as páginas até liberação explícita na aba Permissões.
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, g.page_key, 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh'
  ]::text[]) AS role
) r
CROSS JOIN (
  SELECT DISTINCT page_key FROM public.role_permissions WHERE role = 'gestor'
) g
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'simulador_login', 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public._gestor_departamento_roles()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh'
  ]::text[];
$$;

COMMENT ON FUNCTION public._gestor_departamento_roles() IS
  'Gestores de departamento: perfis gerenciais sem gestor_tipo — só role_permissions.';

CREATE OR REPLACE FUNCTION public._gestor_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_rp_ok boolean;
  v_role text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role::text INTO v_role
  FROM public.profiles p
  WHERE p.id = uid;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role <> 'gestor' AND NOT (v_role = ANY (public._gestor_departamento_roles())) THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = uid
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  )
  INTO v_rp_ok;

  IF NOT coalesce(v_rp_ok, false) THEN
    RETURN false;
  END IF;

  -- Gestores de departamento: só role_permissions (sem interseção gestor_tipo_pages).
  IF v_role = ANY (public._gestor_departamento_roles()) THEN
    RETURN true;
  END IF;

  IF p_page_key IN ('home', 'configuracoes', 'ajuda') THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_scopes s
    INNER JOIN public.gestor_tipo_pages gtp
      ON gtp.gestor_tipo_slug = s.scope_ref AND gtp.page_key = p_page_key
    WHERE s.user_id = uid AND s.scope_type = 'gestor_tipo'
  );
END;
$$;

COMMENT ON FUNCTION public._gestor_page_perm(text, text) IS
  'Gestor: role_permissions ∩ gestor_tipo_pages. Gestores de departamento: só role_permissions.';

CREATE OR REPLACE FUNCTION public._role_sem_escopo_app()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role IN (
          'executivo',
          'investidor',
          'prestador',
          'shift_leader',
          'service_manager',
          'customer_service',
          'game_presenter',
          'shuffler',
          'tech_ops',
          'figurino',
          'comunicacao',
          'performance_coach',
          'rh'
        )
        OR p.role::text = ANY (public._gestor_departamento_roles())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public._role_permissions_sem_escopo_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND (
            p.role IN ('executivo', 'investidor')
            OR p.role::text = ANY (public._gestor_departamento_roles())
          )
          AND rp.page_key = p_page_key
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
      OR public._staff_spin_page_perm(p_page_key, p_need)
    );
$$;

COMMIT;
