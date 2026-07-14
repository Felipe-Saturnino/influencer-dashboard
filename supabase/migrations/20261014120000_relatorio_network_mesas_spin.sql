-- Relatórios Mesas Spin — canal Estúdio Network (espelho das tabelas dedicadas).
-- Overview Spin: Dedicado = relatorio_*; Network = relatorio_network_*; Overview soma ambos.
-- Corte histórico: linhas esportiva_bet a partir de 2026-06-01 migram para Network.

-- ── Tabelas Network ───────────────────────────────────────────────────────────

CREATE TABLE public.relatorio_network_daily_summary (
  data           date        NOT NULL,
  turnover       numeric(18, 2),
  ggr            numeric(18, 2),
  apostas        bigint,
  uap            bigint,
  operadora_slug text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_network_daily_summary_pkey PRIMARY KEY (data, operadora_slug)
);

COMMENT ON TABLE public.relatorio_network_daily_summary IS
  'Daily summaries BRL — fatia Network por operadora parceira (nunca slug de estúdio).';

CREATE INDEX idx_relatorio_network_daily_summary_operadora_slug
  ON public.relatorio_network_daily_summary (operadora_slug);

CREATE TABLE public.relatorio_network_monthly_summary (
  mes            date        NOT NULL,
  uap            bigint,
  arpu           numeric(18, 2),
  operadora_slug text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_network_monthly_summary_pkey PRIMARY KEY (mes, operadora_slug)
);

COMMENT ON TABLE public.relatorio_network_monthly_summary IS
  'Monthly summaries BRL (UAP/ARPU) — fatia Network por operadora parceira.';

CREATE INDEX idx_relatorio_network_monthly_summary_operadora_slug
  ON public.relatorio_network_monthly_summary (operadora_slug);

CREATE TABLE public.relatorio_network_por_tabela (
  dia            date        NOT NULL,
  operadora      text        NOT NULL,
  operadora_slug text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  mesa           text        NOT NULL,
  ggr            numeric(18, 2),
  turnover       numeric(18, 2),
  apostas        bigint,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_network_por_tabela_dia_operadora_slug_mesa_key UNIQUE (dia, operadora_slug, mesa)
);

COMMENT ON TABLE public.relatorio_network_por_tabela IS
  'Per table BRL — mesas de estúdio Network, métricas por operadora parceira.';

CREATE INDEX idx_relatorio_network_por_tabela_dia
  ON public.relatorio_network_por_tabela (dia DESC);

CREATE INDEX idx_relatorio_network_por_tabela_operadora_slug
  ON public.relatorio_network_por_tabela (operadora_slug);

CREATE TABLE public.relatorio_network_uap_por_jogo (
  data           date        NOT NULL,
  jogo           text        NOT NULL,
  uap            bigint      NOT NULL,
  operadora_slug text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relatorio_network_uap_por_jogo_data_jogo_operadora_key UNIQUE (data, jogo, operadora_slug)
);

COMMENT ON TABLE public.relatorio_network_uap_por_jogo IS
  'UAP diário por jogo — fatia Network por operadora parceira.';

CREATE INDEX idx_relatorio_network_uap_por_jogo_data
  ON public.relatorio_network_uap_por_jogo (data DESC);

CREATE INDEX idx_relatorio_network_uap_por_jogo_operadora_slug
  ON public.relatorio_network_uap_por_jogo (operadora_slug);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.relatorio_network_daily_summary   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_network_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_network_por_tabela      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorio_network_uap_por_jogo    ENABLE ROW LEVEL SECURITY;

CREATE POLICY relatorio_network_daily_summary_select_auth ON public.relatorio_network_daily_summary
  FOR SELECT TO authenticated USING (true);
CREATE POLICY relatorio_network_monthly_summary_select_auth ON public.relatorio_network_monthly_summary
  FOR SELECT TO authenticated USING (true);
CREATE POLICY relatorio_network_por_tabela_select_auth ON public.relatorio_network_por_tabela
  FOR SELECT TO authenticated USING (true);
CREATE POLICY relatorio_network_uap_por_jogo_select_auth ON public.relatorio_network_uap_por_jogo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY relatorio_network_daily_summary_all_service ON public.relatorio_network_daily_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY relatorio_network_monthly_summary_all_service ON public.relatorio_network_monthly_summary
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY relatorio_network_por_tabela_all_service ON public.relatorio_network_por_tabela
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY relatorio_network_uap_por_jogo_all_service ON public.relatorio_network_uap_por_jogo
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Corte histórico Esportiva Bet (Network desde jun/2026) ────────────────────

INSERT INTO public.relatorio_network_daily_summary (
  data, turnover, ggr, apostas, uap, operadora_slug, created_at, updated_at
)
SELECT data, turnover, ggr, apostas, uap, operadora_slug, created_at, updated_at
FROM public.relatorio_daily_summary
WHERE operadora_slug = 'esportiva_bet'
  AND data >= DATE '2026-06-01'
ON CONFLICT (data, operadora_slug) DO NOTHING;

DELETE FROM public.relatorio_daily_summary
WHERE operadora_slug = 'esportiva_bet'
  AND data >= DATE '2026-06-01';

INSERT INTO public.relatorio_network_monthly_summary (
  mes, uap, arpu, operadora_slug, created_at, updated_at
)
SELECT mes, uap, arpu, operadora_slug, created_at, updated_at
FROM public.relatorio_monthly_summary
WHERE operadora_slug = 'esportiva_bet'
  AND mes >= DATE '2026-06-01'
ON CONFLICT (mes, operadora_slug) DO NOTHING;

DELETE FROM public.relatorio_monthly_summary
WHERE operadora_slug = 'esportiva_bet'
  AND mes >= DATE '2026-06-01';

INSERT INTO public.relatorio_network_por_tabela (
  dia, operadora, operadora_slug, mesa, ggr, turnover, apostas, created_at, updated_at
)
SELECT dia, operadora, operadora_slug, mesa, ggr, turnover, apostas, created_at, updated_at
FROM public.relatorio_por_tabela
WHERE operadora_slug = 'esportiva_bet'
  AND dia >= DATE '2026-06-01'
ON CONFLICT (dia, operadora_slug, mesa) DO NOTHING;

DELETE FROM public.relatorio_por_tabela
WHERE operadora_slug = 'esportiva_bet'
  AND dia >= DATE '2026-06-01';

INSERT INTO public.relatorio_network_uap_por_jogo (
  data, jogo, uap, operadora_slug, created_at, updated_at
)
SELECT data, jogo, uap, operadora_slug, created_at, updated_at
FROM public.relatorio_uap_por_jogo
WHERE operadora_slug = 'esportiva_bet'
  AND data >= DATE '2026-06-01'
ON CONFLICT (data, jogo, operadora_slug) DO NOTHING;

DELETE FROM public.relatorio_uap_por_jogo
WHERE operadora_slug = 'esportiva_bet'
  AND data >= DATE '2026-06-01';
