-- ─── gestor_tipo_pages: páginas permitidas por tipo de gestor ─────────────────
-- Semelhante a operadora_pages: união das páginas quando o usuário tem vários tipos em user_scopes.

CREATE TABLE public.gestor_tipo_pages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_tipo_slug   text NOT NULL CHECK (gestor_tipo_slug IN ('operacoes', 'marketing', 'afiliados', 'geral')),
  page_key           text NOT NULL,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (gestor_tipo_slug, page_key)
);

CREATE INDEX idx_gestor_tipo_pages_slug ON public.gestor_tipo_pages(gestor_tipo_slug);

COMMENT ON TABLE public.gestor_tipo_pages IS 'Páginas que cada tipo de gestor pode acessar. Usuários com vários tipos veem a união das páginas configuradas.';

ALTER TABLE public.gestor_tipo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em gestor_tipo_pages"
  ON public.gestor_tipo_pages
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Gestor pode ler páginas dos seus tipos"
  ON public.gestor_tipo_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = auth.uid()
        AND s.scope_type = 'gestor_tipo'
        AND s.scope_ref = gestor_tipo_pages.gestor_tipo_slug
    )
  );
