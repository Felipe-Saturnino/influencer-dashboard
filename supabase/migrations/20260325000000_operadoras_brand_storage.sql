-- ─── Operadoras: font_url + bucket Storage para brand ─────────────────────────
-- Permite upload de logo e fonte; URLs ficam em operadoras.logo_url e font_url.

ALTER TABLE operadoras
  ADD COLUMN IF NOT EXISTS font_url text;

COMMENT ON COLUMN operadoras.font_url IS 'URL da fonte customizada (ex: Supabase Storage)';

-- Bucket para assets de brand das operadoras (logo, fonte)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operadoras-brand',
  'operadoras-brand',
  true,
  5242880,
  ARRAY['image/png','image/jpeg','image/svg+xml','image/webp','font/woff2','font/woff','font/ttf']
)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer autenticado pode ler (bucket público)
CREATE POLICY "operadoras-brand public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'operadoras-brand');

-- Política: autenticados podem fazer upload (Gestão de Operadoras é restrita a admin)
CREATE POLICY "operadoras-brand authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'operadoras-brand');

-- Política: autenticados podem atualizar/remover (para substituir arquivos)
CREATE POLICY "operadoras-brand authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'operadoras-brand');

CREATE POLICY "operadoras-brand authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'operadoras-brand');
