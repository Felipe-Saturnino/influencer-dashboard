-- Fase 9: aprovação mensal do Calendário — N saves → 1 RPC em lote.
-- Espelha a lógica de rh_calendario_presenca_gestao_salvar por item (jsonb array).

DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_salvar_lote(uuid, jsonb);

CREATE FUNCTION public.rh_calendario_presenca_gestao_salvar_lote(
  p_funcionario_id uuid,
  p_itens jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_dia date;
BEGIN
  IF NOT public._rh_calendario_pode_editar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar gestão de presença.';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN
    RAISE EXCEPTION 'p_itens deve ser um array JSON.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_itens)
  LOOP
    v_dia := nullif(trim(coalesce(v_item->>'dia_iso', '')), '')::date;
    IF v_dia IS NULL THEN
      RAISE EXCEPTION 'dia_iso obrigatório em cada item do lote.';
    END IF;

    PERFORM public.rh_calendario_presenca_gestao_salvar(
      p_funcionario_id,
      v_dia,
      v_item->>'status_gestao',
      CASE WHEN v_item ? 'correcao' THEN v_item->'correcao' ELSE NULL END,
      CASE WHEN v_item ? 'justificativa' THEN v_item->'justificativa' ELSE NULL END,
      coalesce(v_item->'historico', '[]'::jsonb)
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_salvar_lote(uuid, jsonb) IS
  'Salva vários dias de gestão de presença de um funcionário numa única chamada (aprovação mensal).';

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar_lote(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar_lote(uuid, jsonb) TO authenticated;
