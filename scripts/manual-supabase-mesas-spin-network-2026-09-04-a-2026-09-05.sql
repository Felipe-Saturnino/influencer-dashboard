-- Mesas Spin — 2026-09-04 a 2026-09-05: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-04', 'blaze',    37168,   2005,   3803,  51),
  ('2026-09-04', 'casa_apostas',     3883,   -529,   2130,  13),
  ('2026-09-04', 'esportiva_bet',  2098250,  95576, 131818, 481),
  ('2026-09-04', 'jonbet',    52215,  13013,   7180,  89),
  ('2026-09-05', 'blaze',    80415,   1609,   6188,  64),
  ('2026-09-05', 'casa_apostas',     6488,    798,   4570,  21),
  ('2026-09-05', 'esportiva_bet',  1300532,  80853, 140752, 511),
  ('2026-09-05', 'jonbet',    24346,   -457,   6272,  95)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-04', 'Blaze', 'blaze', 'Blackjack 1',    610,    31068,   1951),
  ('2026-09-04', 'Blaze', 'blaze', 'Futebol Brasileiro',    978,     3601,    126),
  ('2026-09-04', 'Blaze', 'blaze', 'Speed Baccarat',     78,     1093,    179),
  ('2026-09-04', 'Blaze', 'blaze', 'Roleta',    339,     1406,   1547),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -527,     1465,     50),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     26,     1195,    365),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -28,     1223,   1715),
  ('2026-09-04', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   8200,    69463,   3404),
  ('2026-09-04', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1490,    32441,   3313),
  ('2026-09-04', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  11070,    78353,   2734),
  ('2026-09-04', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  74816,  1917993, 122367),
  ('2026-09-04', 'Jon Bet', 'jonbet', 'Blackjack 1',    738,     5880,    350),
  ('2026-09-04', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     96,      457,    140),
  ('2026-09-04', 'Jon Bet', 'jonbet', 'Speed Baccarat',    654,     4192,    659),
  ('2026-09-04', 'Jon Bet', 'jonbet', 'Roleta',  11525,    41686,   6031),
  ('2026-09-05', 'Blaze', 'blaze', 'Blackjack 1',   2395,    73598,   4482),
  ('2026-09-05', 'Blaze', 'blaze', 'Futebol Brasileiro',   -601,     1834,    236),
  ('2026-09-05', 'Blaze', 'blaze', 'Speed Baccarat',    110,     2273,    349),
  ('2026-09-05', 'Blaze', 'blaze', 'Roleta',   -295,     2710,   1121),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    438,     1803,    150),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     13,       95,     12),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      1,      788,    233),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Roleta',    346,     3802,   4175),
  ('2026-09-05', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  14300,   102295,   3394),
  ('2026-09-05', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',     64,    32211,   3939),
  ('2026-09-05', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   8004,    59243,   2755),
  ('2026-09-05', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  58485,  1106783, 130664),
  ('2026-09-05', 'Jon Bet', 'jonbet', 'Blackjack 1',     55,     3780,    288),
  ('2026-09-05', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    793,     6489,    588),
  ('2026-09-05', 'Jon Bet', 'jonbet', 'Speed Baccarat',    587,     2675,    609),
  ('2026-09-05', 'Jon Bet', 'jonbet', 'Roleta',  -1892,    11402,   4787)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-04', 'blaze', 'Blackjack',  24),
  ('2026-09-04', 'blaze', 'Futebol Brasileiro',  16),
  ('2026-09-04', 'blaze', 'Speed Baccarat',  13),
  ('2026-09-04', 'blaze', 'Roleta',  16),
  ('2026-09-04', 'casa_apostas', 'Blackjack',   3),
  ('2026-09-04', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-09-04', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-09-04', 'casa_apostas', 'Roleta',   5),
  ('2026-09-04', 'esportiva_bet', 'Blackjack',  47),
  ('2026-09-04', 'esportiva_bet', 'Futebol Brasileiro', 106),
  ('2026-09-04', 'esportiva_bet', 'Speed Baccarat',  74),
  ('2026-09-04', 'esportiva_bet', 'Roleta', 308),
  ('2026-09-04', 'jonbet', 'Blackjack',   9),
  ('2026-09-04', 'jonbet', 'Futebol Brasileiro',  22),
  ('2026-09-04', 'jonbet', 'Speed Baccarat',  26),
  ('2026-09-04', 'jonbet', 'Roleta',  42),
  ('2026-09-05', 'blaze', 'Blackjack',  37),
  ('2026-09-05', 'blaze', 'Futebol Brasileiro',  11),
  ('2026-09-05', 'blaze', 'Speed Baccarat',  11),
  ('2026-09-05', 'blaze', 'Roleta',  15),
  ('2026-09-05', 'casa_apostas', 'Blackjack',   5),
  ('2026-09-05', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-09-05', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-05', 'casa_apostas', 'Roleta',  12),
  ('2026-09-05', 'esportiva_bet', 'Blackjack',  57),
  ('2026-09-05', 'esportiva_bet', 'Futebol Brasileiro', 124),
  ('2026-09-05', 'esportiva_bet', 'Speed Baccarat',  64),
  ('2026-09-05', 'esportiva_bet', 'Roleta', 328),
  ('2026-09-05', 'jonbet', 'Blackjack',   9),
  ('2026-09-05', 'jonbet', 'Futebol Brasileiro',  25),
  ('2026-09-05', 'jonbet', 'Speed Baccarat',  26),
  ('2026-09-05', 'jonbet', 'Roleta',  46)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 1841),
  ('2026-09-01', 'casa_apostas',   48),
  ('2026-09-01', 'blaze',  187),
  ('2026-09-01', 'jonbet',  342)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
