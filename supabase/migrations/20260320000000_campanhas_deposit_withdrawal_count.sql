-- =============================================================================
-- MIGRAÇÃO: Adicionar deposit_count e withdrawal_count no get_campanhas_performance
-- Alinha ao padrão do Overview Influencers — tabela Campanhas no Dashboard de Mídias
-- utm_metricas_diarias já possui essas colunas; apenas incluímos no RPC.
-- PostgreSQL não permite alterar tipo de retorno com CREATE OR REPLACE → DROP primeiro.
-- =============================================================================

DROP FUNCTION IF EXISTS get_campanhas_performance(date, date, text);

CREATE FUNCTION get_campanhas_performance(
  p_data_inicio date,
  p_data_fim date,
  p_operadora_slug text DEFAULT NULL
)
RETURNS TABLE (
  campanha_id uuid,
  campanha_nome text,
  operadora_slug text,
  visitas bigint,
  registros bigint,
  ftds integer,
  ftd_total numeric,
  deposit_count bigint,
  deposit_total numeric,
  withdrawal_count bigint,
  withdrawal_total numeric,
  utms_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS campanha_id,
    c.nome AS campanha_nome,
    c.operadora_slug,
    COALESCE(SUM(m.visit_count), 0)::bigint AS visitas,
    COALESCE(SUM(m.registration_count), 0)::bigint AS registros,
    COALESCE(SUM(m.ftd_count), 0)::integer AS ftds,
    COALESCE(SUM(m.ftd_total), 0)::numeric(14,2) AS ftd_total,
    COALESCE(SUM(m.deposit_count), 0)::bigint AS deposit_count,
    COALESCE(SUM(m.deposit_total), 0)::numeric(14,2) AS deposit_total,
    COALESCE(SUM(m.withdrawal_count), 0)::bigint AS withdrawal_count,
    COALESCE(SUM(m.withdrawal_total), 0)::numeric(14,2) AS withdrawal_total,
    COUNT(DISTINCT ua.utm_source)::bigint AS utms_count
  FROM campanhas c
  LEFT JOIN utm_aliases ua ON ua.campanha_id = c.id AND ua.status = 'mapeado'
  LEFT JOIN utm_metricas_diarias m ON m.utm_source = ua.utm_source
    AND m.data >= p_data_inicio
    AND m.data <= p_data_fim
    AND COALESCE(ua.operadora_slug, 'casa_apostas') = m.operadora_slug
  WHERE c.ativo = true
    AND (p_operadora_slug IS NULL OR c.operadora_slug = p_operadora_slug OR (c.operadora_slug IS NULL AND p_operadora_slug IS NULL))
  GROUP BY c.id, c.nome, c.operadora_slug
  ORDER BY COALESCE(SUM(m.ftd_count), 0) DESC;
END;
$$;

COMMENT ON FUNCTION get_campanhas_performance IS 'Performance por campanha no período (Dashboard Mídias). Inclui deposit_count e withdrawal_count de utm_metricas_diarias.';
