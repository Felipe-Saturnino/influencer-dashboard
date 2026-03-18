-- =============================================================================
-- MIGRAÇÃO: Permitir que usuários autenticados atualizem influencer_perfil e
-- gerenciem influencer_operadoras (INSERT, UPDATE, DELETE)
--
-- Problema: Gestor (e Admin) não conseguiam salvar alterações no cadastro de
-- influencers — inclusive Cachê e Status — porque as tabelas tinham apenas
-- políticas SELECT. O RLS bloqueava silenciosamente os UPDATEs.
--
-- Solução: Adicionar políticas de escrita (FOR ALL) para authenticated,
-- alinhado ao padrão usado em lives, live_resultados, pagamentos.
-- A segregação (quem pode editar o quê) continua no app via role e
-- podeAlterarStatusCache.
--
-- Execute no SQL Editor do Supabase
-- =============================================================================

-- 1. INFLUENCER_PERFIL — adicionar escrita para autenticados
DROP POLICY IF EXISTS "Allow authenticated write influencer_perfil" ON influencer_perfil;
CREATE POLICY "Allow authenticated write influencer_perfil" ON influencer_perfil
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. INFLUENCER_OPERADORAS — adicionar escrita para autenticados
--    (necessário para salvar operadoras vinculadas no formulário de influencer)
DROP POLICY IF EXISTS "Allow authenticated write influencer_operadoras" ON influencer_operadoras;
CREATE POLICY "Allow authenticated write influencer_operadoras" ON influencer_operadoras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificação: listar políticas atuais
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('influencer_perfil', 'influencer_operadoras')
-- ORDER BY tablename, policyname;
