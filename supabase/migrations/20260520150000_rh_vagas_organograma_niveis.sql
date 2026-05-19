-- Vaga pode reportar à diretoria, gerência ou time (exclusivo), como em rh_funcionarios.

BEGIN;

ALTER TABLE public.rh_vagas
  ADD COLUMN IF NOT EXISTS org_diretoria_id uuid REFERENCES public.rh_org_diretorias (id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_gerencia_id uuid REFERENCES public.rh_org_gerencias (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rh_vagas_org_diretoria ON public.rh_vagas (org_diretoria_id);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_org_gerencia ON public.rh_vagas (org_gerencia_id);

ALTER TABLE public.rh_vagas
  DROP CONSTRAINT IF EXISTS rh_vagas_org_um_nivel;

ALTER TABLE public.rh_vagas
  ADD CONSTRAINT rh_vagas_org_um_nivel CHECK (
    (CASE WHEN org_time_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN org_gerencia_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN org_diretoria_id IS NOT NULL THEN 1 ELSE 0 END)
    <= 1
  );

COMMENT ON COLUMN public.rh_vagas.org_diretoria_id IS 'Vínculo organograma (diretoria); exclusivo com org_gerencia_id e org_time_id.';
COMMENT ON COLUMN public.rh_vagas.org_gerencia_id IS 'Vínculo organograma (gerência); exclusivo com org_diretoria_id e org_time_id.';

COMMIT;
