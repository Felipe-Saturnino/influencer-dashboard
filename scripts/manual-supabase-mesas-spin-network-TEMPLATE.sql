-- TEMPLATE — Mesas Spin / Estúdio Network (carga PLS)
--
-- Espelho do script Dedicado (`manual-supabase-mesas-spin-YYYY-MM-DD-…sql`),
-- apontando para `relatorio_network_*`.
--
-- Usar quando o print for fatia Network da operadora parceira
-- (ex.: Esportiva Bet no Sports Club; ou mesas network no print Blaze/CDA).
--
-- Regras:
--   1. `operadora_slug` = parceiro (blaze, casa_apostas, esportiva_bet) — NUNCA sports_club.
--   2. Soma das mesas ≈ daily (GGR/turnover ±1–2; apostas); UAP por jogo pode > daily.
--   3. Monthly: `mes` = primeiro dia do mês (YYYY-MM-01); atualizar `arpu` só se vier no print.
--   4. Dedicado continua em `relatorio_*` (script antigo). Não misturar no mesmo INSERT.
--
-- Copiar este ficheiro → `manual-supabase-mesas-spin-network-YYYY-MM-DD-<parceiros>.sql`
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

-- ── Daily ────────────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_network_daily_summary (
  data, operadora_slug, turnover, ggr, apostas, uap
)
VALUES
  ('YYYY-MM-DD', 'esportiva_bet', 0, 0, 0, 0)
  -- ('YYYY-MM-DD', 'blaze', …),
  -- ('YYYY-MM-DD', 'casa_apostas', …)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Per table ────────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_network_por_tabela (
  dia, operadora, operadora_slug, mesa, ggr, turnover, apostas
)
VALUES
  ('YYYY-MM-DD', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',        0, 0, 0),
  ('YYYY-MM-DD', 'Esportiva Bet', 'esportiva_bet', 'Roleta',             0, 0, 0),
  ('YYYY-MM-DD', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro', 0, 0, 0),
  ('YYYY-MM-DD', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',     0, 0, 0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- ── UAP por jogo ─────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_network_uap_por_jogo (
  data, operadora_slug, jogo, uap
)
VALUES
  ('YYYY-MM-DD', 'esportiva_bet', 'Blackjack',          0),
  ('YYYY-MM-DD', 'esportiva_bet', 'Futebol Brasileiro', 0),
  ('YYYY-MM-DD', 'esportiva_bet', 'Speed Baccarat',     0),
  ('YYYY-MM-DD', 'esportiva_bet', 'Roleta',             0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Monthly (opcional — só se o print Monthly Network mudar) ─────────────────

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap, arpu)
VALUES
  ('YYYY-MM-01', 'esportiva_bet', 0, NULL)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  -- arpu     = EXCLUDED.arpu,  -- descomentar só com valor explícito do print
  updated_at = now();

COMMIT;
