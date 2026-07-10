-- Remove perfil genérico `gestor` e matriz/escopos `gestor_tipo`.
-- Usuários existentes são convertidos para gestores de departamento conforme tipos.

BEGIN;

-- ─── 1. Converter profiles.role = gestor ─────────────────────────────────────
-- Prioridade se houver vários tipos: marketing > treinamento > afiliados > operacoes > geral
WITH tipos AS (
  SELECT
    s.user_id,
    array_agg(DISTINCT s.scope_ref ORDER BY s.scope_ref) AS refs
  FROM public.user_scopes s
  WHERE s.scope_type = 'gestor_tipo'
  GROUP BY s.user_id
),
destino AS (
  SELECT
    p.id AS user_id,
    CASE
      WHEN t.refs IS NOT NULL AND 'marketing' = ANY (t.refs) THEN 'gestor_marketing'
      WHEN t.refs IS NOT NULL AND 'treinamento' = ANY (t.refs) THEN 'gestor_academy'
      WHEN t.refs IS NOT NULL AND 'afiliados' = ANY (t.refs) THEN 'gestor_aquisicao'
      WHEN t.refs IS NOT NULL AND 'operacoes' = ANY (t.refs) THEN 'gestor_operacoes'
      WHEN t.refs IS NOT NULL AND 'geral' = ANY (t.refs) THEN 'gestor_operacoes'
      ELSE 'gestor_operacoes'
    END AS novo_role
  FROM public.profiles p
  LEFT JOIN tipos t ON t.user_id = p.id
  WHERE p.role = 'gestor'
)
UPDATE public.profiles p
SET role = d.novo_role
FROM destino d
WHERE p.id = d.user_id;

-- Copiar permissões do gestor genérico para departamentos que ainda estão só em «Não»
-- (preserva acesso operacional após a conversão).
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT d.role, g.page_key, g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
CROSS JOIN (
  SELECT unnest(ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh'
  ]::text[]) AS role
) d
WHERE g.role = 'gestor'
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role = d.role
      AND rp.page_key = g.page_key
      AND rp.can_view IN ('sim', 'proprios')
  )
ON CONFLICT (role, page_key) DO UPDATE
SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir
WHERE public.role_permissions.can_view IS DISTINCT FROM 'sim'
  AND public.role_permissions.can_view IS DISTINCT FROM 'proprios';

DELETE FROM public.role_permissions WHERE role = 'gestor';

DELETE FROM public.simulador_login_roles
WHERE viewer_role = 'gestor' OR simulavel_role = 'gestor';

DELETE FROM public.user_scopes WHERE scope_type = 'gestor_tipo';

DROP TABLE IF EXISTS public.gestor_tipo_pages CASCADE;

-- ─── 2. Constraints profiles / role_permissions ───────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
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

ALTER TABLE public.user_scopes DROP CONSTRAINT IF EXISTS user_scopes_scope_type_check;
ALTER TABLE public.user_scopes
  ADD CONSTRAINT user_scopes_scope_type_check
  CHECK (scope_type IN (
    'influencer',
    'operadora',
    'agencia_par',
    'prestador_tipo'
  ));

COMMENT ON CONSTRAINT user_scopes_scope_type_check ON public.user_scopes IS
  'Escopos: influencer, operadora, agencia_par, prestador_tipo. gestor_tipo removido (perfis gestor_* dedicados).';

-- ─── 3. Helpers RLS: só gestores de departamento (sem gestor_tipo_pages) ───────
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

CREATE OR REPLACE FUNCTION public._gestor_page_perm(p_page_key text, p_need text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role::text = ANY (public._gestor_departamento_roles())
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
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
  );
END;
$$;

COMMENT ON FUNCTION public._gestor_page_perm(text, text) IS
  'Gestores de departamento: permissão efetiva só via role_permissions (sem gestor_tipo).';

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
