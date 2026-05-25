-- Informativos — comunicados por perfil (Home) + workflow de postagem

BEGIN;

CREATE OR REPLACE FUNCTION public._informativos_perm(p_need text)
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
      OR public._gestor_page_perm('informativos', p_need)
      OR public._prestador_page_perm('informativos', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'informativos'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._informativos_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._informativos_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.conteudo_informativo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assunto       text        NOT NULL,
  descricao     text        NOT NULL,
  perfis        text[]      NOT NULL DEFAULT '{}',
  status        text        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'aprovacao', 'publicado', 'arquivado')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  published_at  timestamptz,
  published_by  uuid,
  approved_at   timestamptz,
  approved_by   uuid,
  CONSTRAINT conteudo_informativo_perfis_nonempty CHECK (cardinality(perfis) > 0)
);

CREATE INDEX IF NOT EXISTS idx_conteudo_informativo_pub
  ON public.conteudo_informativo (published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conteudo_informativo_status
  ON public.conteudo_informativo (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.conteudo_informativo_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conteudo_informativo_audit ON public.conteudo_informativo;
CREATE TRIGGER trg_conteudo_informativo_audit
  BEFORE INSERT OR UPDATE ON public.conteudo_informativo
  FOR EACH ROW EXECUTE PROCEDURE public.conteudo_informativo_audit();

CREATE TABLE IF NOT EXISTS public.conteudo_informativo_status_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  informativo_id uuid NOT NULL REFERENCES public.conteudo_informativo (id) ON DELETE CASCADE,
  status_de     text NOT NULL,
  status_para   text NOT NULL,
  alteracao     text NOT NULL,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conteudo_informativo_hist
  ON public.conteudo_informativo_status_historico (informativo_id, created_at DESC);

ALTER TABLE public.conteudo_informativo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteudo_informativo_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY conteudo_informativo_select ON public.conteudo_informativo
  FOR SELECT TO authenticated
  USING (
    public._informativos_perm('edit')
    OR (
      public._informativos_perm('view')
      AND status = 'publicado'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text = ANY (perfis)
      )
    )
  );

CREATE POLICY conteudo_informativo_insert ON public.conteudo_informativo
  FOR INSERT TO authenticated
  WITH CHECK (public._informativos_perm('create'));

CREATE POLICY conteudo_informativo_update ON public.conteudo_informativo
  FOR UPDATE TO authenticated
  USING (public._informativos_perm('edit'))
  WITH CHECK (public._informativos_perm('edit'));

CREATE POLICY conteudo_informativo_delete ON public.conteudo_informativo
  FOR DELETE TO authenticated
  USING (public._informativos_perm('delete'));

CREATE POLICY conteudo_informativo_hist_select ON public.conteudo_informativo_status_historico
  FOR SELECT TO authenticated
  USING (public._informativos_perm('view'));

CREATE POLICY conteudo_informativo_hist_insert ON public.conteudo_informativo_status_historico
  FOR INSERT TO authenticated
  WITH CHECK (public._informativos_perm('edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_informativo TO authenticated;
GRANT SELECT, INSERT ON public.conteudo_informativo_status_historico TO authenticated;

COMMENT ON TABLE public.conteudo_informativo IS 'Informativos — avisos por perfil exibidos na Home.';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'informativos', 'nao', 'nao', 'nao', 'nao'
FROM public.role_permissions
WHERE page_key = 'rh_portal'
  AND role <> 'admin'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'informativos'
FROM public.gestor_tipo_pages
WHERE page_key = 'rh_portal'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT prestador_tipo_slug, 'informativos'
FROM public.prestador_tipo_pages
WHERE page_key = 'rh_portal'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMIT;
