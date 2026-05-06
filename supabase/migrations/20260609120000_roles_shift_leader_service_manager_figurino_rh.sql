-- Perfis próprios: Shift Leader, Service Manager, Figurino, RH (permissionamento em role_permissions).
-- Remove os mesmos identificadores da matriz "tipos de gestor" (passam a ser roles, não gestor_tipo).

BEGIN;

DELETE FROM public.user_scopes
WHERE scope_type = 'gestor_tipo'
  AND scope_ref IN ('shift_leader', 'service_manager', 'figurino', 'recursos_humanos');

DELETE FROM public.gestor_tipo_pages
WHERE gestor_tipo_slug IN ('shift_leader', 'service_manager', 'figurino', 'recursos_humanos');

ALTER TABLE public.gestor_tipo_pages
  DROP CONSTRAINT IF EXISTS gestor_tipo_pages_gestor_tipo_slug_check;

ALTER TABLE public.gestor_tipo_pages
  ADD CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check
  CHECK (gestor_tipo_slug IN ('operacoes', 'marketing', 'afiliados', 'geral'));

COMMENT ON CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check ON public.gestor_tipo_pages IS
  'Tipos de gestor (aba Gestores). Shift Leader, Service Manager, Figurino e RH são profiles.role próprios.';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'gestor',
    'prestador',
    'executivo',
    'influencer',
    'operador',
    'agencia',
    'shift_leader',
    'service_manager',
    'figurino',
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
    'operador',
    'agencia',
    'shift_leader',
    'service_manager',
    'figurino',
    'rh'
  ));

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.slug, g.page_key, g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
CROSS JOIN (
  VALUES
    ('shift_leader'),
    ('service_manager'),
    ('figurino'),
    ('rh')
) AS r(slug)
WHERE g.role = 'gestor'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
