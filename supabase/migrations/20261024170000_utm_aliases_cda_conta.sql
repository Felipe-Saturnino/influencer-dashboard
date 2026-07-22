-- Origem da conta TAP CDA que detectou o UTM (sync-metricas-cda).
-- Usado na Gestão de Links → Pendentes (coluna Origem).

ALTER TABLE public.utm_aliases
  ADD COLUMN IF NOT EXISTS cda_conta text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'utm_aliases_cda_conta_check'
  ) THEN
    ALTER TABLE public.utm_aliases
      ADD CONSTRAINT utm_aliases_cda_conta_check
      CHECK (cda_conta IS NULL OR cda_conta IN ('influencers', 'afiliados'));
  END IF;
END $$;

COMMENT ON COLUMN public.utm_aliases.cda_conta IS
  'Conta TAP CDA que detectou o órfão: influencers | afiliados (Edge sync-metricas-cda).';

CREATE INDEX IF NOT EXISTS idx_utm_aliases_status_cda_conta
  ON public.utm_aliases (status, cda_conta)
  WHERE status = 'pendente';
