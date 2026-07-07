-- Pipeline B2B — data livre de último contato comercial por marca.

BEGIN;

ALTER TABLE public.comercial_marcas
  ADD COLUMN IF NOT EXISTS ultimo_contato date;

COMMENT ON COLUMN public.comercial_marcas.ultimo_contato IS
  'Data do último contato comercial com a marca — editável manualmente no Pipeline B2B.';

COMMIT;
