-- =============================================================================
-- FIX: Aprovar/Registrar pagamentos em ciclos legados (Fechado)
-- 
-- Se a aprovação não funciona (modal fecha mas status não muda), execute
-- este script no Supabase: Dashboard → SQL Editor → New query → Cole e Execute
-- =============================================================================

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
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado.');
  END IF;

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
    RETURN jsonb_build_object('ok', false, 'error', 'Registro não encontrado. Tente Recalcular no ciclo.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

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
    RETURN jsonb_build_object('ok', false, 'error', 'Registro não encontrado.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION aprovar_pagamento(uuid, numeric, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_pagamento(uuid, boolean) TO authenticated;
