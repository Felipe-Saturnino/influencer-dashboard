-- =============================================================================
-- FIX: Garantir que role_permissions aceite o role "agencia"
-- Execute no SQL Editor do Supabase se as permissões do role Agência não estiverem salvando
-- =============================================================================

-- 0. OBRIGATÓRIO: Atualizar a check constraint para permitir "agencia"
--    (O erro "violates check constraint role_permissions_role_check" ocorre porque "agencia" não estava na lista)
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('admin', 'gestor', 'executivo', 'influencer', 'operador', 'agencia'));

-- 1. Verificar se a constraint única existe (role, page_key)
-- Se o upsert falhar com "duplicate key" ou "conflict", a constraint pode ter nome diferente

-- 2. Criar constraint se não existir (ajuste conforme sua tabela)
-- ALTER TABLE role_permissions
-- ADD CONSTRAINT role_permissions_role_page_key_key UNIQUE (role, page_key);

-- 3. Verificar RLS (Row Level Security) - o usuário precisa poder INSERT/UPDATE
-- SELECT * FROM pg_policies WHERE tablename = 'role_permissions';

-- 4. Se necessário, garantir que authenticated pode fazer upsert:
-- (Ajuste a política conforme suas regras de segurança)
/*
DROP POLICY IF EXISTS "Allow authenticated to manage role_permissions" ON role_permissions;
CREATE POLICY "Allow authenticated to manage role_permissions" ON role_permissions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
*/

-- 5. Teste manual: inserir uma linha para agencia
-- INSERT INTO role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
-- VALUES ('agencia', 'agenda', 'sim', 'sim', 'sim', 'sim')
-- ON CONFLICT (role, page_key) DO UPDATE SET
--   can_view = EXCLUDED.can_view,
--   can_criar = EXCLUDED.can_criar,
--   can_editar = EXCLUDED.can_editar,
--   can_excluir = EXCLUDED.can_excluir;
