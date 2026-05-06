-- Perfil externo Investidor: sem user_scopes; permissões apenas via role_permissions (aba Permissões).

BEGIN;

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
    'investidor',
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
    'investidor',
    'shift_leader',
    'service_manager',
    'figurino',
    'rh'
  ));

COMMENT ON CONSTRAINT profiles_role_check ON public.profiles IS
  'Perfis da plataforma; investidor = externo sem escopo em user_scopes (igual executivo/staff para fins de segregação).';

COMMIT;
