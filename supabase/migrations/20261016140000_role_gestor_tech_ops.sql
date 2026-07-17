-- Perfil Gestor de Tech Ops: gestor de departamento (paridade estrutural com Gestor de Operações).
-- Sem escopo operadora/influencer — só role_permissions (aba Permissões). Seed inicial: Não em todas as páginas.

BEGIN;

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
    'gestor_tech_ops',
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

-- Mesmas páginas do Gestor de Operações; valores Não até liberação na aba Permissões.
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'gestor_tech_ops',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'gestor_operacoes'
ON CONFLICT (role, page_key) DO NOTHING;

-- Fallback se gestor_operacoes ainda não tiver linhas (ambiente parcial).
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT
  'gestor_tech_ops',
  page_key,
  'nao',
  CASE WHEN can_criar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_editar IS NULL THEN NULL ELSE 'nao' END,
  CASE WHEN can_excluir IS NULL THEN NULL ELSE 'nao' END
FROM public.role_permissions
WHERE role = 'executivo'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = 'gestor_tech_ops' AND rp.page_key = role_permissions.page_key
  )
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
    'gestor_tech_ops',
    'gestor_academy',
    'gestor_rh'
  ]::text[];
$$;

COMMENT ON FUNCTION public._gestor_departamento_roles() IS
  'Gestores de departamento (incl. Tech Ops): perfis gerenciais sem gestor_tipo — só role_permissions.';

COMMIT;
