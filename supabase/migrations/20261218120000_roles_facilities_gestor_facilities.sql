-- Perfis Facilities (staff) e Gestor de Facilities (gestor de departamento).
-- Facilities: sync RH da gerência Facilities → role facilities (em vez de Prestador + prestador_tipo).
-- Seed inicial: Não em todas as páginas até liberação na aba Permissões.

BEGIN;

-- ─── Constraints profiles / role_permissions ─────────────────────────────────

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_tech_ops',
    'gestor_academy',
    'gestor_rh',
    'gestor_facilities',
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
    'rh',
    'facilities'
  ));

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'admin',
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_tech_ops',
    'gestor_academy',
    'gestor_rh',
    'gestor_facilities',
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
    'rh',
    'facilities'
  ));

-- ─── Seed role_permissions (tudo Não) ────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'gestor_facilities',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'gestor_operacoes'
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'gestor_facilities',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'executivo'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = 'gestor_facilities' AND rp.page_key = role_permissions.page_key
  )
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'facilities',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'figurino'
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'facilities',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'executivo'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = 'facilities' AND rp.page_key = role_permissions.page_key
  )
ON CONFLICT (role, page_key) DO NOTHING;

-- ─── Migrar Prestador + escopo facilities → role facilities ──────────────────

UPDATE public.profiles p
SET role = 'facilities'
WHERE p.role = 'prestador'
  AND EXISTS (
    SELECT 1
    FROM public.user_scopes us
    WHERE us.user_id = p.id
      AND us.scope_type = 'prestador_tipo'
      AND us.scope_ref = 'facilities'
  );

DELETE FROM public.user_scopes
WHERE scope_type = 'prestador_tipo'
  AND scope_ref = 'facilities';

DELETE FROM public.prestador_tipo_pages
WHERE prestador_tipo_slug = 'facilities';

ALTER TABLE public.prestador_tipo_pages
  DROP CONSTRAINT IF EXISTS prestador_tipo_pages_prestador_tipo_slug_check;

ALTER TABLE public.prestador_tipo_pages
  ADD CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check
  CHECK (prestador_tipo_slug IN (
    'escritorio',
    'ti',
    'estudio'
  ));

COMMENT ON CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check ON public.prestador_tipo_pages IS
  'Áreas Prestadores (Gestão de Usuários / aba Prestadores). Facilities é perfil próprio (role facilities).';

-- ─── Helpers RLS / staff ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._gestor_departamento_roles()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_tech_ops',
    'gestor_academy',
    'gestor_rh',
    'gestor_facilities'
  ]::text[];
$$;

COMMENT ON FUNCTION public._gestor_departamento_roles() IS
  'Gestores de departamento (incl. Facilities): perfis gerenciais sem gestor_tipo — só role_permissions.';

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
          'rh',
          'facilities'
        )
        OR p.role::text = ANY (public._gestor_departamento_roles())
      )
  );
$$;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor, Prestador, staff Spin e gestores de departamento: sem escopo operadora/influencer na app — só role_permissions.';

CREATE OR REPLACE FUNCTION public._staff_spin_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IN (
        'shift_leader',
        'service_manager',
        'customer_service',
        'game_presenter',
        'shuffler',
        'tech_ops',
        'figurino',
        'comunicacao',
        'performance_coach',
        'rh',
        'facilities'
      )
      AND rp.page_key = p_page_key
      AND (
        (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
        OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
        OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
        OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
      )
  );
$$;

COMMENT ON FUNCTION public._staff_spin_page_perm(text, text) IS
  'Staff Spin (Estúdio + Escritório, incl. Facilities): ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

COMMIT;
