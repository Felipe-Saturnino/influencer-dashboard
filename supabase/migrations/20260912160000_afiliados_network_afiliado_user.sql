-- Vínculo Network → utilizador afiliado criado (profiles.id = auth.users.id).

BEGIN;

ALTER TABLE public.afiliados_network
  ADD COLUMN IF NOT EXISTS afiliado_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_afiliados_network_afiliado_user ON public.afiliados_network (afiliado_user_id);

COMMENT ON COLUMN public.afiliados_network.afiliado_user_id IS
  'Utilizador com perfil Afiliado criado a partir deste prospecto (função criar-afiliado-network).';

COMMIT;
