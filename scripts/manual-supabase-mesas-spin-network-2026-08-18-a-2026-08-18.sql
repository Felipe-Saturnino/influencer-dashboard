-- Mesas Spin — 2026-08-18 a 2026-08-18: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-18', 'blaze',    63682,    176,  10014,  98),
  ('2026-08-18', 'casa_apostas',     6271,    425,   2073,  21),
  ('2026-08-18', 'esportiva_bet',   792382,  76752, 107588, 418),
  ('2026-08-18', 'jonbet',    41465,   2027,   5627, 143)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-18', 'Blaze', 'blaze', 'Blackjack 1',    770,    48208,   2466),
  ('2026-08-18', 'Blaze', 'blaze', 'Futebol Brasileiro',   -153,     3888,    616),
  ('2026-08-18', 'Blaze', 'blaze', 'Speed Baccarat',  -1185,     3552,    312),
  ('2026-08-18', 'Blaze', 'blaze', 'Roleta',    744,     8034,   6620),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -100,     1845,    197),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    200,     1405,     14),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    227,     2571,    537),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Roleta',     98,      450,   1325),
  ('2026-08-18', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',    948,    15775,   1221),
  ('2026-08-18', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   4310,    59336,   4777),
  ('2026-08-18', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   1581,   184887,   3799),
  ('2026-08-18', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  69913,   532384,  97791),
  ('2026-08-18', 'Jon Bet', 'jonbet', 'Blackjack 1',   1428,    14308,    887),
  ('2026-08-18', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   -158,     2187,    489),
  ('2026-08-18', 'Jon Bet', 'jonbet', 'Speed Baccarat',    308,    19541,   2502),
  ('2026-08-18', 'Jon Bet', 'jonbet', 'Roleta',    449,     5429,   1749)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-18', 'blaze', 'Blackjack',  25),
  ('2026-08-18', 'blaze', 'Futebol Brasileiro',  24),
  ('2026-08-18', 'blaze', 'Speed Baccarat',  12),
  ('2026-08-18', 'blaze', 'Roleta',  44),
  ('2026-08-18', 'casa_apostas', 'Blackjack',   5),
  ('2026-08-18', 'casa_apostas', 'Futebol Brasileiro',   4),
  ('2026-08-18', 'casa_apostas', 'Speed Baccarat',   9),
  ('2026-08-18', 'casa_apostas', 'Roleta',   9),
  ('2026-08-18', 'esportiva_bet', 'Blackjack',  40),
  ('2026-08-18', 'esportiva_bet', 'Futebol Brasileiro',  92),
  ('2026-08-18', 'esportiva_bet', 'Speed Baccarat',  91),
  ('2026-08-18', 'esportiva_bet', 'Roleta', 244),
  ('2026-08-18', 'jonbet', 'Blackjack',  17),
  ('2026-08-18', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-18', 'jonbet', 'Speed Baccarat',  99),
  ('2026-08-18', 'jonbet', 'Roleta',  30)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 3259),
  ('2026-08-01', 'casa_apostas',  106),
  ('2026-08-01', 'blaze',  937),
  ('2026-08-01', 'jonbet', 1353)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
