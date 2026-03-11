-- =============================================================================
-- MIGRAÇÕES PARA DASHBOARD FINANCEIRO — ARQUITETURA ESCALÁVEL
-- Execute estes SQLs no Supabase (SQL Editor) na ordem indicada
-- =============================================================================

-- 1. Coluna withdrawal_count (se não existir)
ALTER TABLE influencer_metricas
ADD COLUMN IF NOT EXISTS withdrawal_count integer DEFAULT 0;

-- 2. Índices para acelerar agregações (recomendado para crescimento futuro)
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_influencer_data
  ON influencer_metricas (influencer_id, data);

CREATE INDEX IF NOT EXISTS idx_influencer_metricas_data
  ON influencer_metricas (data);

-- 3. VIEW: Agregado mensal por influencer
-- Reduz N linhas diárias para 1 linha por influencer por mês
-- Ex: 50 influencers × 365 dias = 18.250 rows → 50 × 12 = 600 rows/ano

CREATE OR REPLACE VIEW v_influencer_metricas_mensal AS
SELECT
  influencer_id,
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
GROUP BY influencer_id, EXTRACT(YEAR FROM data), EXTRACT(MONTH FROM data);

COMMENT ON VIEW v_influencer_metricas_mensal IS 'Métricas financeiras agregadas por influencer e mês. Usar no Dashboard Financeiro para reduzir carga.';

-- 4. RPC: Retorna métricas agregadas prontas para o frontend
-- Faz a agregação no banco; frontend só recebe 1 row por influencer e aplica PVI/tickets
-- Uso: select * from get_metricas_financeiro(2025, 3, null, false);  -- março 2025
--      select * from get_metricas_financeiro(null, null, null, true); -- histórico completo

CREATE OR REPLACE FUNCTION get_metricas_financeiro(
  p_ano int DEFAULT NULL,
  p_mes int DEFAULT NULL,
  p_influencer_id uuid DEFAULT NULL,
  p_historico boolean DEFAULT false
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
  ggr numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_historico THEN
    RETURN QUERY
    SELECT
      v.influencer_id,
      NULL::int AS ano,
      NULL::int AS mes,
      SUM(v.ftd_count)::bigint,
      SUM(v.ftd_total)::numeric,
      SUM(v.deposit_count)::bigint,
      SUM(v.deposit_total)::numeric,
      SUM(v.withdrawal_count)::bigint,
      SUM(v.withdrawal_total)::numeric,
      SUM(v.ggr)::numeric
    FROM v_influencer_metricas_mensal v
    WHERE (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
    GROUP BY v.influencer_id
    ORDER BY v.influencer_id;
  ELSE
    RETURN QUERY
    SELECT
      v.influencer_id,
      v.ano,
      v.mes,
      v.ftd_count,
      v.ftd_total,
      v.deposit_count,
      v.deposit_total,
      v.withdrawal_count,
      v.withdrawal_total,
      v.ggr
    FROM v_influencer_metricas_mensal v
    WHERE v.ano = p_ano AND v.mes = p_mes
      AND (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
    ORDER BY v.influencer_id;
  END IF;
END;
$$;

-- 5. Habilitar RPC para acesso via Supabase client
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO authenticated;

-- =============================================================================
-- RESUMO DA ARQUITETURA
--
-- influencer_metricas (dados brutos diários)
--        ↓
-- v_influencer_metricas_mensal (VIEW - agrega por mês)
--        ↓
-- get_metricas_financeiro() (RPC - filtra por período e retorna agregado)
--        ↓
-- Frontend (recebe poucas rows, calcula PVI/tickets em memória)
--
-- Benefícios: menos dados trafegados, agregação no PostgreSQL, escala por anos
-- =============================================================================
