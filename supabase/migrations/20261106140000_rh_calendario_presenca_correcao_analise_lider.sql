-- Correção de presença: análise (aprovar/rejeitar) só pelo líder / Editar — nunca pelo próprio.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_analisar_correcao_presenca(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_funcionario_id IS NULL THEN false
    -- Próprio nunca analisa a própria correção (esquecimento / correção de horário).
    WHEN p_funcionario_id = public._rh_funcionario_login_id() THEN false
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

COMMENT ON FUNCTION public._rh_calendario_pode_analisar_correcao_presenca(uuid) IS
  'Calendário: aprovar/rejeitar correção de presença — líder (gerenciáveis) ou Editar sim; nunca o próprio.';

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_gestao_salvar(
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
  v_c jsonb;
  v_prev jsonb;
  v_analisando boolean := false;
BEGIN
  IF NOT public._rh_calendario_pode_editar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar gestão de presença.'
      USING ERRCODE = '42501';
  END IF;

  IF p_status_gestao IS NOT NULL AND p_status_gestao NOT IN ('aprovado', 'em_analise') THEN
    RAISE EXCEPTION 'status_gestao inválido.';
  END IF;

  v_c := p_correcao;
  IF v_c IS NOT NULL THEN
    SELECT g.correcao INTO v_prev
    FROM public.rh_calendario_presenca_gestao g
    WHERE g.funcionario_id = p_funcionario_id AND g.dia_iso = p_dia_iso;

    -- Detecta decisão de análise (campo ou legado) que não estava no registro anterior.
    IF coalesce(v_c->>'analiseStatus', '') IN ('aprovada', 'recusada')
      AND coalesce(v_prev->>'analiseStatus', 'pendente') IS DISTINCT FROM coalesce(v_c->>'analiseStatus', '')
    THEN
      v_analisando := true;
    END IF;
    IF coalesce(v_c->>'entradaAnaliseStatus', '') IN ('aprovada', 'recusada')
      AND coalesce(v_prev->>'entradaAnaliseStatus', 'pendente') IS DISTINCT FROM coalesce(v_c->>'entradaAnaliseStatus', '')
    THEN
      v_analisando := true;
    END IF;
    IF coalesce(v_c->>'saidaAnaliseStatus', '') IN ('aprovada', 'recusada')
      AND coalesce(v_prev->>'saidaAnaliseStatus', 'pendente') IS DISTINCT FROM coalesce(v_c->>'saidaAnaliseStatus', '')
    THEN
      v_analisando := true;
    END IF;

    IF v_analisando AND NOT public._rh_calendario_pode_analisar_correcao_presenca(p_funcionario_id) THEN
      RAISE EXCEPTION 'Somente o líder imediato pode analisar a correção de presença.'
        USING ERRCODE = '42501';
    END IF;
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
  'Persiste gestão de presença do dia. Análise de correção exige líder (não o próprio).';

REVOKE ALL ON FUNCTION public._rh_calendario_pode_analisar_correcao_presenca(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_calendario_pode_analisar_correcao_presenca(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) TO authenticated;

COMMIT;
