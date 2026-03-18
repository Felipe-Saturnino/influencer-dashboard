-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Recriar tabelas do relatório Mesas Spin
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. DELETAR TABELAS ANTIGAS ──────────────────────────────────────────────
DROP TABLE IF EXISTS relatorio_daily_summary      CASCADE;
DROP TABLE IF EXISTS relatorio_monthly_summary    CASCADE;
DROP TABLE IF EXISTS relatorio_por_tabela         CASCADE;
DROP TABLE IF EXISTS relatorio_processamento_log  CASCADE;


-- ── 2. relatorio_daily_summary ───────────────────────────────────────────────
CREATE TABLE relatorio_daily_summary (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data        date        NOT NULL,
  operadora   text        REFERENCES operadoras(slug) ON DELETE SET NULL,
  turnover    numeric,
  ggr         numeric,
  margin_pct  numeric,
  bets        integer,
  uap         integer,
  bet_size    numeric,
  arpu        numeric,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_daily_summary_data_operadora_key UNIQUE (data, operadora)
);

COMMENT ON TABLE  relatorio_daily_summary              IS 'Resumo diário consolidado por operadora';
COMMENT ON COLUMN relatorio_daily_summary.data         IS 'Data do dia';
COMMENT ON COLUMN relatorio_daily_summary.operadora    IS 'Slug da operadora (FK operadoras.slug)';
COMMENT ON COLUMN relatorio_daily_summary.margin_pct   IS 'Margem GGR/Turnover em %';
COMMENT ON COLUMN relatorio_daily_summary.uap          IS 'Unique Active Players';
COMMENT ON COLUMN relatorio_daily_summary.bet_size     IS 'Tamanho médio da aposta';
COMMENT ON COLUMN relatorio_daily_summary.arpu         IS 'Average Revenue Per User';


-- ── 3. relatorio_monthly_summary ─────────────────────────────────────────────
CREATE TABLE relatorio_monthly_summary (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes         date        NOT NULL,
  operadora   text        REFERENCES operadoras(slug) ON DELETE SET NULL,
  turnover    numeric,
  ggr         numeric,
  margin_pct  numeric,
  bets        integer,
  uap         integer,
  bet_size    numeric,
  arpu        numeric,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_monthly_summary_mes_operadora_key UNIQUE (mes, operadora)
);

COMMENT ON TABLE  relatorio_monthly_summary           IS 'Resumo mensal consolidado por operadora';
COMMENT ON COLUMN relatorio_monthly_summary.mes       IS 'Primeiro dia do mês (ex: 2026-03-01)';
COMMENT ON COLUMN relatorio_monthly_summary.operadora IS 'Slug da operadora (FK operadoras.slug)';


-- ── 4. relatorio_por_tabela ──────────────────────────────────────────────────
CREATE TABLE relatorio_por_tabela (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_relatorio  date        NOT NULL,
  nome_tabela     text        NOT NULL,
  operadora       text        REFERENCES operadoras(slug) ON DELETE SET NULL,

  -- Ontem (d-1)
  ggr_d1          numeric,
  turnover_d1     numeric,
  bets_d1         integer,

  -- Anteontem (d-2)
  ggr_d2          numeric,
  turnover_d2     numeric,
  bets_d2         integer,

  -- Month-to-date
  ggr_mtd         numeric,
  turnover_mtd    numeric,
  bets_mtd        integer,

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_por_tabela_data_nome_key UNIQUE (data_relatorio, nome_tabela)
);

COMMENT ON TABLE  relatorio_por_tabela                    IS 'Snapshot diário por mesa: d-1, d-2 e MTD';
COMMENT ON COLUMN relatorio_por_tabela.data_relatorio     IS 'Data em que o snapshot foi gerado';
COMMENT ON COLUMN relatorio_por_tabela.nome_tabela        IS 'Nome completo da mesa (ex: Casa de Apostas Blackjack 1)';
COMMENT ON COLUMN relatorio_por_tabela.operadora          IS 'Slug da operadora extraído do nome da mesa';


-- ── 5. relatorio_daily_por_mesa ──────────────────────────────────────────────
CREATE TABLE relatorio_daily_por_mesa (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data        date        NOT NULL,
  nome_tabela text        NOT NULL,
  operadora   text        REFERENCES operadoras(slug) ON DELETE SET NULL,
  ggr         numeric,
  turnover    numeric,
  bets        integer,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relatorio_daily_por_mesa_data_nome_key UNIQUE (data, nome_tabela)
);

COMMENT ON TABLE  relatorio_daily_por_mesa             IS 'Histórico diário por mesa — acumulado pelo ETL via snapshot d-1';
COMMENT ON COLUMN relatorio_daily_por_mesa.nome_tabela IS 'Nome completo da mesa';
COMMENT ON COLUMN relatorio_daily_por_mesa.operadora   IS 'Slug da operadora';


-- ── 6. INDEXES (performance nas queries mais comuns) ─────────────────────────
CREATE INDEX idx_daily_summary_data       ON relatorio_daily_summary      (data DESC);
CREATE INDEX idx_daily_summary_operadora  ON relatorio_daily_summary      (operadora);
CREATE INDEX idx_monthly_summary_mes     ON relatorio_monthly_summary    (mes DESC);
CREATE INDEX idx_por_tabela_data          ON relatorio_por_tabela         (data_relatorio DESC);
CREATE INDEX idx_por_tabela_operadora     ON relatorio_por_tabela         (operadora);
CREATE INDEX idx_daily_mesa_data          ON relatorio_daily_por_mesa      (data DESC);
CREATE INDEX idx_daily_mesa_nome          ON relatorio_daily_por_mesa     (nome_tabela);
CREATE INDEX idx_daily_mesa_operadora     ON relatorio_daily_por_mesa     (operadora);


-- ── 7. RLS (Row Level Security — políticas com nomes únicos) ──────────────────
ALTER TABLE relatorio_daily_summary    ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_monthly_summary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_por_tabela       ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_daily_por_mesa   ENABLE ROW LEVEL SECURITY;

-- Leitura para usuários autenticados
CREATE POLICY "relatorio_daily_summary_select_auth" ON relatorio_daily_summary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "relatorio_monthly_summary_select_auth" ON relatorio_monthly_summary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "relatorio_por_tabela_select_auth" ON relatorio_por_tabela
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "relatorio_daily_por_mesa_select_auth" ON relatorio_daily_por_mesa
  FOR SELECT TO authenticated USING (true);

-- Escrita apenas para service_role (ETL/Superset)
CREATE POLICY "relatorio_daily_summary_all_service" ON relatorio_daily_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "relatorio_monthly_summary_all_service" ON relatorio_monthly_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "relatorio_por_tabela_all_service" ON relatorio_por_tabela
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "relatorio_daily_por_mesa_all_service" ON relatorio_daily_por_mesa
  FOR ALL TO service_role USING (true) WITH CHECK (true);
