-- =============================================================================
-- MIGRAÇÃO: Casting de Dealers — Permissões
-- Adiciona permissões para a nova página "Casting de Dealers" na seção Operações.
-- Replica as mesmas permissões de gestao_dealers (visualização para admin, gestor, executivo, operador).
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir) VALUES
  ('admin',    'casting_dealers', 'sim', 'nao', 'nao', 'nao'),
  ('gestor',   'casting_dealers', 'sim', 'nao', 'nao', 'nao'),
  ('executivo','casting_dealers', 'sim', 'nao', 'nao', 'nao'),
  ('operador', 'casting_dealers', 'sim', 'nao', 'nao', 'nao')
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- Para operadores verem a página, é necessário adicionar 'casting_dealers' em operadora_pages
-- para cada operadora. Exemplo (ajuste o slug):
-- INSERT INTO operadora_pages (operadora_slug, page_key) VALUES ('sua-operadora', 'casting_dealers')
-- ON CONFLICT (operadora_slug, page_key) DO NOTHING;
