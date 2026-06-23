-- Portal RH — classificação normativa (Uso Interno, Uso Público, Confidencial)

BEGIN;

UPDATE public.rh_portal_documento
SET classificacao = 'uso_publico'
WHERE classificacao = 'publico_interno';

ALTER TABLE public.rh_portal_documento
  DROP CONSTRAINT IF EXISTS rh_portal_documento_classificacao_check;

ALTER TABLE public.rh_portal_documento
  ADD CONSTRAINT rh_portal_documento_classificacao_check
  CHECK (classificacao IS NULL OR classificacao IN ('uso_interno', 'uso_publico', 'confidencial'));

COMMIT;
