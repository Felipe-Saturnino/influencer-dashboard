-- Links gerados na aba Geração de Links (Marketing → Campanhas).
-- Status Ativo/Inativo na UI = houve métricas (resultados) nos últimos 30 dias — derivado, não coluna.

CREATE TABLE IF NOT EXISTS public.campanha_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source text NOT NULL,
  operadora_slug text NOT NULL REFERENCES public.operadoras(slug),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campanha_links_utm_operadora_unique UNIQUE (utm_source, operadora_slug)
);

CREATE INDEX IF NOT EXISTS idx_campanha_links_operadora ON public.campanha_links (operadora_slug);
CREATE INDEX IF NOT EXISTS idx_campanha_links_created_at ON public.campanha_links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campanha_links_created_by ON public.campanha_links (created_by);

COMMENT ON TABLE public.campanha_links IS 'Links UTM gerados manualmente em Campanhas → Geração de Links.';
COMMENT ON COLUMN public.campanha_links.utm_source IS 'Valor do utm_source do link gerado.';
COMMENT ON COLUMN public.campanha_links.created_by IS 'Usuário que criou o link (profiles.id).';

ALTER TABLE public.campanha_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read campanha_links" ON public.campanha_links;
CREATE POLICY "Allow authenticated read campanha_links" ON public.campanha_links
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert campanha_links" ON public.campanha_links;
CREATE POLICY "Allow authenticated insert campanha_links" ON public.campanha_links
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update campanha_links" ON public.campanha_links;
CREATE POLICY "Allow authenticated update campanha_links" ON public.campanha_links
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete campanha_links" ON public.campanha_links;
CREATE POLICY "Allow authenticated delete campanha_links" ON public.campanha_links
  FOR DELETE TO authenticated USING (true);
