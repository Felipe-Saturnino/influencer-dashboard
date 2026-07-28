-- Presença: gravar o próprio calendário com Ver (justificativa / Meu Controle),
-- além de Editar no escopo (líderes / admin). Alinha UI Meu Controle.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_editar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Próprio cadastro: Ver no Calendário basta (justificar falta, etc. em Meu Controle).
    WHEN p_funcionario_id IS NOT NULL
      AND p_funcionario_id = public._rh_funcionario_login_id()
      AND public._rh_calendario_permissao_valor('view') IN ('sim', 'proprios')
      THEN true
    WHEN public._rh_calendario_permissao_valor('edit') = 'sim'
      THEN public._rh_calendario_pode_acessar_funcionario(p_funcionario_id)
    WHEN public._rh_calendario_permissao_valor('edit') = 'proprios'
      THEN EXISTS (
        SELECT 1
        FROM public.rh_calendario_funcionarios_gerenciaveis() g
        WHERE g.funcionario_id = p_funcionario_id
      )
    ELSE false
  END
$$;

COMMENT ON FUNCTION public._rh_calendario_pode_editar_funcionario(uuid) IS
  'Calendário: gravação de presença — próprio com Ver; Editar sim no escopo de Ver; Editar proprios = gerenciáveis.';

COMMIT;
