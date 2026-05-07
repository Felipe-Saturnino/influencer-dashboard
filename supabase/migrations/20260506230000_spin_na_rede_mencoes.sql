-- Spin na Rede — menções (RSS / agregador futuro); permissões espelham links_materiais + staff/prestador/investidor.

BEGIN;

-- ─── Permissão RLS (paridade Portal RH + staff Spin) ─────────────────────────

CREATE OR REPLACE FUNCTION public._spin_na_rede_perm(p_need text)
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
      OR public._gestor_page_perm('spin_na_rede', p_need)
      OR public._prestador_page_perm('spin_na_rede', p_need)
      OR public._staff_spin_page_perm('spin_na_rede', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'spin_na_rede'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._spin_na_rede_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._spin_na_rede_perm(text) TO authenticated;

-- ─── Tabela de menções ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.spin_na_rede_mencao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_url        text        NOT NULL,
  titulo          text        NOT NULL,
  resumo          text,
  published_at    timestamptz,
  feed_url        text,
  fonte_host      text,
  passou_filtro   boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spin_na_rede_mencao_item_url_unique UNIQUE (item_url)
);

CREATE INDEX IF NOT EXISTS idx_spin_na_rede_mencao_pub
  ON public.spin_na_rede_mencao (published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_spin_na_rede_mencao_filtro_pub
  ON public.spin_na_rede_mencao (passou_filtro, published_at DESC NULLS LAST);

COMMENT ON TABLE public.spin_na_rede_mencao IS
  'Menções públicas à Spin (RSS/agregador); ingestão via Edge Function (service role) ou edição com can_editar.';

CREATE OR REPLACE FUNCTION public.spin_na_rede_mencao_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spin_na_rede_mencao_updated ON public.spin_na_rede_mencao;
CREATE TRIGGER trg_spin_na_rede_mencao_updated
  BEFORE UPDATE ON public.spin_na_rede_mencao
  FOR EACH ROW EXECUTE PROCEDURE public.spin_na_rede_mencao_set_updated_at();

ALTER TABLE public.spin_na_rede_mencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY spin_na_rede_mencao_select ON public.spin_na_rede_mencao
  FOR SELECT TO authenticated
  USING (public._spin_na_rede_perm('view'));

CREATE POLICY spin_na_rede_mencao_insert ON public.spin_na_rede_mencao
  FOR INSERT TO authenticated
  WITH CHECK (public._spin_na_rede_perm('edit'));

CREATE POLICY spin_na_rede_mencao_update ON public.spin_na_rede_mencao
  FOR UPDATE TO authenticated
  USING (public._spin_na_rede_perm('edit'))
  WITH CHECK (public._spin_na_rede_perm('edit'));

CREATE POLICY spin_na_rede_mencao_delete ON public.spin_na_rede_mencao
  FOR DELETE TO authenticated
  USING (public._spin_na_rede_perm('delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spin_na_rede_mencao TO authenticated;

-- ─── role_permissions (base = links_materiais) ───────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'spin_na_rede', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'links_materiais'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.slug, 'spin_na_rede', g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
CROSS JOIN (
  VALUES
    ('shift_leader'),
    ('service_manager'),
    ('figurino'),
    ('rh')
) AS r(slug)
WHERE g.role = 'gestor' AND g.page_key = 'spin_na_rede'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'prestador', 'spin_na_rede', g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
WHERE g.role = 'gestor' AND g.page_key = 'spin_na_rede'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'investidor', 'spin_na_rede', g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
WHERE g.role = 'executivo' AND g.page_key = 'spin_na_rede'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- Gestor / prestador / operador: espelho de links_materiais (matrizes)

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'spin_na_rede'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'links_materiais'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT v.slug, 'spin_na_rede'
FROM (VALUES ('marketing'), ('geral')) AS v(slug)
WHERE NOT EXISTS (SELECT 1 FROM public.gestor_tipo_pages g WHERE g.page_key = 'spin_na_rede')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT ptp.prestador_tipo_slug, 'spin_na_rede'
FROM public.prestador_tipo_pages ptp
WHERE ptp.page_key = 'links_materiais'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT v.slug, 'spin_na_rede'
FROM (VALUES ('escritorio')) AS v(slug)
WHERE NOT EXISTS (SELECT 1 FROM public.prestador_tipo_pages p WHERE p.page_key = 'spin_na_rede')
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'spin_na_rede'
FROM public.operadora_pages op
WHERE op.page_key = 'links_materiais'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
