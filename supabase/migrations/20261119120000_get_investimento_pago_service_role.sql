-- =============================================================================
-- get_investimento_pago: permitir cron Relatório Diário (service_role)
-- A versão original devolvia total 0 quando auth.uid() IS NULL, o que zera o
-- Investimento de Streamers no e-mail (Edge autentica com service role).
-- Anônimo continua a receber 0. Página Streamers (JWT) inalterada.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_investimento_pago(
  p_inicio date,
  p_fim date,
  p_operadora_slug text DEFAULT NULL,
  p_influencer_ids uuid[] DEFAULT NULL,
  p_include_agentes boolean DEFAULT true
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
  v_role text;
BEGIN
  v_role := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
  IF auth.uid() IS NULL AND v_role IS DISTINCT FROM 'service_role' THEN
    RETURN jsonb_build_object('total', 0, 'por_influencer', '{}'::jsonb, 'agentes', 0);
  END IF;

  SELECT ARRAY_AGG(id) INTO v_ciclo_ids
  FROM ciclos_pagamento
  WHERE data_fim >= p_inicio AND data_fim <= p_fim;

  IF v_ciclo_ids IS NULL OR array_length(v_ciclo_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'por_influencer', '{}'::jsonb, 'agentes', 0);
  END IF;

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

  IF p_include_agentes THEN
    SELECT COALESCE(SUM(total), 0) INTO v_total_ag
    FROM pagamentos_agentes
    WHERE ciclo_id = ANY(v_ciclo_ids)
      AND status = 'pago'
      AND (p_operadora_slug IS NULL OR operadora_slug = p_operadora_slug);
  END IF;

  RETURN jsonb_build_object(
    'total', (v_total_inf + v_total_ag)::float,
    'por_influencer', v_por_inf,
    'agentes', v_total_ag::float
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_investimento_pago(date, date, text, uuid[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_investimento_pago(date, date, text, uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investimento_pago(date, date, text, uuid[], boolean) TO service_role;
