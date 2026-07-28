-- Alinha a permissão de gravação de presença com a UI (Editar sim|proprios + escopo).
-- edit=sim: qualquer funcionário no escopo de Ver.
-- edit=proprios: liderados (gerenciáveis) ou o próprio (justificativa em Meu Controle).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_editar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public._rh_calendario_permissao_valor('edit')
    WHEN 'sim' THEN public._rh_calendario_pode_acessar_funcionario(p_funcionario_id)
    WHEN 'proprios' THEN (
      p_funcionario_id = public._rh_funcionario_login_id()
      OR EXISTS (
        SELECT 1
        FROM public.rh_calendario_funcionarios_gerenciaveis() g
        WHERE g.funcionario_id = p_funcionario_id
      )
    )
    ELSE false
  END
$$;

COMMENT ON FUNCTION public._rh_calendario_pode_editar_funcionario(uuid) IS
  'Calendário: pode gravar presença/aprovação do funcionário (Editar sim no escopo de Ver; Editar proprios = gerenciáveis ou o próprio).';

-- Recria a RPC de save com a mesma assinatura e row_security off (tabela sem policy para authenticated).
DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb);

CREATE FUNCTION public.rh_calendario_presenca_gestao_salvar(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_status_gestao text,
  p_correcao jsonb,
  p_justificativa jsonb,
  p_historico jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_dia_registro date;
  v_j jsonb;
BEGIN
  IF NOT public._rh_calendario_pode_editar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar gestão de presença.'
      USING ERRCODE = '42501';
  END IF;

  IF p_status_gestao IS NOT NULL AND p_status_gestao NOT IN ('aprovado', 'em_analise') THEN
    RAISE EXCEPTION 'status_gestao inválido.';
  END IF;

  v_j := p_justificativa;
  IF v_j IS NOT NULL AND coalesce(v_j->>'motivo', '') = 'medico' THEN
    v_dia_registro := coalesce(
      nullif(trim(coalesce(v_j->>'atestadoDiaRegistro', '')), '')::date,
      p_dia_iso
    );
    v_j := jsonb_set(v_j, '{atestadoDiaRegistro}', to_jsonb(v_dia_registro::text));
  END IF;

  INSERT INTO public.rh_calendario_presenca_gestao (
    funcionario_id, dia_iso, status_gestao, correcao, justificativa, historico, updated_at
  )
  VALUES (
    p_funcionario_id, p_dia_iso, p_status_gestao, p_correcao, v_j,
    coalesce(p_historico, '[]'::jsonb), now()
  )
  ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
    status_gestao = EXCLUDED.status_gestao,
    correcao = EXCLUDED.correcao,
    justificativa = EXCLUDED.justificativa,
    historico = EXCLUDED.historico,
    updated_at = now();

  IF v_j IS NOT NULL
    AND coalesce(v_j->>'motivo', '') = 'medico'
    AND p_dia_iso = v_dia_registro
  THEN
    PERFORM public._rh_solicitacao_sync_calendario_atestado(
      p_funcionario_id,
      p_dia_iso,
      v_j
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) IS
  'Persiste gestão de presença do dia (aprovação, correção, justificativa, histórico). Exige Editar no Calendário.';

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) TO authenticated;

COMMIT;
