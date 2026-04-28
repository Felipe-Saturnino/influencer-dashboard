-- Perfil Prestadores (áreas de atuação + páginas) e novos tipos de gestor (Shift Leader, Service Manager).

BEGIN;

-- profiles.role: aceitar perfil prestador
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'gestor', 'prestador', 'executivo', 'influencer', 'operador', 'agencia'));

-- role_permissions: aceitar perfil prestador
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN (
    'admin', 'gestor', 'executivo', 'influencer', 'operador', 'agencia', 'prestador'
  ));

-- gestor_tipo_pages: Shift Leader, Service Manager
ALTER TABLE public.gestor_tipo_pages
  DROP CONSTRAINT IF EXISTS gestor_tipo_pages_gestor_tipo_slug_check;
ALTER TABLE public.gestor_tipo_pages
  ADD CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check
  CHECK (gestor_tipo_slug IN (
    'operacoes',
    'marketing',
    'afiliados',
    'geral',
    'figurino',
    'recursos_humanos',
    'shift_leader',
    'service_manager'
  ));

COMMENT ON CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check ON public.gestor_tipo_pages IS
  'Tipos de gestor + Shift Leader + Service Manager (alinhado ao front GESTOR_TIPOS).';

-- user_scopes: prestador_tipo
ALTER TABLE public.user_scopes DROP CONSTRAINT IF EXISTS user_scopes_scope_type_check;
ALTER TABLE public.user_scopes
  ADD CONSTRAINT user_scopes_scope_type_check
  CHECK (scope_type IN (
    'influencer',
    'operadora',
    'agencia_par',
    'gestor_tipo',
    'prestador_tipo'
  ));

COMMENT ON CONSTRAINT user_scopes_scope_type_check ON public.user_scopes IS
  'Inclui prestador_tipo (áreas Customer Service, Game Presenter, Shuffler, Escritório).';

-- Páginas por área de prestador (configuráveis na aba Prestadores)
CREATE TABLE public.prestador_tipo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_tipo_slug text NOT NULL CHECK (prestador_tipo_slug IN (
    'customer_service',
    'game_presenter',
    'shuffler',
    'escritorio'
  )),
  page_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (prestador_tipo_slug, page_key)
);

CREATE INDEX idx_prestador_tipo_pages_slug ON public.prestador_tipo_pages(prestador_tipo_slug);

COMMENT ON TABLE public.prestador_tipo_pages IS
  'Páginas permitidas por área de atuação do perfil Prestadores. Várias áreas = união de page_key.';

ALTER TABLE public.prestador_tipo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em prestador_tipo_pages"
  ON public.prestador_tipo_pages
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Prestador leitura das suas áreas em prestador_tipo_pages"
  ON public.prestador_tipo_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'prestador_tipo'
        AND s.scope_ref = prestador_tipo_pages.prestador_tipo_slug
    )
  );

-- Permissões base do perfil Prestador = cópia do Gestor (menu refinado depois por prestador_tipo_pages)
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT 'prestador', g.page_key, g.can_view, g.can_criar, g.can_editar, g.can_excluir
FROM public.role_permissions g
WHERE g.role = 'gestor'
ON CONFLICT (role, page_key) DO NOTHING;

-- Seed inicial: cada área herda as páginas do tipo gestor "geral" (admin ajusta na aba Prestadores)
INSERT INTO public.prestador_tipo_pages (prestador_tipo_slug, page_key)
SELECT v.slug, gt.page_key
FROM public.gestor_tipo_pages gt
CROSS JOIN (
  VALUES
    ('customer_service'),
    ('game_presenter'),
    ('shuffler'),
    ('escritorio')
) AS v(slug)
WHERE gt.gestor_tipo_slug = 'geral'
ON CONFLICT (prestador_tipo_slug, page_key) DO NOTHING;

COMMIT;
