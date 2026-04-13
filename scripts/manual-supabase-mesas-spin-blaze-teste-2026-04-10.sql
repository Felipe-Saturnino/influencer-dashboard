-- Mesas Spin — dados de TESTE Blaze (10/04/2026 + monthly abr/2026) para avaliar layout no app.
-- Requer: linha em public.operadoras com slug = 'blaze' (ativo). Correr no SQL Editor (service_role / postgres).

BEGIN;

-- ── Monthly (abr/2026 = primeiro dia do mês) ─────────────────────────────────
INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap, arpu)
VALUES ('2026-04-01', 'blaze', 66, 24.25)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  arpu       = EXCLUDED.arpu,
  updated_at = now();

-- ── Daily (10/04/2026) ───────────────────────────────────────────────────────
INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES ('2026-04-10', 'blaze', 18989, 1657, 8623, 66)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Por mesa (mesmo dia) ─────────────────────────────────────────────────────
INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-04-10', 'Blaze', 'blaze', 'Blackjack 1',     0,     0,     0),
  ('2026-04-10', 'Blaze', 'blaze', 'Roleta',       1475, 16541,  8447),
  ('2026-04-10', 'Blaze', 'blaze', 'Blackjack 2',     0,     0,     0),
  ('2026-04-10', 'Blaze', 'blaze', 'Blackjack VIP',  -5,  1530,   147),
  ('2026-04-10', 'Blaze', 'blaze', 'Speed Baccarat',187,   918,  8447)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- ── UAP por jogo (10/04/2026) ───────────────────────────────────────────────
INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-04-10', 'blaze', 'Blackjack',      6),
  ('2026-04-10', 'blaze', 'Speed Baccarat', 6),
  ('2026-04-10', 'blaze', 'Roleta',        61)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
