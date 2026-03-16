-- =============================================================================
-- VIEW e RPC: Suporte a operadora_slug em influencer_metricas
-- Execute APÓS docs/migration-influencer-metricas-operadora.sql
-- =============================================================================

-- 1. VIEW: Agregado mensal por influencer e operadora
-- Inclui operadora_slug no GROUP BY para permitir filtro por operadora
-- DROP necessário: CREATE OR REPLACE falha ao inserir coluna no meio (mapeia ano→operadora_slug)

DROP VIEW IF EXISTS v_influencer_metricas_mensal;

CREATE VIEW v_influencer_metricas_mensal AS
SELECT
  influencer_id,
  COALESCE(operadora_slug, 'casa_apostas') AS operadora_slug,
  EXTRACT(YEAR FROM data)::int AS ano,
  EXTRACT(MONTH FROM data)::int AS mes,
  SUM(COALESCE(ftd_count, 0))::bigint AS ftd_count,
  SUM(COALESCE(ftd_total, 0))::numeric AS ftd_total,
  SUM(COALESCE(deposit_count, 0))::bigint AS deposit_count,
  SUM(COALESCE(deposit_total, 0))::numeric AS deposit_total,
  SUM(COALESCE(withdrawal_count, 0))::bigint AS withdrawal_count,
  SUM(COALESCE(withdrawal_total, 0))::numeric AS withdrawal_total,
  SUM(COALESCE(ggr, 0))::numeric AS ggr
FROM influencer_metricas
GROUP BY influencer_id, COALESCE(operadora_slug, 'casa_apostas'), EXTRACT(YEAR FROM data), EXTRACT(MONTH FROM data);

COMMENT ON VIEW v_influencer_metricas_mensal IS 'Métricas financeiras agregadas por influencer, operadora e mês.';

-- 2. RPC: get_metricas_financeiro com parâmetro p_operadora_slug
-- p_operadora_slug NULL = agrega todas as operadoras
-- p_operadora_slug = 'casa_apostas' = filtra apenas essa operadora

DROP FUNCTION IF EXISTS get_metricas_financeiro(int, int, uuid, boolean);
DROP FUNCTION IF EXISTS get_metricas_financeiro(int, int, uuid, boolean, text);

