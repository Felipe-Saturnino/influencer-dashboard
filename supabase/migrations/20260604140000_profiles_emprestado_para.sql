-- Gestão de Usuários (can_view = próprios): filtrar por responsável textual ("Emprestado para").

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emprestado_para text;

COMMENT ON COLUMN public.profiles.emprestado_para IS
  'Nome do responsável/vínculo (ex.: mesmo texto usado em Figurinos «Emprestado para»). Com permissão gestao_usuarios = próprios, o usuário só vê perfis cuja coluna coincide com o próprio name.';

COMMIT;
