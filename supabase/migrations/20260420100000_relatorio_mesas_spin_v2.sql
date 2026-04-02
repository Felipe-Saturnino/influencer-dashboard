-- Relatório Mesas Spin v2 — tabelas alinhadas ao upload OCR (Daily / 2.º Monthly UAP+ARPU / Per table d-1).
-- Isto recria as tabelas após 20260419120000_remover_relatorio_mesas_spin_ocr.sql.

DROP TABLE IF EXISTS public.relatorio_daily_por_mesa CASCADE;
DROP TABLE IF EXISTS public.relatorio_por_tabela CASCADE;
DROP TABLE IF EXISTS public.relatorio_monthly_summary CASCADE;
DROP TABLE IF EXISTS public.relatorio_daily_summary CASCADE;

-- Diário: uma linha por data (consolidado do bloco Daily summaries BRL).
CREATE TABLE public.relatorio_daily_summary (
  data      date        NOT NULL PRIMARY KEY,
  turnover  numeric(18, 2),
  ggr       numeric(18, 2),
  apostas   bigint,
  uap       bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.relatorio_daily_summary IS 'Daily summaries BRL — Day, Turnover, GGR, Bets (Apostas), UAP';

-- Mensal: 2.º bloco Monthly summaries BRL (Date, UAP, ARPU apenas).
CREATE TABLE public.relatorio_monthly_summary (
  mes      date        NOT NULL PRIMARY KEY,
  uap      bigint,
  arpu     numeric(18, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.relatorio_monthly_summary IS 'Monthly summaries BRL (tabela à direita) — Mês, UAP, ARPU';

-- Por mesa: Per table BRL — métricas d-1; dia = data mais recente do Daily da mesma leitura.
CREATE TABLE public.relatorio_por_tabela (
  dia       date        NOT NULL,
  operadora text        NOT NULL,
  mesa      text        NOT NULL,
  ggr       numeric(18, 2),
  turnover  numeric(18, 2),
  apostas   bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_por_tabela_dia_operadora_mesa_key UNIQUE (dia, operadora, mesa)
);

COMMENT ON TABLE public.relatorio_por_tabela IS 'Per table BRL — GGR/Turnover/Bets d-1; nomes canónicos de mesa e operadora';

CREATE INDEX idx_relatorio_por_tabela_dia ON public.relatorio_por_tabela (dia DESC);

ALTER TABLE public.relatorio_daily_summary    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_monthly_summary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_por_tabela       ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_daily_summary_select_auth ON public.relatorio_daily_summary
  FOR SELECT TO authenticated USING (true);
CREATE POLICY relatorio_monthly_summary_select_auth ON public.relatorio_monthly_summary
  FOR SELECT TO authenticated USING (true);
CREATE POLICY relatorio_por_tabela_select_auth ON public.relatorio_por_tabela
  FOR SELECT TO authenticated USING (true);

CREATE POLICY relatorio_daily_summary_all_service ON public.relatorio_daily_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY relatorio_monthly_summary_all_service ON public.relatorio_monthly_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY relatorio_por_tabela_all_service ON public.relatorio_por_tabela
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Integração upload PLS / Daily Commercial foi removida (dados Mesas Spin manuais / SQL). Ver 20260424100000.
