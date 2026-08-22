-- Performance Hub — status Aguardando / Feedback / Aprovado + histórico de ações
--
-- Anti-deadlock:
-- - Transações curtas (não um único BEGIN longo)
-- - lock_timeout para falhar rápido e permitir retry
-- - Histórico criado SEM FK; FK adicionada depois (evita circular lock com a tabela pai)
--
-- Se ainda der deadlock: feche abas do Performance Hub / SQL Editor paralelos e rode de novo.

-- ─── Bloco A: status (CHECK + remap) ─────────────────────────────────────────
-- Idempotente: se o CHECK novo já existir, não remapeia de novo (evita
-- feedback pós-migração voltar a aguardando num retry).
BEGIN;
SET LOCAL lock_timeout = '20s';
SET LOCAL deadlock_timeout = '1s';

DO $$
DECLARE
  check_def text;
  precisa_remap boolean;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
  INTO check_def
  FROM pg_constraint c
  WHERE c.conname = 'academy_performance_hub_avaliacao_status_check'
    AND c.conrelid = 'public.academy_performance_hub_avaliacao'::regclass;

  precisa_remap := check_def IS NULL OR check_def NOT LIKE '%aprovado%';

  ALTER TABLE public.academy_performance_hub_avaliacao
    DROP CONSTRAINT IF EXISTS academy_performance_hub_avaliacao_status_check;

  IF precisa_remap THEN
    UPDATE public.academy_performance_hub_avaliacao
    SET status = 'aguardando'
    WHERE status = 'feedback';

    UPDATE public.academy_performance_hub_avaliacao
    SET status = 'aprovado'
    WHERE status = 'concluida';

    UPDATE public.academy_performance_hub_avaliacao
    SET status = 'feedback'
    WHERE status = 'em_analise'
      AND solicitacao_feedback_texto IS NOT NULL
      AND btrim(solicitacao_feedback_texto) <> '';
  END IF;

  ALTER TABLE public.academy_performance_hub_avaliacao
    ADD CONSTRAINT academy_performance_hub_avaliacao_status_check
    CHECK (status IN (
      'pendente',
      'rascunho',
      'em_analise',
      'aguardando',
      'feedback',
      'aprovado'
    ));
END $$;

COMMIT;

-- ─── Bloco B: colunas de solicitação / aplicação ─────────────────────────────
BEGIN;
SET LOCAL lock_timeout = '20s';
SET LOCAL deadlock_timeout = '1s';

ALTER TABLE public.academy_performance_hub_avaliacao
  ADD COLUMN IF NOT EXISTS solicitacao_feedback_por_nome text,
  ADD COLUMN IF NOT EXISTS solicitacao_feedback_em timestamptz,
  ADD COLUMN IF NOT EXISTS aplicacao_feedback_texto text,
  ADD COLUMN IF NOT EXISTS aplicacao_feedback_por_nome text,
  ADD COLUMN IF NOT EXISTS aplicacao_feedback_em timestamptz;

UPDATE public.academy_performance_hub_avaliacao
SET
  solicitacao_feedback_em = COALESCE(solicitacao_feedback_em, updated_at),
  solicitacao_feedback_por_nome = COALESCE(solicitacao_feedback_por_nome, avaliado_nome)
WHERE solicitacao_feedback_texto IS NOT NULL
  AND btrim(solicitacao_feedback_texto) <> ''
  AND solicitacao_feedback_em IS NULL;

COMMIT;

-- ─── Bloco C: trigger concluida_em → aprovado ────────────────────────────────
CREATE OR REPLACE FUNCTION public.academy_performance_hub_avaliacao_set_concluida_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'aprovado' THEN
    NEW.concluida_em := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.concluida_em := now();
  ELSIF OLD.status IS DISTINCT FROM 'aprovado' THEN
    NEW.concluida_em := now();
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.academy_performance_hub_avaliacao.concluida_em IS
  'Momento em que a avaliação passou a aprovado. Base do prazo de retenção do vídeo (90 dias).';

BEGIN;
SET LOCAL lock_timeout = '20s';

UPDATE public.academy_performance_hub_avaliacao
SET concluida_em = COALESCE(concluida_em, updated_at)
WHERE status = 'aprovado'
  AND concluida_em IS NULL;

COMMIT;

-- ─── Bloco D: tabela de histórico (sem FK na criação) ────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_performance_hub_avaliacao_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id  uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  acao          text NOT NULL CHECK (acao IN (
    'publicada',
    'solicitou_feedback',
    'aprovou',
    'aplicou_feedback'
  )),
  usuario_nome  text NOT NULL,
  mensagem      text
);

CREATE INDEX IF NOT EXISTS idx_academy_ph_avaliacao_historico_avaliacao
  ON public.academy_performance_hub_avaliacao_historico (avaliacao_id, created_at DESC);

-- FK em passo separado (lock mais curto / ordem previsível)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academy_performance_hub_avaliacao_historico_avaliacao_id_fkey'
  ) THEN
    ALTER TABLE public.academy_performance_hub_avaliacao_historico
      ADD CONSTRAINT academy_performance_hub_avaliacao_historico_avaliacao_id_fkey
      FOREIGN KEY (avaliacao_id)
      REFERENCES public.academy_performance_hub_avaliacao(id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.academy_performance_hub_avaliacao_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_ph_avaliacao_historico_select ON public.academy_performance_hub_avaliacao_historico;
CREATE POLICY academy_ph_avaliacao_historico_select
  ON public.academy_performance_hub_avaliacao_historico
  FOR SELECT TO authenticated
  USING (public._academy_performance_hub_perm('view'));

DROP POLICY IF EXISTS academy_ph_avaliacao_historico_insert ON public.academy_performance_hub_avaliacao_historico;
CREATE POLICY academy_ph_avaliacao_historico_insert
  ON public.academy_performance_hub_avaliacao_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    public._academy_performance_hub_perm('view')
    OR public._academy_performance_hub_perm('edit')
  );

GRANT SELECT, INSERT ON public.academy_performance_hub_avaliacao_historico TO authenticated;
