-- Portal RH — workflow de postagens (rascunho, aprovação, publicado, arquivado) + histórico de status

BEGIN;

-- ─── Colunas em comunicados ───────────────────────────────────────────────────

ALTER TABLE public.rh_portal_comunicado
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado')),
  ADD COLUMN IF NOT EXISTS introducao text,
  ADD COLUMN IF NOT EXISTS imagem_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_nome text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.rh_portal_comunicado
  ALTER COLUMN published_at DROP NOT NULL;

UPDATE public.rh_portal_comunicado SET status = 'publicado' WHERE status IS NULL;

-- ─── Colunas em documentos (políticas) ────────────────────────────────────────

ALTER TABLE public.rh_portal_documento
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado')),
  ADD COLUMN IF NOT EXISTS introducao text,
  ADD COLUMN IF NOT EXISTS imagem_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_nome text,
  ADD COLUMN IF NOT EXISTS requer_aprovacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.rh_portal_documento
SET published_at = updated_at, status = 'publicado'
WHERE published_at IS NULL AND status = 'publicado';

-- ─── Colunas em RH Talks (conteúdo portal) ────────────────────────────────────

ALTER TABLE public.rh_portal_rh_talk
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado')),
  ADD COLUMN IF NOT EXISTS introducao text,
  ADD COLUMN IF NOT EXISTS corpo text,
  ADD COLUMN IF NOT EXISTS imagem_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_storage_path text,
  ADD COLUMN IF NOT EXISTS anexo_nome text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.rh_portal_rh_talk
  ALTER COLUMN numero DROP NOT NULL,
  ALTER COLUMN data_reuniao DROP NOT NULL;

UPDATE public.rh_portal_rh_talk
SET
  status = 'publicado',
  published_at = COALESCE(published_at, created_at),
  data_reuniao = COALESCE(data_reuniao, (created_at AT TIME ZONE 'UTC')::date)
WHERE status IS NULL OR published_at IS NULL;

-- ─── Histórico (apenas mudanças de status) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_portal_postagem_status_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  text NOT NULL CHECK (content_type IN ('comunicado', 'documento', 'rh_talk')),
  content_id    uuid NOT NULL,
  status_de     text NOT NULL,
  status_para   text NOT NULL,
  alteracao     text NOT NULL,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_postagem_hist_content
  ON public.rh_portal_postagem_status_historico (content_type, content_id, created_at DESC);

ALTER TABLE public.rh_portal_postagem_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_portal_postagem_hist_select ON public.rh_portal_postagem_status_historico
  FOR SELECT TO authenticated USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_postagem_hist_insert ON public.rh_portal_postagem_status_historico
  FOR INSERT TO authenticated WITH CHECK (public._rh_portal_perm('edit'));

GRANT SELECT, INSERT ON public.rh_portal_postagem_status_historico TO authenticated;

-- ─── Categorias adicionais ────────────────────────────────────────────────────

INSERT INTO public.rh_portal_categoria (slug, label, scope, accent_hex, sort_order)
VALUES
  ('pagamento', 'Pagamento', 'comunicado', '#22c55e', 25),
  ('bonificacao', 'Bonificação', 'politica', '#22c55e', 15),
  ('folha_pagamento', 'Folha de Pagamento', 'politica', '#1e36f8', 25)
ON CONFLICT (slug, scope) DO NOTHING;

-- ─── Storage ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-portal-assets',
  'rh-portal-assets',
  false,
  15728640,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY rh_portal_assets_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rh-portal-assets' AND public._rh_portal_perm('view'));

CREATE POLICY rh_portal_assets_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rh-portal-assets' AND public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_assets_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rh-portal-assets' AND public._rh_portal_perm('edit'))
  WITH CHECK (bucket_id = 'rh-portal-assets' AND public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_assets_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rh-portal-assets' AND public._rh_portal_perm('edit'));

COMMIT;
