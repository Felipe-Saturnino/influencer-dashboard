-- Novas áreas de atuação do perfil Prestadores (Gestão de Usuários / aba Prestadores).

BEGIN;

ALTER TABLE public.prestador_tipo_pages
  DROP CONSTRAINT IF EXISTS prestador_tipo_pages_prestador_tipo_slug_check;

ALTER TABLE public.prestador_tipo_pages
  ADD CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check
  CHECK (prestador_tipo_slug IN (
    'customer_service',
    'game_presenter',
    'shuffler',
    'escritorio',
    'facilities',
    'financeiro',
    'tech_ops',
    'ti',
    'treinamento',
    'estudio'
  ));

COMMENT ON CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check ON public.prestador_tipo_pages IS
  'Áreas de atuação Prestadores (alinhar ao front PRESTADOR_TIPOS / PrestadorTipoSlug).';

-- Mesmo critério inicial das áreas legadas: páginas do tipo gestor «geral» (admin refina na aba Prestadores).
INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT v.slug, gt.page_key
FROM public.gestor_tipo_pages gt
CROSS JOIN (
  VALUES
    ('facilities'),
    ('financeiro'),
    ('tech_ops'),
    ('ti'),
    ('treinamento'),
    ('estudio')
) AS v(slug)
WHERE gt.gestor_tipo_slug = 'geral'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

-- Paridade com migration rh_portal: quem tem rh_dados_cadastro recebe rh_portal.
INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT ptp.prestador_tipo_slug, 'rh_portal'
FROM public.prestador_tipo_pages ptp
WHERE ptp.page_key = 'rh_dados_cadastro'
  AND ptp.prestador_tipo_slug IN (
    'facilities',
    'financeiro',
    'tech_ops',
    'ti',
    'treinamento',
    'estudio'
  )
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMIT;
