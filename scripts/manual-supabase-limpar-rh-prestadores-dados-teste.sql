-- =============================================================================
-- Limpar cadastros de teste — Gestão de Prestadores (rh_funcionarios)
-- =============================================================================
-- Onde executar: SQL Editor do Supabase (recomendado: role postgres / service).
--
-- O que este script faz:
--   DELETE em public.rh_funcionarios remove todas as linhas da base de prestadores.
--
-- Efeitos colaterais (FKs já definidas nas migrações):
--   • public.rh_funcionario_historico — apagado em cascata (ON DELETE CASCADE).
--   • Organograma (rh_org_diretorias, rh_org_gerencias, rh_org_times): colunas
--     diretor_funcionario_id, gerente_funcionario_id, lider_funcionario_id passam
--     a NULL (ON DELETE SET NULL). A estrutura de diretorias/gerências/times permanece.
--
-- O que NÃO faz:
--   • Não remove arquivos do Storage (bucket rh-prestador-acoes). Se houver anexos
--     de ações, apague manualmente na UI Storage ou com service role, se quiser.
--   • Não altera permissões (role_permissions), perfis nem outros módulos RH.
--
-- Revogar: não há “undo”; faça backup se houver qualquer dado que queira manter.
-- =============================================================================

BEGIN;

DELETE FROM public.rh_funcionarios;

COMMIT;
