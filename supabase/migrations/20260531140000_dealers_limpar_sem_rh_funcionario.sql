-- Remove dealers do cadastro manual antigo (sem prestador RH) e órfãos após exclusão de prestador
-- (ON DELETE SET NULL em rh_funcionario_id). Mantém apenas dealers criados/atualizados pela Gestão de Staff.
-- Executar depois de 20260527180000_rh_dealer_game_presenter_sync.sql (coluna rh_funcionario_id).
-- Tabelas com FK ON DELETE CASCADE (ex.: dealer_solicitacoes, dealer_observacoes) limpam dependentes.

BEGIN;

DELETE FROM public.dealers
WHERE rh_funcionario_id IS NULL;

COMMIT;
