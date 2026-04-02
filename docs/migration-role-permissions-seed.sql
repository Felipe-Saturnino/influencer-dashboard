-- =============================================================================
-- MIGRAÇÃO: role_permissions — Seed completo para todos os roles
-- Garante que admin, gestor, executivo e demais roles tenham permissões coerentes.
-- 
-- Problema resolvido: Gestor não via dados nos dashboards porque não havia
-- linhas em role_permissions para dash_overview, dash_conversao, etc.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- Garantir constraint de role (caso docs/archive/fix-role-permissions-agencia não tenha sido executado)
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('admin', 'gestor', 'executivo', 'influencer', 'operador', 'agencia'));

-- Garantir constraint única para upsert
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_page_key_key;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_page_key_key 
  UNIQUE (role, page_key);

-- =============================================================================
-- PERMISSÕES PADRÃO POR ROLE
-- can_view, can_criar, can_editar, can_excluir: 'sim' | 'nao' | 'proprios' | null
-- =============================================================================

-- ADMIN: acesso total
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('admin', 'agenda',             'sim', 'sim', 'sim', 'sim'),
  ('admin', 'resultados',         'sim', 'nao', 'sim', 'nao'),
  ('admin', 'feedback',           'sim', 'nao', 'sim', 'sim'),
  ('admin', 'dash_overview',      'sim', NULL, NULL, NULL),
  ('admin', 'dash_overview_influencer', 'sim', NULL, NULL, NULL),
  ('admin', 'dash_conversao',     'sim', NULL, NULL, NULL),
  ('admin', 'dash_financeiro',    'sim', NULL, NULL, NULL),
  ('admin', 'influencers',        'sim', 'sim', 'sim', 'nao'),
  ('admin', 'scout',              'sim', 'sim', 'sim', 'sim'),
  ('admin', 'financeiro',         'sim', 'nao', 'sim', 'nao'),
  ('admin', 'gestao_links',       'sim', 'nao', 'sim', 'nao'),
  ('admin', 'gestao_usuarios',    'sim', NULL, NULL, NULL),
  ('admin', 'gestao_operadoras',  'sim', 'sim', 'sim', 'nao'),
  ('admin', 'status_tecnico',     'sim', NULL, NULL, NULL),
  ('admin', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('admin', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- GESTOR: mesmo que admin, exceto Gestão de Usuários
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('gestor', 'agenda',             'sim', 'sim', 'sim', 'sim'),
  ('gestor', 'resultados',         'sim', 'nao', 'sim', 'nao'),
  ('gestor', 'feedback',           'sim', 'nao', 'sim', 'sim'),
  ('gestor', 'dash_overview',      'sim', NULL, NULL, NULL),
  ('gestor', 'dash_overview_influencer', 'sim', NULL, NULL, NULL),
  ('gestor', 'dash_conversao',     'sim', NULL, NULL, NULL),
  ('gestor', 'dash_financeiro',    'sim', NULL, NULL, NULL),
  ('gestor', 'influencers',        'sim', 'sim', 'sim', 'nao'),
  ('gestor', 'scout',              'sim', 'sim', 'sim', 'sim'),
  ('gestor', 'financeiro',         'sim', 'nao', 'sim', 'nao'),
  ('gestor', 'gestao_links',       'sim', 'nao', 'sim', 'nao'),
  ('gestor', 'gestao_usuarios',    'nao', NULL, NULL, NULL),
  ('gestor', 'gestao_operadoras',  'sim', 'sim', 'sim', 'nao'),
  ('gestor', 'status_tecnico',     'sim', NULL, NULL, NULL),
  ('gestor', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('gestor', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- EXECUTIVO: acesso amplo (filtrado por user_scopes se houver escopos)
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('executivo', 'agenda',             'sim', 'sim', 'sim', 'sim'),
  ('executivo', 'resultados',         'sim', 'nao', 'sim', 'nao'),
  ('executivo', 'feedback',           'sim', 'nao', 'sim', 'sim'),
  ('executivo', 'dash_overview',      'sim', NULL, NULL, NULL),
  ('executivo', 'dash_overview_influencer', 'sim', NULL, NULL, NULL),
  ('executivo', 'dash_conversao',     'sim', NULL, NULL, NULL),
  ('executivo', 'dash_financeiro',    'sim', NULL, NULL, NULL),
  ('executivo', 'influencers',        'sim', 'nao', 'sim', 'nao'),
  ('executivo', 'scout',              'sim', 'sim', 'sim', 'sim'),
  ('executivo', 'financeiro',         'sim', 'nao', 'sim', 'nao'),
  ('executivo', 'gestao_links',       'sim', 'nao', 'sim', 'nao'),
  ('executivo', 'gestao_usuarios',    'nao', NULL, NULL, NULL),
  ('executivo', 'gestao_operadoras',  'sim', 'nao', 'sim', 'nao'),
  ('executivo', 'status_tecnico',     'sim', NULL, NULL, NULL),
  ('executivo', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('executivo', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- OPERADOR: acesso operacional (filtrado por user_scopes)
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('operador', 'agenda',             'sim', 'sim', 'sim', 'sim'),
  ('operador', 'resultados',         'sim', 'nao', 'sim', 'nao'),
  ('operador', 'feedback',           'sim', 'nao', 'sim', 'sim'),
  ('operador', 'dash_overview',      'sim', NULL, NULL, NULL),
  ('operador', 'dash_overview_influencer', 'sim', NULL, NULL, NULL),
  ('operador', 'dash_conversao',     'sim', NULL, NULL, NULL),
  ('operador', 'dash_financeiro',    'sim', NULL, NULL, NULL),
  ('operador', 'influencers',        'sim', 'nao', 'sim', 'nao'),
  ('operador', 'scout',              'sim', 'sim', 'sim', 'sim'),
  ('operador', 'financeiro',         'sim', 'nao', 'sim', 'nao'),
  ('operador', 'gestao_links',       'sim', 'nao', 'sim', 'nao'),
  ('operador', 'gestao_usuarios',    'nao', NULL, NULL, NULL),
  ('operador', 'gestao_operadoras',  'sim', 'nao', 'sim', 'nao'),
  ('operador', 'status_tecnico',     'sim', NULL, NULL, NULL),
  ('operador', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('operador', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- INFLUENCER: apenas próprio dash, próprio perfil, configurações/ajuda
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('influencer', 'agenda',             'sim', 'nao', 'proprios', 'nao'),
  ('influencer', 'resultados',         'sim', 'nao', 'proprios', 'nao'),
  ('influencer', 'feedback',           'sim', 'nao', 'proprios', 'nao'),
  ('influencer', 'dash_overview',      'nao', NULL, NULL, NULL),
  ('influencer', 'dash_overview_influencer', 'proprios', NULL, NULL, NULL),
  ('influencer', 'dash_conversao',     'nao', NULL, NULL, NULL),
  ('influencer', 'dash_financeiro',    'nao', NULL, NULL, NULL),
  ('influencer', 'influencers',        'proprios', 'nao', 'proprios', 'nao'),
  ('influencer', 'scout',              'nao', NULL, NULL, NULL),
  ('influencer', 'financeiro',         'proprios', 'nao', 'nao', 'nao'),
  ('influencer', 'gestao_links',       'proprios', 'nao', 'proprios', 'nao'),
  ('influencer', 'gestao_usuarios',    'nao', NULL, NULL, NULL),
  ('influencer', 'gestao_operadoras',  'nao', NULL, NULL, NULL),
  ('influencer', 'status_tecnico',     'nao', NULL, NULL, NULL),
  ('influencer', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('influencer', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- AGÊNCIA: pares influencer×operadora (filtrado por user_scopes tipo agencia_par)
INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('agencia', 'agenda',             'sim', 'nao', 'proprios', 'nao'),
  ('agencia', 'resultados',         'sim', 'nao', 'proprios', 'nao'),
  ('agencia', 'feedback',           'sim', 'nao', 'proprios', 'nao'),
  ('agencia', 'dash_overview',      'nao', NULL, NULL, NULL),
  ('agencia', 'dash_overview_influencer', 'proprios', NULL, NULL, NULL),
  ('agencia', 'dash_conversao',     'nao', NULL, NULL, NULL),
  ('agencia', 'dash_financeiro',    'nao', NULL, NULL, NULL),
  ('agencia', 'influencers',        'proprios', 'nao', 'proprios', 'nao'),
  ('agencia', 'scout',              'nao', NULL, NULL, NULL),
  ('agencia', 'financeiro',         'proprios', 'nao', 'nao', 'nao'),
  ('agencia', 'gestao_links',       'proprios', 'nao', 'proprios', 'nao'),
  ('agencia', 'gestao_usuarios',    'nao', NULL, NULL, NULL),
  ('agencia', 'gestao_operadoras',  'nao', NULL, NULL, NULL),
  ('agencia', 'status_tecnico',     'nao', NULL, NULL, NULL),
  ('agencia', 'configuracoes',      'sim', NULL, NULL, NULL),
  ('agencia', 'ajuda',              'sim', NULL, NULL, NULL)
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- Verificação (opcional): listar permissões por role
-- SELECT role, page_key, can_view FROM role_permissions ORDER BY role, page_key;
