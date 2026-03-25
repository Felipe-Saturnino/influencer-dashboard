-- Status da conta na banca (operadora): separado de influencer_perfil.status (ativo/inativo/cancelado).
ALTER TABLE public.influencer_perfil
  ADD COLUMN IF NOT EXISTS banca_status_conta text NOT NULL DEFAULT 'liberada';

ALTER TABLE public.influencer_perfil DROP CONSTRAINT IF EXISTS influencer_perfil_banca_status_conta_check;
ALTER TABLE public.influencer_perfil
  ADD CONSTRAINT influencer_perfil_banca_status_conta_check
  CHECK (banca_status_conta IN ('liberada', 'bloqueada'));

COMMENT ON COLUMN public.influencer_perfil.banca_status_conta IS 'Conta da banca na operadora: liberada | bloqueada. Não confundir com status do cadastro do influencer (ativo/inativo/cancelado).';
