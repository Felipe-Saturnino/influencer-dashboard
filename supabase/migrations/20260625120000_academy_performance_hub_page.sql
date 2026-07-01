-- Academy — Performance Hub (permissoes iniciais bloqueadas para todos os perfis exceto admin via codigo).

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'academy_performance_hub', 'nao', 'nao', 'nao', 'nao'
FROM (
  SELECT unnest(
    ARRAY[
      'gestor',
      'executivo',
      'shift_leader',
      'service_manager',
      'figurino',
      'comunicacao',
      'performance_coach',
      'rh',
      'prestador',
      'operador',
      'agencia',
      'influencer',
      'afiliado',
      'investidor'
    ]::text[]
  ) AS role
) r
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

COMMIT;
