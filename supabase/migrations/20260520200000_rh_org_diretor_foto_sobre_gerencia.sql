-- RH Organograma: foto e texto do diretor(a); texto sobre gerência; bucket público de fotos.

BEGIN;

ALTER TABLE public.rh_org_diretorias
  ADD COLUMN IF NOT EXISTS diretor_foto_url text,
  ADD COLUMN IF NOT EXISTS diretor_sobre text NOT NULL DEFAULT '';

ALTER TABLE public.rh_org_gerencias
  ADD COLUMN IF NOT EXISTS sobre_gerencia text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.rh_org_diretorias.diretor_foto_url IS 'URL pública da foto do diretor (storage rh-org-diretor-fotos).';
COMMENT ON COLUMN public.rh_org_diretorias.diretor_sobre IS 'Texto institucional sobre o diretor(a).';
COMMENT ON COLUMN public.rh_org_gerencias.sobre_gerencia IS 'Texto institucional sobre a gerência.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-org-diretor-fotos',
  'rh-org-diretor-fotos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rh_org_diretor_fotos public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'rh-org-diretor-fotos');

CREATE POLICY "rh_org_diretor_fotos authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rh-org-diretor-fotos');

CREATE POLICY "rh_org_diretor_fotos authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'rh-org-diretor-fotos');

CREATE POLICY "rh_org_diretor_fotos authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rh-org-diretor-fotos');

COMMIT;
