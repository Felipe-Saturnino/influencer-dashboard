-- Portal da Academy — Manuais: código, versão, ciência e read receipt

BEGIN;

ALTER TABLE public.academy_portal_manual
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS versao text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS requires_acknowledgment boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.academy_portal_read_receipt (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        uuid NOT NULL REFERENCES public.academy_portal_manual (id) ON DELETE CASCADE,
  user_id           uuid NOT NULL,
  read_at           timestamptz NOT NULL DEFAULT now(),
  acknowledged_at   timestamptz,
  CONSTRAINT academy_portal_read_receipt_unique UNIQUE (content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_read_receipt_user
  ON public.academy_portal_read_receipt (user_id);

ALTER TABLE public.academy_portal_read_receipt ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_portal_read_receipt_select ON public.academy_portal_read_receipt
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public._academy_portal_perm('edit')
  );

CREATE POLICY academy_portal_read_receipt_insert ON public.academy_portal_read_receipt
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public._academy_portal_perm('view'));

CREATE POLICY academy_portal_read_receipt_update ON public.academy_portal_read_receipt
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public._academy_portal_perm('view'))
  WITH CHECK (user_id = auth.uid() AND public._academy_portal_perm('view'));

GRANT SELECT, INSERT, UPDATE ON public.academy_portal_read_receipt TO authenticated;

COMMENT ON TABLE public.academy_portal_read_receipt IS 'Portal da Academy — leitura e ciência de manuais por usuário.';

COMMIT;
