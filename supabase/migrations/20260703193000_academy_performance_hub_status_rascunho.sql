-- Performance Hub — status rascunho (fluxo Game Presenter)

BEGIN;

ALTER TABLE public.academy_performance_hub_avaliacao
  DROP CONSTRAINT IF EXISTS academy_performance_hub_avaliacao_status_check;

ALTER TABLE public.academy_performance_hub_avaliacao
  ADD CONSTRAINT academy_performance_hub_avaliacao_status_check
  CHECK (status IN ('pendente', 'rascunho', 'em_analise', 'feedback', 'concluida'));

COMMIT;
