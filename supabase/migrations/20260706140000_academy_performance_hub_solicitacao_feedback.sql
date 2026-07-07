-- Performance Hub — texto da solicitação de feedback (avaliado)

BEGIN;

ALTER TABLE public.academy_performance_hub_avaliacao
  ADD COLUMN IF NOT EXISTS solicitacao_feedback_texto text;

COMMIT;
