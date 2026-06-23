-- Galeria de Fotos — evento opcional em fotos de colaborador; limite de upload 25 MB.

BEGIN;

ALTER TABLE public.marketing_fotos
  ALTER COLUMN evento_id DROP NOT NULL;

ALTER TABLE public.marketing_fotos
  DROP CONSTRAINT IF EXISTS marketing_fotos_prestador_vinculo;

ALTER TABLE public.marketing_fotos
  ADD CONSTRAINT marketing_fotos_tipo_vinculo CHECK (
    (
      tipo = 'geral'
      AND rh_funcionario_id IS NULL
      AND evento_id IS NOT NULL
    )
    OR (
      tipo = 'prestador'
      AND rh_funcionario_id IS NOT NULL
    )
  );

COMMENT ON COLUMN public.marketing_fotos.evento_id IS
  'Obrigatório para fotos gerais; opcional para fotos individuais de colaborador.';

UPDATE storage.buckets
SET file_size_limit = 26214400
WHERE id IN ('marketing-fotos-gerais', 'marketing-fotos-prestadores');

COMMIT;
