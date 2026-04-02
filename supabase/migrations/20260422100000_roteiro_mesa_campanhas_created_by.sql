-- Quem cadastrou a campanha (ex.: Central de Notificações: "Cadastrado por … em …").
ALTER TABLE public.roteiro_mesa_campanhas
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.roteiro_mesa_campanhas.created_by IS 'Usuário que criou o registro (preenchido pelo app no insert).';
