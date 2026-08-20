-- Mesas Spin — 2026-08-19 a 2026-08-19: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-19', 'blaze',   971250,  43589, 136652, 827),
  ('2026-08-19', 'casa_apostas',   426660,  18303,  36020, 125)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-19', 'Blaze', 'blaze', 'Blackjack 1',   8698,   191233,   8663),
  ('2026-08-19', 'Blaze', 'blaze', 'Blackjack 2',  10913,   137355,   7178),
  ('2026-08-19', 'Blaze', 'blaze', 'Roleta',  19568,   297905, 112526),
  ('2026-08-19', 'Blaze', 'blaze', 'Speed Baccarat',   4635,   205307,   7489),
  ('2026-08-19', 'Blaze', 'blaze', 'Blackjack VIP',   -225,   139450,    796),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   2498,    16333,   1232),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   6748,    51865,   2820),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Roleta',  10953,   334842,  31146),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1418,    13570,    606),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    455,     6830,     80),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -933,     3220,    136)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-19', 'blaze', 'Blackjack', 254),
  ('2026-08-19', 'blaze', 'Speed Baccarat', 313),
  ('2026-08-19', 'blaze', 'Roleta', 316),
  ('2026-08-19', 'casa_apostas', 'Blackjack',  36),
  ('2026-08-19', 'casa_apostas', 'Futebol Brasileiro',  15),
  ('2026-08-19', 'casa_apostas', 'Speed Baccarat',  25),
  ('2026-08-19', 'casa_apostas', 'Roleta',  74)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  857),
  ('2026-08-01', 'blaze', 6057)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
