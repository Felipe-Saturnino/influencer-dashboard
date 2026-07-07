-- RH Solicitações — abono remunerado ao aprovar atestado.

BEGIN;

ALTER TABLE public.rh_solicitacoes
  ADD COLUMN IF NOT EXISTS abono_remunerado text
    CHECK (abono_remunerado IS NULL OR abono_remunerado IN ('sim', 'nao'));

COMMENT ON COLUMN public.rh_solicitacoes.abono_remunerado IS
  'Preenchido no atendimento quando status = aprovado: sim | nao (Abono remunerado?).';

COMMIT;
