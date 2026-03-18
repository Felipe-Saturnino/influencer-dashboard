-- =============================================================================
-- MIGRAÇÃO: aplicar_mapeamento_utm — Agregar múltiplas UTMs por influencer
-- Ao mapear uma UTM, re-agrega TODAS as UTMs do influencer naquela operadora
-- e faz upsert em influencer_metricas com a SOMA (não sobrescreve).
-- Execute no Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION aplicar_mapeamento_utm(
  p_utm_source text,
  p_influencer_id uuid
)
RETURNS TABLE (linhas_copiadas bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count bigint;
  v_operadora text;
BEGIN
  -- 1. Obter operadora_slug da UTM (utm_metricas_diarias ou utm_aliases)
  SELECT COALESCE(
    (SELECT operadora_slug FROM utm_metricas_diarias WHERE utm_source = p_utm_source LIMIT 1),
    (SELECT COALESCE(operadora_slug, 'casa_apostas') FROM utm_aliases WHERE utm_source = p_utm_source LIMIT 1),
    'casa_apostas'
  ) INTO v_operadora;

  -- 2. Atualizar influencer_id nas linhas diárias desta UTM
  UPDATE utm_metricas_diarias
  SET influencer_id = p_influencer_id
  WHERE utm_source = p_utm_source;

  -- 3. Agregar TODAS as UTMs que mapeiam para este influencer nesta operadora
  --    (soma por data) e upsert em influencer_metricas
  WITH utms_do_influencer AS (
    SELECT ua.utm_source
    FROM utm_aliases ua
    WHERE ua.influencer_id = p_influencer_id
      AND ua.status = 'mapeado'
      AND COALESCE(ua.operadora_slug, 'casa_apostas') = v_operadora
    UNION
    SELECT ip.utm_source
    FROM influencer_perfil ip
    WHERE ip.id = p_influencer_id AND ip.utm_source IS NOT NULL
  ),
  metricas_agregadas AS (
    SELECT
      m.data,
      SUM(m.visit_count)::integer AS visit_count,
      SUM(m.registration_count)::integer AS registration_count,
      SUM(m.ftd_count)::integer AS ftd_count,
      SUM(m.ftd_total)::numeric(14,2) AS ftd_total,
      SUM(m.deposit_count)::integer AS deposit_count,
      SUM(m.deposit_total)::numeric(14,2) AS deposit_total,
      SUM(m.withdrawal_count)::integer AS withdrawal_count,
      SUM(m.withdrawal_total)::numeric(14,2) AS withdrawal_total,
      MAX(m.fonte) AS fonte
    FROM utm_metricas_diarias m
    INNER JOIN utms_do_influencer u ON u.utm_source = m.utm_source
    WHERE COALESCE(m.operadora_slug, 'casa_apostas') = v_operadora
    GROUP BY m.data
  )
  INSERT INTO influencer_metricas (
    influencer_id, data, operadora_slug,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  )
  SELECT
    p_influencer_id, data, v_operadora,
    visit_count, registration_count, ftd_count, ftd_total,
    deposit_count, deposit_total, withdrawal_count, withdrawal_total, fonte
  FROM metricas_agregadas
  ON CONFLICT (influencer_id, data, operadora_slug)
  DO UPDATE SET
    visit_count = EXCLUDED.visit_count,
    registration_count = EXCLUDED.registration_count,
    ftd_count = EXCLUDED.ftd_count,
    ftd_total = EXCLUDED.ftd_total,
    deposit_count = EXCLUDED.deposit_count,
    deposit_total = EXCLUDED.deposit_total,
    withdrawal_count = EXCLUDED.withdrawal_count,
    withdrawal_total = EXCLUDED.withdrawal_total;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION aplicar_mapeamento_utm IS 'Aplica mapeamento UTM→influencer: atualiza utm_metricas_diarias e copia para influencer_metricas. Agrega TODAS as UTMs do influencer na operadora (soma). Chamar após UPDATE em utm_aliases.';
