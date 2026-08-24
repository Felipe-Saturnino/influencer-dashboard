-- Mesas Spin — 2026-08-23 a 2026-08-23: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-23', 'blaze',   896440,  35483, 105032, 747),
  ('2026-08-23', 'casa_apostas',   290391,  -2900,  36568, 112)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-23', 'Blaze', 'blaze', 'Blackjack 1',   7375,   194140,   9894),
  ('2026-08-23', 'Blaze', 'blaze', 'Blackjack 2',    438,   152390,   7197),
  ('2026-08-23', 'Blaze', 'blaze', 'Roleta',  13000,   183957,  79594),
  ('2026-08-23', 'Blaze', 'blaze', 'Speed Baccarat',  22720,   175653,   7668),
  ('2026-08-23', 'Blaze', 'blaze', 'Blackjack VIP',  -8050,   190300,    679),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   2365,    23695,   1551),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   3280,    48793,   5244),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Roleta',  -8656,   158989,  28823),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -93,    55785,    829),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     75,     2450,     40),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    129,      679,     81)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-23', 'blaze', 'Blackjack', 214),
  ('2026-08-23', 'blaze', 'Speed Baccarat', 329),
  ('2026-08-23', 'blaze', 'Roleta', 260),
  ('2026-08-23', 'casa_apostas', 'Blackjack',  32),
  ('2026-08-23', 'casa_apostas', 'Futebol Brasileiro',  10),
  ('2026-08-23', 'casa_apostas', 'Speed Baccarat',  17),
  ('2026-08-23', 'casa_apostas', 'Roleta',  64)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  957),
  ('2026-08-01', 'blaze', 7007)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
