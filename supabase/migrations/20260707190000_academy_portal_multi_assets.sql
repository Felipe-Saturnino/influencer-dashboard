-- Portal da Academy — múltiplos arquivos de imagem/vídeo e anexo por postagem

BEGIN;

ALTER TABLE public.academy_portal_comunicado
  ADD COLUMN IF NOT EXISTS imagem_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_nomes text[];

ALTER TABLE public.academy_portal_dica
  ADD COLUMN IF NOT EXISTS imagem_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_nomes text[];

ALTER TABLE public.academy_portal_manual
  ADD COLUMN IF NOT EXISTS imagem_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_storage_paths text[],
  ADD COLUMN IF NOT EXISTS anexo_nomes text[];

UPDATE public.academy_portal_comunicado
SET
  imagem_storage_paths = ARRAY[imagem_storage_path],
  anexo_storage_paths = ARRAY[anexo_storage_path],
  anexo_nomes = CASE WHEN anexo_nome IS NOT NULL THEN ARRAY[anexo_nome] ELSE NULL END
WHERE imagem_storage_path IS NOT NULL OR anexo_storage_path IS NOT NULL;

UPDATE public.academy_portal_dica
SET
  imagem_storage_paths = ARRAY[imagem_storage_path],
  anexo_storage_paths = ARRAY[anexo_storage_path],
  anexo_nomes = CASE WHEN anexo_nome IS NOT NULL THEN ARRAY[anexo_nome] ELSE NULL END
WHERE imagem_storage_path IS NOT NULL OR anexo_storage_path IS NOT NULL;

UPDATE public.academy_portal_manual
SET
  imagem_storage_paths = ARRAY[imagem_storage_path],
  anexo_storage_paths = ARRAY[anexo_storage_path],
  anexo_nomes = CASE WHEN anexo_nome IS NOT NULL THEN ARRAY[anexo_nome] ELSE NULL END
WHERE imagem_storage_path IS NOT NULL OR anexo_storage_path IS NOT NULL;

COMMENT ON COLUMN public.academy_portal_comunicado.imagem_storage_paths IS 'Paths no bucket academy-portal-assets (imagens/vídeos).';
COMMENT ON COLUMN public.academy_portal_comunicado.anexo_storage_paths IS 'Paths de anexos no bucket academy-portal-assets.';
COMMENT ON COLUMN public.academy_portal_comunicado.anexo_nomes IS 'Nomes originais dos anexos (paralelo a anexo_storage_paths).';

COMMIT;
