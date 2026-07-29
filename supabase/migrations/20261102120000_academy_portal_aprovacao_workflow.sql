-- Portal da Academy — status Aprovação + colunas de aprovação (comunicados/dicas)
-- Editar = Próprios envia Comunicados/Dicas para aprovação; Editar = Sim publica/aprova.

BEGIN;

-- ─── Status CHECK: inclui aprovacao ──────────────────────────────────────────

ALTER TABLE public.academy_portal_comunicado
  DROP CONSTRAINT IF EXISTS academy_portal_comunicado_status_check;
ALTER TABLE public.academy_portal_comunicado
  ADD CONSTRAINT academy_portal_comunicado_status_check
  CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado'));

ALTER TABLE public.academy_portal_dica
  DROP CONSTRAINT IF EXISTS academy_portal_dica_status_check;
ALTER TABLE public.academy_portal_dica
  ADD CONSTRAINT academy_portal_dica_status_check
  CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado'));

ALTER TABLE public.academy_portal_manual
  DROP CONSTRAINT IF EXISTS academy_portal_manual_status_check;
ALTER TABLE public.academy_portal_manual
  ADD CONSTRAINT academy_portal_manual_status_check
  CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado'));

-- ─── Colunas de aprovação (comunicado / dica) ────────────────────────────────

ALTER TABLE public.academy_portal_comunicado
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.academy_portal_dica
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

COMMENT ON COLUMN public.academy_portal_comunicado.approved_at IS
  'Quando a postagem em Aprovação foi publicada por quem tem Editar = Sim.';
COMMENT ON COLUMN public.academy_portal_dica.approved_at IS
  'Quando a postagem em Aprovação foi publicada por quem tem Editar = Sim.';

COMMIT;
