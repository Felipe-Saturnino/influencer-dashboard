-- Página Afiliados (lista de perfis role=afiliado) + campo operacao em influencer_perfil.

BEGIN;

ALTER TABLE public.influencer_perfil ADD COLUMN IF NOT EXISTS operacao text;
COMMENT ON COLUMN public.influencer_perfil.operacao IS 'Texto livre de operação (cadastro afiliado / gestão).';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'afiliados', r.can_view, r.can_criar, r.can_editar, r.can_excluir
FROM public.role_permissions r
WHERE r.page_key = 'influencers'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT c.role, 'afiliados', c.can_view, c.can_criar, c.can_editar, c.can_excluir
FROM public.role_permissions c
WHERE c.page_key = 'campanhas'
  AND NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.page_key = 'afiliados' AND x.role = c.role)
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('afiliados', 'afiliados')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'afiliados'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'influencers'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT DISTINCT ptp.prestador_tipo_slug, 'afiliados'
FROM public.prestador_tipo_pages ptp
WHERE ptp.page_key = 'influencers'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'afiliados'
FROM public.operadora_pages op
WHERE op.page_key = 'influencers'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
