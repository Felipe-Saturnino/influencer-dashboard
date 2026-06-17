-- Revisão cadastral: cadastro em Gestão de Prestadores não substitui a primeira revisão em Dados de Cadastro.

BEGIN;

COMMENT ON COLUMN public.rh_funcionarios.cadastro_revisado_em IS
  'Última confirmação/atualização cadastral pelo próprio prestador (Dados de Cadastro). Ciclo de 6 meses. NULL: primeira revisão pendente no primeiro login — created_at do cadastro em Gestão de Prestadores não conta como revisão.';

COMMIT;
