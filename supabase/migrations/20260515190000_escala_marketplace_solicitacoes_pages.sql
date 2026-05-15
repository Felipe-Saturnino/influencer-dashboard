-- Secção Escala: page_keys `escala_marketplace_turnos` e `escala_solicitacoes`.
-- Paridade de permissões com `rh_calendario` (role_permissions, gestor_tipo_pages, prestador_tipo_pages, operadora_pages).

BEGIN;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'escala_marketplace_turnos', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_calendario'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'escala_solicitacoes', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_calendario'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_criar = EXCLUDED.can_criar,
  can_editar = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'escala_marketplace_turnos'
FROM public.gestor_tipo_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gestor_tipo_slug, 'escala_solicitacoes'
FROM public.gestor_tipo_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT prestador_tipo_slug, 'escala_marketplace_turnos'
FROM public.prestador_tipo_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT prestador_tipo_slug, 'escala_solicitacoes'
FROM public.prestador_tipo_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT operadora_slug, 'escala_marketplace_turnos'
FROM public.operadora_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT operadora_slug, 'escala_solicitacoes'
FROM public.operadora_pages
WHERE page_key = 'rh_calendario'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
