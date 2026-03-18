-- =============================================================================
-- RPC: aprovar_pagamento e registrar_pagamento
-- Contorna possíveis bloqueios de RLS em ciclos legados.
-- Executa com privilégios elevados mas exige usuário autenticado.
-- =============================================================================

-- Aprovar pagamento (em_analise → a_pagar)
CREATE OR REPLACE FUNCTION aprovar_pagamento(
  p_id uuid,
  p_total numeric,
  p_is_agente boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_tb text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado.');
  END IF;

  v_tb := CASE WHEN p_is_agente THEN 'pagamentos_agentes' ELSE 'pagamentos' END;

  IF p_is_agente THEN
    UPDATE pagamentos_agentes
    SET status = 'a_pagar', total = p_total
    WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    UPDATE pagamentos
    SET status = 'a_pagar', total = p_total
    WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registro não encontrado ou sem permissão. Tente Recarregar no ciclo.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Registrar pagamento (a_pagar → pago)
CREATE OR REPLACE FUNCTION registrar_pagamento(
  p_id uuid,
  p_is_agente boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado.');
  END IF;

  IF p_is_agente THEN
    UPDATE pagamentos_agentes
    SET status = 'pago', pago_em = now()
    WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    UPDATE pagamentos
    SET status = 'pago', pago_em = now()
    WHERE id = p_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registro não encontrado ou sem permissão.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Conceder execução para usuários autenticados
GRANT EXECUTE ON FUNCTION aprovar_pagamento(uuid, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_pagamento(uuid, boolean) TO authenticated;
