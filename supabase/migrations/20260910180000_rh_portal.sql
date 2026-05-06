-- ─── Portal de RH — comunicados, políticas, RH Talks, leituras/ciência ───────
-- RLS alinhado a _rh_dados_cadastro_perm (gestor/prestador via matrizes + role_permissions).
-- Permissões de menu: cópia de rh_dados_cadastro; gestor_tipo / prestador_tipo espelham dados cadastro.

BEGIN;

-- ─── Função de permissão (paridade com organograma / dados cadastro) ─────────

CREATE OR REPLACE FUNCTION public._rh_portal_perm(p_need text)
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
      OR public._gestor_page_perm('rh_portal', p_need)
      OR public._prestador_page_perm('rh_portal', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'rh_portal'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_portal_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_portal_perm(text) TO authenticated;

-- ─── Categorias (configuráveis; escopo comunicado vs política) ───────────────

CREATE TABLE IF NOT EXISTS public.rh_portal_categoria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        NOT NULL,
  label        text        NOT NULL,
  scope        text        NOT NULL CHECK (scope IN ('comunicado', 'politica')),
  accent_hex   text        NOT NULL DEFAULT '#7c3aed',
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_portal_categoria_slug_scope UNIQUE (slug, scope)
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_categoria_scope ON public.rh_portal_categoria (scope, sort_order);

-- ─── Comunicados ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_portal_comunicado (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                     text        NOT NULL,
  corpo                      text        NOT NULL,
  categoria_id               uuid        NOT NULL REFERENCES public.rh_portal_categoria (id) ON DELETE RESTRICT,
  is_pinned                  boolean     NOT NULL DEFAULT false,
  requires_acknowledgment    boolean     NOT NULL DEFAULT false,
  published_at               timestamptz NOT NULL DEFAULT now(),
  published_by               uuid,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- Apenas um comunicado fixado: índice parcial único em expressão constante.
DROP INDEX IF EXISTS rh_portal_comunicado_one_pinned;
CREATE UNIQUE INDEX rh_portal_comunicado_one_pinned
  ON public.rh_portal_comunicado ((true))
  WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_rh_portal_comunicado_pub ON public.rh_portal_comunicado (published_at DESC);

CREATE OR REPLACE FUNCTION public.rh_portal_comunicado_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_portal_comunicado_audit ON public.rh_portal_comunicado;
CREATE TRIGGER trg_rh_portal_comunicado_audit
  BEFORE INSERT OR UPDATE ON public.rh_portal_comunicado
  FOR EACH ROW EXECUTE PROCEDURE public.rh_portal_comunicado_audit();

-- ─── Políticas / normativas (conteúdo em texto; ficheiro opcional futuro) ─────

CREATE TABLE IF NOT EXISTS public.rh_portal_documento (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                   text        NOT NULL,
  corpo                    text,
  categoria_id             uuid        NOT NULL REFERENCES public.rh_portal_categoria (id) ON DELETE RESTRICT,
  paginas                  int,
  requires_acknowledgment  boolean     NOT NULL DEFAULT false,
  storage_path             text,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_documento_updated ON public.rh_portal_documento (updated_at DESC);

CREATE OR REPLACE FUNCTION public.rh_portal_documento_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_portal_documento_audit ON public.rh_portal_documento;
CREATE TRIGGER trg_rh_portal_documento_audit
  BEFORE INSERT OR UPDATE ON public.rh_portal_documento
  FOR EACH ROW EXECUTE PROCEDURE public.rh_portal_documento_audit();

-- ─── RH Talks + participantes ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_portal_rh_talk (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero         int         NOT NULL,
  titulo         text        NOT NULL,
  data_reuniao   date        NOT NULL,
  duracao_min    int         NOT NULL DEFAULT 0,
  resumo         text,
  storage_path   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_portal_rh_talk_numero_unique UNIQUE (numero)
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_rh_talk_data ON public.rh_portal_rh_talk (data_reuniao DESC);

CREATE TABLE IF NOT EXISTS public.rh_portal_rh_talk_participant (
  talk_id  uuid NOT NULL REFERENCES public.rh_portal_rh_talk (id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  PRIMARY KEY (talk_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_rh_talk_participant_user ON public.rh_portal_rh_talk_participant (user_id);

-- ─── Leitura / ciência (polimórfico) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_portal_read_receipt (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type      text NOT NULL CHECK (content_type IN ('comunicado', 'documento', 'rh_talk')),
  content_id        uuid NOT NULL,
  user_id           uuid NOT NULL,
  read_at           timestamptz NOT NULL DEFAULT now(),
  acknowledged_at   timestamptz,
  CONSTRAINT rh_portal_read_receipt_unique UNIQUE (content_type, content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_portal_read_receipt_user ON public.rh_portal_read_receipt (user_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.rh_portal_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_portal_comunicado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_portal_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_portal_rh_talk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_portal_rh_talk_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_portal_read_receipt ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_portal_categoria_select ON public.rh_portal_categoria FOR SELECT TO authenticated
  USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_categoria_insert ON public.rh_portal_categoria FOR INSERT TO authenticated
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_categoria_update ON public.rh_portal_categoria FOR UPDATE TO authenticated
  USING (public._rh_portal_perm('edit'))
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_categoria_delete ON public.rh_portal_categoria FOR DELETE TO authenticated
  USING (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_comunicado_select ON public.rh_portal_comunicado FOR SELECT TO authenticated
  USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_comunicado_insert ON public.rh_portal_comunicado FOR INSERT TO authenticated
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_comunicado_update ON public.rh_portal_comunicado FOR UPDATE TO authenticated
  USING (public._rh_portal_perm('edit'))
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_comunicado_delete ON public.rh_portal_comunicado FOR DELETE TO authenticated
  USING (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_documento_select ON public.rh_portal_documento FOR SELECT TO authenticated
  USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_documento_insert ON public.rh_portal_documento FOR INSERT TO authenticated
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_documento_update ON public.rh_portal_documento FOR UPDATE TO authenticated
  USING (public._rh_portal_perm('edit'))
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_documento_delete ON public.rh_portal_documento FOR DELETE TO authenticated
  USING (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_rh_talk_select ON public.rh_portal_rh_talk FOR SELECT TO authenticated
  USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_rh_talk_insert ON public.rh_portal_rh_talk FOR INSERT TO authenticated
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_rh_talk_update ON public.rh_portal_rh_talk FOR UPDATE TO authenticated
  USING (public._rh_portal_perm('edit'))
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_rh_talk_delete ON public.rh_portal_rh_talk FOR DELETE TO authenticated
  USING (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_rh_talk_participant_select ON public.rh_portal_rh_talk_participant FOR SELECT TO authenticated
  USING (public._rh_portal_perm('view'));

CREATE POLICY rh_portal_rh_talk_participant_insert ON public.rh_portal_rh_talk_participant FOR INSERT TO authenticated
  WITH CHECK (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_rh_talk_participant_delete ON public.rh_portal_rh_talk_participant FOR DELETE TO authenticated
  USING (public._rh_portal_perm('edit'));

CREATE POLICY rh_portal_read_receipt_select ON public.rh_portal_read_receipt FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public._rh_portal_perm('edit')
  );

CREATE POLICY rh_portal_read_receipt_insert ON public.rh_portal_read_receipt FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public._rh_portal_perm('view'));

CREATE POLICY rh_portal_read_receipt_update ON public.rh_portal_read_receipt FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public._rh_portal_perm('view'))
  WITH CHECK (user_id = auth.uid() AND public._rh_portal_perm('view'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_categoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_comunicado TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_documento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_rh_talk TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_rh_talk_participant TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rh_portal_read_receipt TO authenticated;

COMMENT ON TABLE public.rh_portal_comunicado IS 'Portal RH — comunicados internos; is_pinned com exclusividade parcial.';
COMMENT ON TABLE public.rh_portal_read_receipt IS 'Portal RH — leitura e ciência por utilizador e conteúdo.';

-- ─── Seeds mínimos de categorias (editável depois via SQL/admin) ─────────────

INSERT INTO public.rh_portal_categoria (slug, label, scope, accent_hex, sort_order)
VALUES
  ('geral', 'Geral', 'comunicado', '#6b7280', 0),
  ('beneficios', 'Benefícios', 'comunicado', '#7c3aed', 10),
  ('processos', 'Processos', 'comunicado', '#1e36f8', 20),
  ('eventos', 'Eventos', 'comunicado', '#70cae4', 30),
  ('urgente', 'Urgente', 'comunicado', '#e84025', 40),
  ('conduta', 'Conduta', 'politica', '#7c3aed', 0),
  ('beneficios_pol', 'Benefícios', 'politica', '#22c55e', 10),
  ('operacional', 'Operacional', 'politica', '#1e36f8', 20),
  ('seguranca', 'Segurança', 'politica', '#f59e0b', 30)
ON CONFLICT (slug, scope) DO NOTHING;

-- ─── role_permissions + matrizes (espelho rh_dados_cadastro) ───────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_portal', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_dados_cadastro'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gt.gestor_tipo_slug, 'rh_portal'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'rh_dados_cadastro'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT ptp.prestador_tipo_slug, 'rh_portal'
FROM public.prestador_tipo_pages ptp
WHERE ptp.page_key = 'rh_dados_cadastro'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMIT;
