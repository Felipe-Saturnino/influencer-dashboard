-- Pipeline B2B — agregadora de plataforma por marca.

BEGIN;

ALTER TABLE public.comercial_marcas
  ADD COLUMN IF NOT EXISTS agregadora text
  CHECK (
    agregadora IS NULL
    OR agregadora IN (
      'Alea',
      'BetConstruct',
      'Cactus',
      'Cometa Gaming',
      'Playtech',
      'SoftSwiss'
    )
  );

COMMENT ON COLUMN public.comercial_marcas.agregadora IS
  'Agregadora de plataforma da marca — editável no Pipeline B2B (seleção única).';

COMMIT;
