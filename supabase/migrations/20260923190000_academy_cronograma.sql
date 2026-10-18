-- Academy — Cronograma (catálogo próprio: cronogramas, trilhas, materiais, provas).
-- Sem vínculo com Portal da Academy, Performance Hub, mesas_spin ou financeiro.

BEGIN;

-- ─── Permissão ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._academy_cronograma_perm(p_need text)
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
      OR public._gestor_page_perm('academy_cronograma', p_need)
      OR public._prestador_page_perm('academy_cronograma', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'academy_cronograma'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._academy_cronograma_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._academy_cronograma_perm(text) TO authenticated;

-- ─── Tabelas ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_cronograma (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text        NOT NULL,
  descricao       text,
  duracao_dias    int         NOT NULL CHECK (duracao_dias >= 1),
  status          text        NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('publicado', 'arquivado')),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_status_nome
  ON public.academy_cronograma (status, nome);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_trilha (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text        NOT NULL,
  tipo            text        NOT NULL
    CHECK (tipo IN ('institucional', 'jogo', 'operacao', 'pratica')),
  jogo            text,
  descricao       text        NOT NULL,
  status          text        NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('publicado', 'arquivado')),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_cronograma_trilha_jogo_ck
    CHECK (tipo <> 'jogo' OR (jogo IS NOT NULL AND length(trim(jogo)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_trilha_status_nome
  ON public.academy_cronograma_trilha (status, nome);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id   uuid        NOT NULL REFERENCES public.academy_cronograma (id) ON DELETE CASCADE,
  trilha_id       uuid        NOT NULL REFERENCES public.academy_cronograma_trilha (id) ON DELETE RESTRICT,
  ordem           int         NOT NULL CHECK (ordem >= 1),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_cronograma_item_unico UNIQUE (cronograma_id, trilha_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_item_ordem
  ON public.academy_cronograma_item (cronograma_id, ordem);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_material (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo               text        NOT NULL,
  tipo                 text        NOT NULL
    CHECK (tipo IN ('pdf', 'video', 'apresentacao')),
  introducao           text        NOT NULL,
  status               text        NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('publicado', 'arquivado')),
  arquivo_storage_path text,
  arquivo_nome         text,
  versao               text        NOT NULL DEFAULT '1.0',
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_material_status
  ON public.academy_cronograma_material (status, titulo);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_trilha_material (
  trilha_id    uuid NOT NULL REFERENCES public.academy_cronograma_trilha (id) ON DELETE CASCADE,
  material_id  uuid NOT NULL REFERENCES public.academy_cronograma_material (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trilha_id, material_id)
);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_prova (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text        NOT NULL,
  nota_minima     int         NOT NULL CHECK (nota_minima >= 0 AND nota_minima <= 100),
  status          text        NOT NULL DEFAULT 'publicado'
    CHECK (status IN ('publicado', 'arquivado')),
  questoes        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_prova_status
  ON public.academy_cronograma_prova (status, nome);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_trilha_prova (
  trilha_id   uuid NOT NULL REFERENCES public.academy_cronograma_trilha (id) ON DELETE CASCADE,
  prova_id    uuid NOT NULL REFERENCES public.academy_cronograma_prova (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trilha_id, prova_id)
);

CREATE TABLE IF NOT EXISTS public.academy_cronograma_historico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo   text NOT NULL CHECK (entidade_tipo IN ('cronograma', 'trilha', 'material', 'prova')),
  entidade_id     uuid NOT NULL,
  acao            text NOT NULL,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_cronograma_historico_entidade
  ON public.academy_cronograma_historico (entidade_tipo, entidade_id, created_at DESC);

-- ─── Audit ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.academy_cronograma_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_cronograma_audit ON public.academy_cronograma;
CREATE TRIGGER trg_academy_cronograma_audit
  BEFORE INSERT OR UPDATE ON public.academy_cronograma
  FOR EACH ROW EXECUTE PROCEDURE public.academy_cronograma_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_cronograma_trilha_audit ON public.academy_cronograma_trilha;
CREATE TRIGGER trg_academy_cronograma_trilha_audit
  BEFORE INSERT OR UPDATE ON public.academy_cronograma_trilha
  FOR EACH ROW EXECUTE PROCEDURE public.academy_cronograma_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_cronograma_material_audit ON public.academy_cronograma_material;
CREATE TRIGGER trg_academy_cronograma_material_audit
  BEFORE INSERT OR UPDATE ON public.academy_cronograma_material
  FOR EACH ROW EXECUTE PROCEDURE public.academy_cronograma_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_cronograma_prova_audit ON public.academy_cronograma_prova;
CREATE TRIGGER trg_academy_cronograma_prova_audit
  BEFORE INSERT OR UPDATE ON public.academy_cronograma_prova
  FOR EACH ROW EXECUTE PROCEDURE public.academy_cronograma_touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.academy_cronograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_trilha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_trilha_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_trilha_prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_cronograma_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_cronograma_select ON public.academy_cronograma
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_insert ON public.academy_cronograma
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('create'));
CREATE POLICY academy_cronograma_update ON public.academy_cronograma
  FOR UPDATE TO authenticated
  USING (public._academy_cronograma_perm('edit')) WITH CHECK (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_trilha_select ON public.academy_cronograma_trilha
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_trilha_insert ON public.academy_cronograma_trilha
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('create'));
CREATE POLICY academy_cronograma_trilha_update ON public.academy_cronograma_trilha
  FOR UPDATE TO authenticated
  USING (public._academy_cronograma_perm('edit')) WITH CHECK (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_item_select ON public.academy_cronograma_item
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_item_insert ON public.academy_cronograma_item
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('edit'));
CREATE POLICY academy_cronograma_item_update ON public.academy_cronograma_item
  FOR UPDATE TO authenticated
  USING (public._academy_cronograma_perm('edit')) WITH CHECK (public._academy_cronograma_perm('edit'));
CREATE POLICY academy_cronograma_item_delete ON public.academy_cronograma_item
  FOR DELETE TO authenticated USING (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_material_select ON public.academy_cronograma_material
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_material_insert ON public.academy_cronograma_material
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('create'));
CREATE POLICY academy_cronograma_material_update ON public.academy_cronograma_material
  FOR UPDATE TO authenticated
  USING (public._academy_cronograma_perm('edit')) WITH CHECK (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_trilha_material_select ON public.academy_cronograma_trilha_material
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_trilha_material_insert ON public.academy_cronograma_trilha_material
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('edit'));
CREATE POLICY academy_cronograma_trilha_material_delete ON public.academy_cronograma_trilha_material
  FOR DELETE TO authenticated USING (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_prova_select ON public.academy_cronograma_prova
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_prova_insert ON public.academy_cronograma_prova
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('create'));
CREATE POLICY academy_cronograma_prova_update ON public.academy_cronograma_prova
  FOR UPDATE TO authenticated
  USING (public._academy_cronograma_perm('edit')) WITH CHECK (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_trilha_prova_select ON public.academy_cronograma_trilha_prova
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_trilha_prova_insert ON public.academy_cronograma_trilha_prova
  FOR INSERT TO authenticated WITH CHECK (public._academy_cronograma_perm('edit'));
CREATE POLICY academy_cronograma_trilha_prova_delete ON public.academy_cronograma_trilha_prova
  FOR DELETE TO authenticated USING (public._academy_cronograma_perm('edit'));

CREATE POLICY academy_cronograma_historico_select ON public.academy_cronograma_historico
  FOR SELECT TO authenticated USING (public._academy_cronograma_perm('view'));
CREATE POLICY academy_cronograma_historico_insert ON public.academy_cronograma_historico
  FOR INSERT TO authenticated WITH CHECK (
    public._academy_cronograma_perm('create') OR public._academy_cronograma_perm('edit')
  );

GRANT SELECT, INSERT, UPDATE ON public.academy_cronograma TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_cronograma_trilha TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_cronograma_item TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_cronograma_material TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.academy_cronograma_trilha_material TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_cronograma_prova TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.academy_cronograma_trilha_prova TO authenticated;
GRANT SELECT, INSERT ON public.academy_cronograma_historico TO authenticated;

-- ─── Storage ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-cronograma-materiais',
  'academy-cronograma-materiais',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/quicktime'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY academy_cronograma_materiais_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'academy-cronograma-materiais' AND public._academy_cronograma_perm('view'));

CREATE POLICY academy_cronograma_materiais_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-cronograma-materiais'
    AND (public._academy_cronograma_perm('create') OR public._academy_cronograma_perm('edit'))
  );

CREATE POLICY academy_cronograma_materiais_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academy-cronograma-materiais'
    AND public._academy_cronograma_perm('edit')
  )
  WITH CHECK (
    bucket_id = 'academy-cronograma-materiais'
    AND public._academy_cronograma_perm('edit')
  );

CREATE POLICY academy_cronograma_materiais_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-cronograma-materiais'
    AND public._academy_cronograma_perm('edit')
  );

-- ─── Permissões iniciais (bloqueadas exceto admin via código) ────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'academy_cronograma', 'nao', 'nao', 'nao', 'nao'
FROM public.role_permissions rp
WHERE rp.role IS DISTINCT FROM 'admin'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

COMMIT;
