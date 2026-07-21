-- Dashboards — Afiliados (dash_afiliados) e Overview Afiliado (dash_overview_afiliado):
-- permissões iniciais Não para todos os perfis exceto Admin.

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, p.page_key, 'nao', NULL, NULL, NULL
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao', 'gestor_marketing', 'gestor_operacoes', 'gestor_tech_ops', 'gestor_academy', 'gestor_rh',
    'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo',
    'prestador', 'rh', 'figurino', 'comunicacao', 'performance_coach', 'service_manager', 'shift_leader',
    'customer_service', 'game_presenter', 'shuffler', 'tech_ops'
  ]::text[]) AS role
) r
CROSS JOIN (
  SELECT unnest(ARRAY['dash_afiliados', 'dash_overview_afiliado']::text[]) AS page_key
) p
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
