-- Rastreia a última alteração do status cadastral (ativo / inativo / cancelado)
ALTER TABLE public.influencer_perfil
  ADD COLUMN IF NOT EXISTS status_alterado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.influencer_perfil.status_alterado_em IS 'Data/hora da última alteração de influencer_perfil.status.';
