-- ─── Streamers: substitui dash_overview, dash_conversao, dash_financeiro ───────
-- Uma única page_key "streamers" em role_permissions, operadora_pages, gestor_tipo_pages.
-- can_view agregado por role/slug/tipo: sim se qualquer antiga for sim; senão proprios se qualquer for proprios; senão nao.

BEGIN;

-- role_permissions
WITH merged AS (
  SELECT role,
    CASE
      WHEN BOOL_OR(can_view = 'sim') THEN 'sim'
      WHEN BOOL_OR(can_view = 'proprios') THEN 'proprios'
      ELSE 'nao'
    END AS can_view_merged
  FROM public.role_permissions
  WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro')
  GROUP BY role
)
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'streamers', can_view_merged, NULL, NULL, NULL
FROM merged
ON CONFLICT (role, page_key) DO UPDATE SET can_view = EXCLUDED.can_view;

DELETE FROM public.role_permissions
WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro');

-- operadora_pages
INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT operadora_slug, 'streamers'
FROM public.operadora_pages
WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro')
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

DELETE FROM public.operadora_pages
WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro');

-- gestor_tipo_pages
INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gestor_tipo_slug, 'streamers'
FROM public.gestor_tipo_pages
WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

DELETE FROM public.gestor_tipo_pages
WHERE page_key IN ('dash_overview', 'dash_conversao', 'dash_financeiro');

COMMIT;
