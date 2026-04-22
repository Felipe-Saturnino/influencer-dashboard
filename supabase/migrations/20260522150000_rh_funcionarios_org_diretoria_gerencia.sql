-- Prestador pode ficar vinculado ao organograma só na diretoria, só na gerência ou no time (exclusivo).

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS org_diretoria_id uuid REFERENCES public.rh_org_diretorias (id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_gerencia_id uuid REFERENCES public.rh_org_gerencias (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_org_diretoria ON public.rh_funcionarios (org_diretoria_id);
CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_org_gerencia ON public.rh_funcionarios (org_gerencia_id);

ALTER TABLE public.rh_funcionarios
  DROP CONSTRAINT IF EXISTS rh_funcionarios_org_um_nivel;

ALTER TABLE public.rh_funcionarios
  ADD CONSTRAINT rh_funcionarios_org_um_nivel CHECK (
    (CASE WHEN org_time_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN org_gerencia_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN org_diretoria_id IS NOT NULL THEN 1 ELSE 0 END)
    <= 1
  );

COMMENT ON COLUMN public.rh_funcionarios.org_diretoria_id IS 'Vínculo opcional ao organograma (nível diretoria); mutuamente exclusivo com org_gerencia_id e org_time_id.';
COMMENT ON COLUMN public.rh_funcionarios.org_gerencia_id IS 'Vínculo opcional ao organograma (nível gerência); mutuamente exclusivo com org_diretoria_id e org_time_id.';

COMMIT;
