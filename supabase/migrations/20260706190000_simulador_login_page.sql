-- Página Simulador de Login — permissões iniciais (Ver=Não para todos exceto admin implícito).

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'simulador_login', 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor'::text,
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
