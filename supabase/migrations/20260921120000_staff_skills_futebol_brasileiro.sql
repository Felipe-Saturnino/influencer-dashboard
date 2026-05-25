-- Renomeia skill de estúdio: futebol_studio → futebol_brasileiro (produto Futebol Brasileiro).

UPDATE public.rh_funcionarios
SET staff_skills = (staff_skills - 'futebol_studio')
  || jsonb_build_object('futebol_brasileiro', staff_skills->'futebol_studio')
WHERE staff_skills ? 'futebol_studio';

COMMENT ON COLUMN public.rh_funcionarios.staff_skills IS
  'JSON por jogo: baccarat|blackjack|vip|roleta|futebol_brasileiro → ativo|treinamento|inativo.';
