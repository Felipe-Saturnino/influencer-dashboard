-- Portal da Academy — comunicados, dicas, manuais (independente do Portal de RH)

BEGIN;

-- ─── Permissão ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._academy_portal_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('academy_portal', p_need)
      OR public._prestador_page_perm('academy_portal', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'academy_portal'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._academy_portal_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_portal_perm(text) TO authenticated;

-- ─── Categorias ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_portal_categoria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        NOT NULL,
  label        text        NOT NULL,
  scope        text        NOT NULL CHECK (scope IN ('comunicado', 'dica', 'manual')),
  accent_hex   text        NOT NULL DEFAULT '#7c3aed',
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_portal_categoria_slug_scope UNIQUE (slug, scope)
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_categoria_scope
  ON public.academy_portal_categoria (scope, sort_order);

-- ─── Comunicados ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_portal_comunicado (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                  text        NOT NULL,
  corpo                   text        NOT NULL,
  categoria_id            uuid        NOT NULL REFERENCES public.academy_portal_categoria (id) ON DELETE RESTRICT,
  status                  text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  imagem_storage_path     text,
  anexo_storage_path      text,
  anexo_nome              text,
  created_by              uuid,
  published_at            timestamptz,
  published_by            uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_comunicado_pub
  ON public.academy_portal_comunicado (published_at DESC NULLS LAST);

-- ─── Dicas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_portal_dica (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                  text        NOT NULL,
  corpo                   text        NOT NULL,
  categoria_id            uuid        NOT NULL REFERENCES public.academy_portal_categoria (id) ON DELETE RESTRICT,
  jogo_mesa               text,
  status                  text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  imagem_storage_path     text,
  anexo_storage_path      text,
  anexo_nome              text,
  created_by              uuid,
  published_at            timestamptz,
  published_by            uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_dica_pub
  ON public.academy_portal_dica (published_at DESC NULLS LAST);

-- ─── Manuais ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_portal_manual (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                  text        NOT NULL,
  introducao              text        NOT NULL,
  corpo                   text        NOT NULL,
  categoria_id            uuid        NOT NULL REFERENCES public.academy_portal_categoria (id) ON DELETE RESTRICT,
  jogo_mesa               text,
  status                  text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  imagem_storage_path     text,
  anexo_storage_path      text,
  anexo_nome              text,
  created_by              uuid,
  published_at            timestamptz,
  published_by            uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_manual_pub
  ON public.academy_portal_manual (published_at DESC NULLS LAST);

-- ─── Histórico de status ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_portal_postagem_status_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  text NOT NULL CHECK (content_type IN ('comunicado', 'dica', 'manual')),
  content_id    uuid NOT NULL,
  status_de     text NOT NULL,
  status_para   text NOT NULL,
  alteracao     text NOT NULL,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_portal_postagem_hist_content
  ON public.academy_portal_postagem_status_historico (content_type, content_id, created_at DESC);

-- ─── Audit triggers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.academy_portal_postagem_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_portal_comunicado_audit ON public.academy_portal_comunicado;
CREATE TRIGGER trg_academy_portal_comunicado_audit
  BEFORE INSERT OR UPDATE ON public.academy_portal_comunicado
  FOR EACH ROW EXECUTE PROCEDURE public.academy_portal_postagem_audit();

DROP TRIGGER IF EXISTS trg_academy_portal_dica_audit ON public.academy_portal_dica;
CREATE TRIGGER trg_academy_portal_dica_audit
  BEFORE INSERT OR UPDATE ON public.academy_portal_dica
  FOR EACH ROW EXECUTE PROCEDURE public.academy_portal_postagem_audit();

DROP TRIGGER IF EXISTS trg_academy_portal_manual_audit ON public.academy_portal_manual;
CREATE TRIGGER trg_academy_portal_manual_audit
  BEFORE INSERT OR UPDATE ON public.academy_portal_manual
  FOR EACH ROW EXECUTE PROCEDURE public.academy_portal_postagem_audit();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.academy_portal_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_portal_comunicado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_portal_dica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_portal_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_portal_postagem_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_portal_categoria_select ON public.academy_portal_categoria
  FOR SELECT TO authenticated USING (public._academy_portal_perm('view'));
CREATE POLICY academy_portal_categoria_insert ON public.academy_portal_categoria
  FOR INSERT TO authenticated WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_categoria_update ON public.academy_portal_categoria
  FOR UPDATE TO authenticated
  USING (public._academy_portal_perm('edit')) WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_categoria_delete ON public.academy_portal_categoria
  FOR DELETE TO authenticated USING (public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_comunicado_select ON public.academy_portal_comunicado
  FOR SELECT TO authenticated USING (public._academy_portal_perm('view'));
CREATE POLICY academy_portal_comunicado_insert ON public.academy_portal_comunicado
  FOR INSERT TO authenticated WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_comunicado_update ON public.academy_portal_comunicado
  FOR UPDATE TO authenticated
  USING (public._academy_portal_perm('edit')) WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_comunicado_delete ON public.academy_portal_comunicado
  FOR DELETE TO authenticated USING (public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_dica_select ON public.academy_portal_dica
  FOR SELECT TO authenticated USING (public._academy_portal_perm('view'));
CREATE POLICY academy_portal_dica_insert ON public.academy_portal_dica
  FOR INSERT TO authenticated WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_dica_update ON public.academy_portal_dica
  FOR UPDATE TO authenticated
  USING (public._academy_portal_perm('edit')) WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_dica_delete ON public.academy_portal_dica
  FOR DELETE TO authenticated USING (public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_manual_select ON public.academy_portal_manual
  FOR SELECT TO authenticated USING (public._academy_portal_perm('view'));
CREATE POLICY academy_portal_manual_insert ON public.academy_portal_manual
  FOR INSERT TO authenticated WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_manual_update ON public.academy_portal_manual
  FOR UPDATE TO authenticated
  USING (public._academy_portal_perm('edit')) WITH CHECK (public._academy_portal_perm('edit'));
CREATE POLICY academy_portal_manual_delete ON public.academy_portal_manual
  FOR DELETE TO authenticated USING (public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_postagem_hist_select ON public.academy_portal_postagem_status_historico
  FOR SELECT TO authenticated USING (public._academy_portal_perm('view'));
CREATE POLICY academy_portal_postagem_hist_insert ON public.academy_portal_postagem_status_historico
  FOR INSERT TO authenticated WITH CHECK (public._academy_portal_perm('edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_portal_categoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_portal_comunicado TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_portal_dica TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_portal_manual TO authenticated;
GRANT SELECT, INSERT ON public.academy_portal_postagem_status_historico TO authenticated;

-- ─── Storage ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-portal-assets',
  'academy-portal-assets',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY academy_portal_assets_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'academy-portal-assets' AND public._academy_portal_perm('view'));

CREATE POLICY academy_portal_assets_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'academy-portal-assets' AND public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_assets_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'academy-portal-assets' AND public._academy_portal_perm('edit'))
  WITH CHECK (bucket_id = 'academy-portal-assets' AND public._academy_portal_perm('edit'));

CREATE POLICY academy_portal_assets_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'academy-portal-assets' AND public._academy_portal_perm('edit'));

-- ─── Seeds de categorias ─────────────────────────────────────────────────────

INSERT INTO public.academy_portal_categoria (slug, label, scope, accent_hex, sort_order)
VALUES
  ('treinamentos', 'Treinamentos', 'comunicado', '#1e36f8', 0),
  ('geral', 'Geral', 'comunicado', '#6b7280', 10),
  ('jogos', 'Jogos', 'dica', '#22c55e', 0),
  ('imagem', 'Imagem', 'dica', '#a78bfa', 10),
  ('comunicacao', 'Comunicação', 'dica', '#70cae4', 20),
  ('geral', 'Geral', 'dica', '#6b7280', 30),
  ('jogos', 'Jogos', 'manual', '#22c55e', 0),
  ('imagem', 'Imagem', 'manual', '#a78bfa', 10),
  ('comunicacao', 'Comunicação', 'manual', '#70cae4', 20),
  ('geral', 'Geral', 'manual', '#6b7280', 30)
ON CONFLICT (slug, scope) DO NOTHING;

-- ─── Permissões iniciais (bloqueadas exceto admin via código) ────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'academy_portal', 'nao', 'nao', 'nao', 'nao'
FROM (
  SELECT unnest(
    ARRAY[
      'gestor',
      'executivo',
      'shift_leader',
      'service_manager',
      'figurino',
      'comunicacao',
      'performance_coach',
      'rh',
      'prestador',
      'operador',
      'agencia',
      'influencer',
      'afiliado',
      'investidor'
    ]::text[]
  ) AS role
) r
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

COMMIT;
