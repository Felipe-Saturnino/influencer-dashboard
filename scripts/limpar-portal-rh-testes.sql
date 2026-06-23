-- =============================================================================
-- Portal RH — limpeza total de conteúdo de teste (somente Postgres)
-- =============================================================================
-- Onde executar: SQL Editor do Supabase (role postgres).
--
-- Remove: comunicados, políticas/normativas, RH Talks, leituras, histórico e
-- relacionamentos entre documentos.
--
-- NÃO remove:
--   • rh_portal_categoria (tipos Urgente, Conduta, RH, etc.)
--   • Arquivos no Storage (bucket rh-portal-assets) — o Supabase bloqueia
--     DELETE direto em storage.objects. Use um destes:
--       1) Dashboard → Storage → rh-portal-assets → selecionar tudo → Delete
--       2) node scripts/limpar-portal-rh-storage.mjs (service role)
--
-- Irreversível.
-- =============================================================================

BEGIN;

DELETE FROM public.rh_portal_read_receipt;
DELETE FROM public.rh_portal_postagem_status_historico;
DELETE FROM public.rh_portal_documento_relacao;
DELETE FROM public.rh_portal_rh_talk_participant;
DELETE FROM public.rh_portal_comunicado;
DELETE FROM public.rh_portal_documento;
DELETE FROM public.rh_portal_rh_talk;

COMMIT;

-- Conferência (todas devem retornar 0)
SELECT 'comunicado' AS tabela, count(*) AS restantes FROM public.rh_portal_comunicado
UNION ALL SELECT 'documento', count(*) FROM public.rh_portal_documento
UNION ALL SELECT 'rh_talk', count(*) FROM public.rh_portal_rh_talk
UNION ALL SELECT 'read_receipt', count(*) FROM public.rh_portal_read_receipt
UNION ALL SELECT 'status_historico', count(*) FROM public.rh_portal_postagem_status_historico
UNION ALL SELECT 'documento_relacao', count(*) FROM public.rh_portal_documento_relacao
UNION ALL SELECT 'rh_talk_participant', count(*) FROM public.rh_portal_rh_talk_participant;