CREATE OR REPLACE FUNCTION get_metricas_financeiro(
  p_ano int DEFAULT NULL,
  p_mes int DEFAULT NULL,
  p_influencer_id uuid DEFAULT NULL,
  p_historico boolean DEFAULT false,
  p_operadora_slug text DEFAULT NULL
)
RETURNS TABLE (
  influencer_id uuid,
  ano int,
  mes int,
  ftd_count bigint,
  ftd_total numeric,
  deposit_count bigint,
  deposit_total numeric,
  withdrawal_count bigint,
  withdrawal_total numeric,
  ggr numeric,
  ftd_ticket_medio numeric,
  deposito_ticket_medio numeric,
  saque_ticket_medio numeric,
  ggr_por_jogador numeric,
  wd_ratio numeric,
  pvi int,
  perfil_jogador text
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_historico THEN
    RETURN QUERY
    WITH filtered AS (
      SELECT v.influencer_id, v.operadora_slug, v.ano, v.mes,
        v.ftd_count, v.ftd_total, v.deposit_count, v.deposit_total,
        v.withdrawal_count, v.withdrawal_total, v.ggr
      FROM v_influencer_metricas_mensal v
      WHERE (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
        AND (p_operadora_slug IS NULL OR v.operadora_slug = p_operadora_slug)
    ),
    base AS (
      SELECT
        f.influencer_id,
        NULL::int AS ano,
        NULL::int AS mes,
        SUM(f.ftd_count)::bigint AS ftd_count,
        SUM(f.ftd_total)::numeric AS ftd_total,
        SUM(f.deposit_count)::bigint AS deposit_count,
        SUM(f.deposit_total)::numeric AS deposit_total,
        SUM(f.withdrawal_count)::bigint AS withdrawal_count,
        SUM(f.withdrawal_total)::numeric AS withdrawal_total,
        SUM(f.ggr)::numeric AS ggr
      FROM filtered f
      GROUP BY f.influencer_id
    ),
    step1 AS (
      SELECT
        b.*,
        CASE WHEN b.ftd_count > 0 THEN b.ftd_total / b.ftd_count ELSE 0 END::numeric AS ftm,
        CASE WHEN b.deposit_count > 0 THEN b.deposit_total / b.deposit_count ELSE 0 END::numeric AS dtm,
        CASE WHEN COALESCE(b.withdrawal_count, 0) > 0 THEN b.withdrawal_total / NULLIF(b.withdrawal_count, 0) ELSE 0 END::numeric AS stm,
        CASE WHEN b.ftd_count > 0 THEN b.ggr / b.ftd_count ELSE 0 END::numeric AS gpj,
        CASE WHEN b.deposit_total > 0 THEN (b.withdrawal_total / b.deposit_total) * 100 ELSE 0 END::numeric AS wdr
      FROM base b
    ),
    step2 AS (
      SELECT
        s.*,
        ROUND(
          (CASE WHEN s.dtm > 1000 THEN 100 WHEN s.dtm >= 600 THEN 80 WHEN s.dtm >= 200 THEN 60 WHEN s.dtm >= 100 THEN 40 WHEN s.dtm > 0 THEN 20 ELSE 0 END) * 0.4 +
          (CASE WHEN s.gpj > 500 THEN 100 WHEN s.gpj >= 200 THEN 80 WHEN s.gpj >= 100 THEN 60 WHEN s.gpj >= 50 THEN 40 WHEN s.gpj > 0 THEN 20 ELSE 0 END) * 0.4 +
          (CASE WHEN s.wdr < 40 THEN 100 WHEN s.wdr <= 60 THEN 80 WHEN s.wdr <= 75 THEN 60 WHEN s.wdr <= 90 THEN 40 ELSE 20 END) * 0.2
        )::int AS pvi_val
      FROM step1 s
    )
    SELECT
      s.influencer_id, s.ano, s.mes, s.ftd_count, s.ftd_total,
      s.deposit_count, s.deposit_total, s.withdrawal_count, s.withdrawal_total, s.ggr,
      s.ftm, s.dtm, s.stm, s.gpj, s.wdr,
      s.pvi_val,
      CASE WHEN s.pvi_val >= 80 THEN 'Whales' WHEN s.pvi_val >= 60 THEN 'Core' WHEN s.pvi_val >= 15 THEN 'Recreativos' ELSE 'Caçadores de Bônus' END
    FROM step2 s
    ORDER BY s.influencer_id;
  ELSE
    RETURN QUERY
    WITH filtered AS (
      SELECT v.influencer_id, v.ano, v.mes, v.ftd_count, v.ftd_total,
        v.deposit_count, v.deposit_total, v.withdrawal_count, v.withdrawal_total, v.ggr
      FROM v_influencer_metricas_mensal v
      WHERE v.ano = p_ano AND v.mes = COALESCE(p_mes, 0) + 1
        AND (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
        AND (p_operadora_slug IS NULL OR v.operadora_slug = p_operadora_slug)
    ),
    base AS (
      SELECT
        f.influencer_id,
        MAX(f.ano)::int AS ano,
        MAX(f.mes)::int AS mes,
        SUM(f.ftd_count)::bigint AS ftd_count,
        SUM(f.ftd_total)::numeric AS ftd_total,
        SUM(f.deposit_count)::bigint AS deposit_count,
        SUM(f.deposit_total)::numeric AS deposit_total,
        SUM(f.withdrawal_count)::bigint AS withdrawal_count,
        SUM(f.withdrawal_total)::numeric AS withdrawal_total,
        SUM(f.ggr)::numeric AS ggr
      FROM filtered f
      GROUP BY f.influencer_id
    ),
    step1 AS (
      SELECT
        b.*,
        CASE WHEN b.ftd_count > 0 THEN b.ftd_total / b.ftd_count ELSE 0 END::numeric AS ftm,
        CASE WHEN b.deposit_count > 0 THEN b.deposit_total / b.deposit_count ELSE 0 END::numeric AS dtm,
        CASE WHEN COALESCE(b.withdrawal_count, 0) > 0 THEN b.withdrawal_total / NULLIF(b.withdrawal_count, 0) ELSE 0 END::numeric AS stm,
        CASE WHEN b.ftd_count > 0 THEN b.ggr / b.ftd_count ELSE 0 END::numeric AS gpj,
        CASE WHEN b.deposit_total > 0 THEN (b.withdrawal_total / b.deposit_total) * 100 ELSE 0 END::numeric AS wdr
      FROM base b
    ),
    step2 AS (
      SELECT
        s.*,
        ROUND(
          (CASE WHEN s.dtm > 1000 THEN 100 WHEN s.dtm >= 600 THEN 80 WHEN s.dtm >= 200 THEN 60 WHEN s.dtm >= 100 THEN 40 WHEN s.dtm > 0 THEN 20 ELSE 0 END) * 0.4 +
          (CASE WHEN s.gpj > 500 THEN 100 WHEN s.gpj >= 200 THEN 80 WHEN s.gpj >= 100 THEN 60 WHEN s.gpj >= 50 THEN 40 WHEN s.gpj > 0 THEN 20 ELSE 0 END) * 0.4 +
          (CASE WHEN s.wdr < 40 THEN 100 WHEN s.wdr <= 60 THEN 80 WHEN s.wdr <= 75 THEN 60 WHEN s.wdr <= 90 THEN 40 ELSE 20 END) * 0.2
        )::int AS pvi_val
      FROM step1 s
    )
    SELECT
      s.influencer_id, s.ano, s.mes, s.ftd_count, s.ftd_total,
      s.deposit_count, s.deposit_total, s.withdrawal_count, s.withdrawal_total, s.ggr,
      s.ftm, s.dtm, s.stm, s.gpj, s.wdr,
      s.pvi_val,
      CASE WHEN s.pvi_val >= 80 THEN 'Whales' WHEN s.pvi_val >= 60 THEN 'Core' WHEN s.pvi_val >= 15 THEN 'Recreativos' ELSE 'Caçadores de Bônus' END
    FROM step2 s
    ORDER BY s.influencer_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean, text) TO authenticated;
