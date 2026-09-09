-- Fechamento de Mesa: data de reabertura + visibilidade em todos os dias do intervalo fechado.
-- Antes só havia hora_reabertura (time) e listagem por data_registro / nao_reaberta,
-- então reabrir num dia posterior sumia dos dias intermediários e a abertura parecia do dia do fechamento.

ALTER TABLE public.escala_ct_fechamento_mesa
  ADD COLUMN IF NOT EXISTS data_reabertura date;

-- Já reabertos: usar o dia civil do updated_at (America/Sao_Paulo) — aproximação do dia em que a reabertura foi gravada.
UPDATE public.escala_ct_fechamento_mesa
SET data_reabertura = (updated_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE nao_reaberta = false
  AND hora_reabertura IS NOT NULL
  AND data_reabertura IS NULL;

-- Fallback se updated_at ausente/estranho: mesmo dia do fechamento.
UPDATE public.escala_ct_fechamento_mesa
SET data_reabertura = data_registro
WHERE nao_reaberta = false
  AND hora_reabertura IS NOT NULL
  AND data_reabertura IS NULL;

ALTER TABLE public.escala_ct_fechamento_mesa
  DROP CONSTRAINT IF EXISTS escala_ct_fechamento_reab_chk;

ALTER TABLE public.escala_ct_fechamento_mesa
  ADD CONSTRAINT escala_ct_fechamento_reab_chk CHECK (
    (nao_reaberta = true AND hora_reabertura IS NULL AND data_reabertura IS NULL)
    OR (
      nao_reaberta = false
      AND hora_reabertura IS NOT NULL
      AND data_reabertura IS NOT NULL
      AND data_reabertura >= data_registro
    )
  );

DROP INDEX IF EXISTS public.escala_ct_fechamento_abertos_idx;
CREATE INDEX IF NOT EXISTS escala_ct_fechamento_abertos_idx
  ON public.escala_ct_fechamento_mesa (data_registro)
  WHERE nao_reaberta = true;

CREATE INDEX IF NOT EXISTS escala_ct_fechamento_intervalo_idx
  ON public.escala_ct_fechamento_mesa (data_registro, data_reabertura);

COMMENT ON COLUMN public.escala_ct_fechamento_mesa.data_reabertura IS
  'Dia civil da reabertura. Com data_registro forma o intervalo em que o fechamento aparece na aba Notificações.';

COMMENT ON TABLE public.escala_ct_fechamento_mesa IS
  'Controle de Turno → Notificações: fechamento/reabertura de mesa. Visível em cada dia D com data_registro ≤ D ≤ data_reabertura (ou aberto se nao_reaberta).';
