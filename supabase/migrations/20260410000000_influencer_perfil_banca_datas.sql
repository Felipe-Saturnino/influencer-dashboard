-- Datas de transição da conta banca (Banca de Jogo) em influencer_perfil
ALTER TABLE public.influencer_perfil
  ADD COLUMN IF NOT EXISTS banca_data_bloqueio timestamptz,
  ADD COLUMN IF NOT EXISTS banca_data_desbloqueio timestamptz;

COMMENT ON COLUMN public.influencer_perfil.banca_data_bloqueio IS 'Data/hora em que a conta da banca (operadora) passou para Bloqueada — independente de influencer_perfil.status.';
COMMENT ON COLUMN public.influencer_perfil.banca_data_desbloqueio IS 'Data/hora em que a conta da banca (operadora) passou para Liberada — independente de influencer_perfil.status.';
