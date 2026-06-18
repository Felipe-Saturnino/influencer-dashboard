-- Galeria de Fotos (Marketing) — eventos, fotos gerais e fotos de prestadores.

BEGIN;

CREATE OR REPLACE FUNCTION public._galeria_fotos_perm(p_need text)
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
      OR public._gestor_page_perm('galeria_fotos', p_need)
      OR public._prestador_page_perm('galeria_fotos', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'galeria_fotos'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._galeria_fotos_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._galeria_fotos_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.marketing_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text        NOT NULL,
  data_evento   date        NOT NULL,
  descricao     text,
  ativo         boolean     NOT NULL DEFAULT true,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_eventos_data
  ON public.marketing_eventos (data_evento DESC, nome);

CREATE INDEX IF NOT EXISTS idx_marketing_eventos_ativo
  ON public.marketing_eventos (ativo) WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.marketing_fotos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id           uuid        NOT NULL REFERENCES public.marketing_eventos (id) ON DELETE CASCADE,
  tipo                text        NOT NULL CHECK (tipo IN ('geral', 'prestador')),
  rh_funcionario_id   uuid        REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL,
  storage_path        text        NOT NULL,
  file_name           text        NOT NULL,
  mime_type           text,
  legenda             text,
  visivel_prestador   boolean     NOT NULL DEFAULT false,
  uploaded_by         uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_fotos_prestador_vinculo CHECK (
    (tipo = 'geral' AND rh_funcionario_id IS NULL)
    OR (tipo = 'prestador' AND rh_funcionario_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_marketing_fotos_evento
  ON public.marketing_fotos (evento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_fotos_tipo
  ON public.marketing_fotos (tipo, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_fotos_prestador
  ON public.marketing_fotos (rh_funcionario_id)
  WHERE rh_funcionario_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.marketing_eventos_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_eventos_audit ON public.marketing_eventos;
CREATE TRIGGER trg_marketing_eventos_audit
  BEFORE INSERT OR UPDATE ON public.marketing_eventos
  FOR EACH ROW EXECUTE PROCEDURE public.marketing_eventos_audit();

ALTER TABLE public.marketing_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_eventos_select ON public.marketing_eventos;
CREATE POLICY marketing_eventos_select ON public.marketing_eventos
  FOR SELECT TO authenticated
  USING (
    public._galeria_fotos_perm('view')
    AND (ativo = true OR public._galeria_fotos_perm('edit'))
  );

DROP POLICY IF EXISTS marketing_eventos_insert ON public.marketing_eventos;
CREATE POLICY marketing_eventos_insert ON public.marketing_eventos
  FOR INSERT TO authenticated
  WITH CHECK (public._galeria_fotos_perm('create'));

DROP POLICY IF EXISTS marketing_eventos_update ON public.marketing_eventos;
CREATE POLICY marketing_eventos_update ON public.marketing_eventos
  FOR UPDATE TO authenticated
  USING (public._galeria_fotos_perm('edit'))
  WITH CHECK (public._galeria_fotos_perm('edit'));

DROP POLICY IF EXISTS marketing_eventos_delete ON public.marketing_eventos;
CREATE POLICY marketing_eventos_delete ON public.marketing_eventos
  FOR DELETE TO authenticated
  USING (public._galeria_fotos_perm('delete'));

DROP POLICY IF EXISTS marketing_fotos_select ON public.marketing_fotos;
CREATE POLICY marketing_fotos_select ON public.marketing_fotos
  FOR SELECT TO authenticated
  USING (
    (
      tipo = 'geral'
      AND public._galeria_fotos_perm('view')
    )
    OR (
      tipo = 'prestador'
      AND (
        public._galeria_fotos_perm('edit')
        OR public._galeria_fotos_perm('create')
        OR public._galeria_fotos_perm('delete')
      )
    )
  );

DROP POLICY IF EXISTS marketing_fotos_insert ON public.marketing_fotos;
CREATE POLICY marketing_fotos_insert ON public.marketing_fotos
  FOR INSERT TO authenticated
  WITH CHECK (public._galeria_fotos_perm('create'));

DROP POLICY IF EXISTS marketing_fotos_update ON public.marketing_fotos;
CREATE POLICY marketing_fotos_update ON public.marketing_fotos
  FOR UPDATE TO authenticated
  USING (public._galeria_fotos_perm('edit'))
  WITH CHECK (public._galeria_fotos_perm('edit'));

DROP POLICY IF EXISTS marketing_fotos_delete ON public.marketing_fotos;
CREATE POLICY marketing_fotos_delete ON public.marketing_fotos
  FOR DELETE TO authenticated
  USING (public._galeria_fotos_perm('delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_fotos TO authenticated;

COMMENT ON TABLE public.marketing_eventos IS 'Eventos da Galeria de Fotos (Marketing).';
COMMENT ON TABLE public.marketing_fotos IS 'Fotos gerais (públicas internas) e de prestadores (gestão Marketing; liberação futura via visivel_prestador).';
COMMENT ON COLUMN public.marketing_fotos.visivel_prestador IS 'Fase futura: quando true, o prestador vinculado poderá ver/baixar a foto.';

-- ─── Storage ────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-fotos-gerais',
  'marketing-fotos-gerais',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-fotos-prestadores',
  'marketing-fotos-prestadores',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS marketing_fotos_gerais_public_read ON storage.objects;
CREATE POLICY marketing_fotos_gerais_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'marketing-fotos-gerais');

DROP POLICY IF EXISTS marketing_fotos_gerais_auth_insert ON storage.objects;
CREATE POLICY marketing_fotos_gerais_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-fotos-gerais' AND public._galeria_fotos_perm('create'));

DROP POLICY IF EXISTS marketing_fotos_gerais_auth_delete ON storage.objects;
CREATE POLICY marketing_fotos_gerais_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-fotos-gerais' AND public._galeria_fotos_perm('delete'));

DROP POLICY IF EXISTS marketing_fotos_prestadores_storage_select ON storage.objects;
CREATE POLICY marketing_fotos_prestadores_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'marketing-fotos-prestadores'
    AND (
      public._galeria_fotos_perm('edit')
      OR public._galeria_fotos_perm('create')
      OR public._galeria_fotos_perm('delete')
    )
  );

DROP POLICY IF EXISTS marketing_fotos_prestadores_storage_insert ON storage.objects;
CREATE POLICY marketing_fotos_prestadores_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-fotos-prestadores' AND public._galeria_fotos_perm('create'));

DROP POLICY IF EXISTS marketing_fotos_prestadores_storage_delete ON storage.objects;
CREATE POLICY marketing_fotos_prestadores_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-fotos-prestadores' AND public._galeria_fotos_perm('delete'));

-- Permissões iniciais: Não para todos exceto admin (admin bypassa no app).

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'galeria_fotos', 'nao', 'nao', 'nao', 'nao'
FROM public.role_permissions
WHERE page_key = 'campanhas'
  AND role <> 'admin'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'galeria_fotos'
FROM public.gestor_tipo_pages
WHERE page_key = 'campanhas'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMIT;
