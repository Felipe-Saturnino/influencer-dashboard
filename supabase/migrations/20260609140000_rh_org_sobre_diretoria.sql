-- RH Organograma: texto institucional da diretoria (antes diretor_sobre); foto do diretor descontinuada na UI.

BEGIN;

ALTER TABLE public.rh_org_diretorias
  RENAME COLUMN diretor_sobre TO sobre_diretoria;

COMMENT ON COLUMN public.rh_org_diretorias.sobre_diretoria IS 'Texto institucional sobre a diretoria.';
COMMENT ON COLUMN public.rh_org_diretorias.diretor_foto_url IS 'Legado — foto do diretor (UI removida); bucket rh-org-diretor-fotos.';

COMMIT;
