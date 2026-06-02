-- Treinamento: escopo da aba Gestores (perfil Gestor), não da aba Prestadores.

BEGIN;

ALTER TABLE public.gestor_tipo_pages
  DROP CONSTRAINT IF EXISTS gestor_tipo_pages_gestor_tipo_slug_check;

ALTER TABLE public.gestor_tipo_pages
  ADD CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check
  CHECK (gestor_tipo_slug IN (
    'operacoes',
    'marketing',
    'afiliados',
    'geral',
    'treinamento'
  ));

COMMENT ON CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check ON public.gestor_tipo_pages IS
  'Tipos de gestor (Gestão de Usuários / aba Gestores). Inclui Treinamento (migrado de prestador_tipo).';

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT 'treinamento', page_key
FROM public.prestador_tipo_pages
WHERE prestador_tipo_slug = 'treinamento'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

DELETE FROM public.prestador_tipo_pages
WHERE prestador_tipo_slug = 'treinamento';

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
    'estudio'
  ));

COMMENT ON CONSTRAINT prestador_tipo_pages_prestador_tipo_slug_check ON public.prestador_tipo_pages IS
  'Áreas de atuação Prestadores (Gestão de Usuários / aba Prestadores). Treinamento → gestor_tipo.';

INSERT INTO public.user_scopes (user_id, scope_type, scope_ref)
SELECT us.user_id, 'gestor_tipo', 'treinamento'
FROM public.user_scopes us
WHERE us.scope_type = 'prestador_tipo'
  AND us.scope_ref = 'treinamento'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_scopes s2
    WHERE s2.user_id = us.user_id
      AND s2.scope_type = 'gestor_tipo'
      AND s2.scope_ref = 'treinamento'
  );

DELETE FROM public.user_scopes
WHERE scope_type = 'prestador_tipo'
  AND scope_ref = 'treinamento';

UPDATE public.profiles p
SET role = 'gestor'
WHERE p.role = 'prestador'
  AND EXISTS (
    SELECT 1
    FROM public.user_scopes s
    WHERE s.user_id = p.id
      AND s.scope_type = 'gestor_tipo'
      AND s.scope_ref = 'treinamento'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_scopes s
    WHERE s.user_id = p.id
      AND s.scope_type = 'prestador_tipo'
  );

COMMIT;
