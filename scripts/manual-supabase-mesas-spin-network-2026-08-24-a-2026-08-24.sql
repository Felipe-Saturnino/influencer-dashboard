-- Mesas Spin — 2026-08-24 a 2026-08-24: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-24', 'blaze',    72987,   2185,   4482,  55),
  ('2026-08-24', 'casa_apostas',     5960,   -489,   2059,  16),
  ('2026-08-24', 'esportiva_bet',   643496,  88266, 102363, 360),
  ('2026-08-24', 'jonbet',    45622,   2310,   5528, 127)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-24', 'Blaze', 'blaze', 'Blackjack 1',   1818,    70988,   2734),
  ('2026-08-24', 'Blaze', 'blaze', 'Futebol Brasileiro',    176,      962,    281),
  ('2026-08-24', 'Blaze', 'blaze', 'Speed Baccarat',     77,      479,     48),
  ('2026-08-24', 'Blaze', 'blaze', 'Roleta',    114,      558,   1419),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -535,     4270,    114),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -35,      140,     17),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -10,      640,    200),
  ('2026-08-24', 'Casa de Apostas', 'casa_apostas', 'Roleta',     91,      910,   1728),
  ('2026-08-24', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   2878,    52530,   1723),
  ('2026-08-24', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   6758,    33782,   1965),
  ('2026-08-24', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  54775,   101226,   2700),
  ('2026-08-24', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  23855,   455958,  95975),
  ('2026-08-24', 'Jon Bet', 'jonbet', 'Blackjack 1',   -857,     7750,    615),
  ('2026-08-24', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     14,      665,    182),
  ('2026-08-24', 'Jon Bet', 'jonbet', 'Speed Baccarat',     29,     7300,   1857),
  ('2026-08-24', 'Jon Bet', 'jonbet', 'Roleta',   3124,    29907,   2874)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-24', 'blaze', 'Blackjack',  35),
  ('2026-08-24', 'blaze', 'Futebol Brasileiro',  10),
  ('2026-08-24', 'blaze', 'Speed Baccarat',   7),
  ('2026-08-24', 'blaze', 'Roleta',  10),
  ('2026-08-24', 'casa_apostas', 'Blackjack',   5),
  ('2026-08-24', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-24', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-08-24', 'casa_apostas', 'Roleta',   8),
  ('2026-08-24', 'esportiva_bet', 'Blackjack',  31),
  ('2026-08-24', 'esportiva_bet', 'Futebol Brasileiro',  65),
  ('2026-08-24', 'esportiva_bet', 'Speed Baccarat',  63),
  ('2026-08-24', 'esportiva_bet', 'Roleta', 231),
  ('2026-08-24', 'jonbet', 'Blackjack',   9),
  ('2026-08-24', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-08-24', 'jonbet', 'Speed Baccarat',  82),
  ('2026-08-24', 'jonbet', 'Roleta',  33)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4386),
  ('2026-08-01', 'casa_apostas',  131),
  ('2026-08-01', 'blaze', 1020),
  ('2026-08-01', 'jonbet', 1660)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
