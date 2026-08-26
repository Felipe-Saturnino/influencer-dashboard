-- Mesas Spin — 2026-08-24 a 2026-08-24: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-24', 'blaze',  1209598,  58073, 108057, 798),
  ('2026-08-24', 'casa_apostas',   301751, -12126,  24827,  97)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-24', 'Blaze', 'blaze', 'Blackjack 1',  33520,   235838,  10769),
  ('2026-08-24', 'Blaze', 'blaze', 'Blackjack 2',  -8412,   155550,   9543),
  ('2026-08-24', 'Blaze', 'blaze', 'Roleta',  11618,   179412,  77273),
  ('2026-08-24', 'Blaze', 'blaze', 'Speed Baccarat',   4347,   404548,   9662),
  ('2026-08-24', 'Blaze', 'blaze', 'Blackjack VIP',  17000,   234250,    810),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   2790,    45310,   1123),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1190,    23593,   1367),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Roleta', -14191,   129041,  21110),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -3687,    99965,   1072),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   1100,     1450,     25),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    672,     2392,    130)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-24', 'blaze', 'Blackjack', 215),
  ('2026-08-24', 'blaze', 'Speed Baccarat', 326),
  ('2026-08-24', 'blaze', 'Roleta', 313),
  ('2026-08-24', 'casa_apostas', 'Blackjack',  21),
  ('2026-08-24', 'casa_apostas', 'Futebol Brasileiro',  13),
  ('2026-08-24', 'casa_apostas', 'Speed Baccarat',  14),
  ('2026-08-24', 'casa_apostas', 'Roleta',  70)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  974),
  ('2026-08-01', 'blaze', 7226)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
