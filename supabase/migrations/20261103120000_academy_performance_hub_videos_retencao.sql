-- Performance Hub — vídeos: limite 500 MB e retenção de 90 dias após a conclusão
--
-- O vídeo existe para o ciclo de avaliação e feedback. Passados 90 dias da conclusão,
-- o arquivo é apagado do Storage pela Edge Function purge-academy-performance-hub-videos
-- (cron semanal). video_nome permanece na avaliação para histórico.

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'academy-performance-hub-videos';

ALTER TABLE public.academy_performance_hub_avaliacao
  ADD COLUMN IF NOT EXISTS concluida_em      timestamptz,
  ADD COLUMN IF NOT EXISTS video_removido_em timestamptz;

COMMENT ON COLUMN public.academy_performance_hub_avaliacao.concluida_em IS
  'Momento em que a avaliação passou a concluida. Base do prazo de retenção do vídeo (90 dias).';

COMMENT ON COLUMN public.academy_performance_hub_avaliacao.video_removido_em IS
  'Momento em que a retenção apagou o vídeo do Storage. video_nome é mantido.';

-- Avaliações já concluídas antes desta migração: updated_at é a melhor referência disponível.
UPDATE public.academy_performance_hub_avaliacao
SET concluida_em = updated_at
WHERE status = 'concluida'
  AND concluida_em IS NULL;

CREATE OR REPLACE FUNCTION public.academy_performance_hub_avaliacao_set_concluida_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ramos separados: OLD não existe em INSERT e não pode ser referenciado nesse caminho.
  IF NEW.status <> 'concluida' THEN
    NEW.concluida_em := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.concluida_em := now();
  ELSIF OLD.status IS DISTINCT FROM 'concluida' THEN
    -- Reabrir e concluir de novo reinicia o prazo; salvar de novo algo já concluído
    -- mantém a marca original.
    NEW.concluida_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_performance_hub_avaliacao_concluida_em
  ON public.academy_performance_hub_avaliacao;

CREATE TRIGGER trg_academy_performance_hub_avaliacao_concluida_em
  BEFORE INSERT OR UPDATE OF status ON public.academy_performance_hub_avaliacao
  FOR EACH ROW EXECUTE PROCEDURE public.academy_performance_hub_avaliacao_set_concluida_em();

-- Fila da retenção: só concluídas, com vídeo e ainda não apagadas.
CREATE INDEX IF NOT EXISTS idx_academy_performance_hub_avaliacao_video_retencao
  ON public.academy_performance_hub_avaliacao (concluida_em)
  WHERE video_url IS NOT NULL AND video_removido_em IS NULL;

COMMIT;
