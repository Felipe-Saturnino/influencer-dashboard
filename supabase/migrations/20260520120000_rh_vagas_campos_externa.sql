-- Campos exclusivos de vagas externas (vídeo de apresentação e turno).

BEGIN;

ALTER TABLE public.rh_vagas
  ADD COLUMN IF NOT EXISTS necessario_video_apresentacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS necessario_turno boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rh_vagas.necessario_video_apresentacao IS 'Vaga externa: exige vídeo de apresentação do candidato.';
COMMENT ON COLUMN public.rh_vagas.necessario_turno IS 'Vaga externa: exige turno definido.';

COMMIT;
