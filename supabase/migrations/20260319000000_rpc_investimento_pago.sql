-- =============================================================================
-- RPC: get_investimento_pago
-- Calcula investimento (pagamentos + pagamentos_agentes) com status pago
-- em ciclos cujo data_fim está no período. Garante alinhamento Financeiro/Dashboard.
-- Executa no servidor para evitar divergências com pagamentos_agentes.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_investimento_pago(
  p_inicio date,
  p_fim date,
  p_operadora_slug text DEFAULT NULL,
  p_influencer_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo_ids uuid[];
  v_total_inf numeric := 0;
  v_total_ag numeric := 0;
  v_por_inf jsonb := '{}';
  v_row record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'por_influencer', '{}'::jsonb);
  END IF;

  SELECT ARRAY_AGG(id) INTO v_ciclo_ids
  FROM ciclos_pagamento
  WHERE data_fim >= p_inicio AND data_fim <= p_fim;

  IF v_ciclo_ids IS NULL OR array_length(v_ciclo_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'por_influencer', '{}'::jsonb);
  END IF;

  -- Pagamentos de influencers (status = pago)
  FOR v_row IN
    SELECT influencer_id, COALESCE(SUM(total), 0) AS s
    FROM pagamentos
    WHERE ciclo_id = ANY(v_ciclo_ids)
      AND status = 'pago'
      AND (p_operadora_slug IS NULL OR operadora_slug = p_operadora_slug)
      AND (p_influencer_ids IS NULL OR influencer_id = ANY(p_influencer_ids))
    GROUP BY influencer_id
  LOOP
    v_total_inf := v_total_inf + v_row.s;
    v_por_inf := v_por_inf || jsonb_build_object(v_row.influencer_id::text, (v_row.s)::float);
  END LOOP;

  -- Pagamentos de agentes (status = pago)
  SELECT COALESCE(SUM(total), 0) INTO v_total_ag
  FROM pagamentos_agentes
  WHERE ciclo_id = ANY(v_ciclo_ids)
    AND status = 'pago'
    AND (p_operadora_slug IS NULL OR operadora_slug = p_operadora_slug);

  RETURN jsonb_build_object(
    'total', (v_total_inf + v_total_ag)::float,
    'por_influencer', v_por_inf
  );
END;
$$;
