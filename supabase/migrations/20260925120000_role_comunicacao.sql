-- Perfil Comunicação: paridade com Figurino (staff interno, role_permissions, sem user_scopes operadora).

BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'figurino',
    'comunicacao',
    'rh'
  ));

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'figurino',
    'comunicacao',
    'rh'
  ));

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'comunicacao', page_key, can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE role = 'figurino'
ON CONFLICT (role, page_key) DO NOTHING;

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
      AND p.role IN (
        'executivo',
        'investidor',
        'prestador',
        'shift_leader',
        'service_manager',
        'figurino',
        'comunicacao',
        'rh'
      )
  );
$$;

COMMENT ON FUNCTION public._role_sem_escopo_app() IS
  'Executivo, Investidor, Prestador e staff Spin (incl. Comunicação): sem escopo operadora/influencer na app — só role_permissions.';

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
      AND p.role IN ('shift_leader', 'service_manager', 'figurino', 'comunicacao', 'rh')
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
  'Shift Leader / Service Manager / Figurino / Comunicação / RH: ação efetiva só conforme role_permissions (aba Permissões), sem user_scopes.';

COMMIT;
