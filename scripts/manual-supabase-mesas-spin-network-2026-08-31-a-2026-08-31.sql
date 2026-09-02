-- Mesas Spin — 2026-08-31 a 2026-08-31: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-31', 'blaze',    34810,    681,   6436,  51),
  ('2026-08-31', 'casa_apostas',     2920,    280,   1701,  16),
  ('2026-08-31', 'esportiva_bet',  1112847, 109193, 150558, 394),
  ('2026-08-31', 'jonbet',    46868,  -6044,   5020,  88)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-31', 'Blaze', 'blaze', 'Blackjack 1',   1605,    24210,   1609),
  ('2026-08-31', 'Blaze', 'blaze', 'Futebol Brasileiro',   -182,     1016,    265),
  ('2026-08-31', 'Blaze', 'blaze', 'Speed Baccarat',   -410,     2075,    130),
  ('2026-08-31', 'Blaze', 'blaze', 'Roleta',   -332,     7509,   4432),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    228,     1755,    140),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     87,      572,    201),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -35,      593,   1360),
  ('2026-08-31', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  48123,   149805,   2921),
  ('2026-08-31', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   8585,    23333,   2238),
  ('2026-08-31', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   -332,    16763,   1376),
  ('2026-08-31', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  52817,   922946, 144023),
  ('2026-08-31', 'Jon Bet', 'jonbet', 'Blackjack 1',  -6477,    28050,    474),
  ('2026-08-31', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    -80,     1111,    260),
  ('2026-08-31', 'Jon Bet', 'jonbet', 'Speed Baccarat',    287,     1186,    405),
  ('2026-08-31', 'Jon Bet', 'jonbet', 'Roleta',    226,    16521,   3881)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-31', 'blaze', 'Blackjack',  27),
  ('2026-08-31', 'blaze', 'Futebol Brasileiro',   6),
  ('2026-08-31', 'blaze', 'Speed Baccarat',  11),
  ('2026-08-31', 'blaze', 'Roleta',  12),
  ('2026-08-31', 'casa_apostas', 'Blackjack',   5),
  ('2026-08-31', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-08-31', 'casa_apostas', 'Speed Baccarat',   5),
  ('2026-08-31', 'casa_apostas', 'Roleta',   6),
  ('2026-08-31', 'esportiva_bet', 'Blackjack',  51),
  ('2026-08-31', 'esportiva_bet', 'Futebol Brasileiro',  81),
  ('2026-08-31', 'esportiva_bet', 'Speed Baccarat',  51),
  ('2026-08-31', 'esportiva_bet', 'Roleta', 249),
  ('2026-08-31', 'jonbet', 'Blackjack',   8),
  ('2026-08-31', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-08-31', 'jonbet', 'Speed Baccarat',  22),
  ('2026-08-31', 'jonbet', 'Roleta',  46)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 5393),
  ('2026-08-01', 'casa_apostas',  150),
  ('2026-08-01', 'blaze', 1108),
  ('2026-08-01', 'jonbet', 1884)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
