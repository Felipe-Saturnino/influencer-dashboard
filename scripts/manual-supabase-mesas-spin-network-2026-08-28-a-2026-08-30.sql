-- Mesas Spin — 2026-08-28 a 2026-08-30: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-28', 'blaze',    45222,   4026,   4104,  52),
  ('2026-08-28', 'casa_apostas',     2938,     76,   2568,   9),
  ('2026-08-28', 'esportiva_bet',  1606406, 118727, 191561, 419),
  ('2026-08-28', 'jonbet',   111280,   4331,  25061, 103),
  ('2026-08-29', 'blaze',    25440,    920,   5809,  46),
  ('2026-08-29', 'casa_apostas',     6035,    189,   7709,  12),
  ('2026-08-29', 'esportiva_bet',   605778,  16632, 132688, 409),
  ('2026-08-29', 'jonbet',    44415,   8839,   8523,  80),
  ('2026-08-30', 'blaze',    26584,     83,   4840,  35),
  ('2026-08-30', 'casa_apostas',     1443,    540,    499,   9),
  ('2026-08-30', 'esportiva_bet',   632436,  27669, 128182, 360),
  ('2026-08-30', 'jonbet',    21566,    966,   7327,  82)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-28', 'Blaze', 'blaze', 'Blackjack 1',   3110,    40738,   1240),
  ('2026-08-28', 'Blaze', 'blaze', 'Futebol Brasileiro',    278,      694,    172),
  ('2026-08-28', 'Blaze', 'blaze', 'Speed Baccarat',   -112,      967,    186),
  ('2026-08-28', 'Blaze', 'blaze', 'Roleta',    750,     2823,   2506),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    -17,     1248,    116),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,       45,      9),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    127,      869,    200),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -34,      776,   2243),
  ('2026-08-28', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   8998,    72083,   2677),
  ('2026-08-28', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   -645,    26512,   1986),
  ('2026-08-28', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -3758,   163050,   1446),
  ('2026-08-28', 'Esportiva Bet', 'esportiva_bet', 'Roleta', 114132,  1344761, 185452),
  ('2026-08-28', 'Jon Bet', 'jonbet', 'Blackjack 1',    135,     2680,    262),
  ('2026-08-28', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    202,      862,    154),
  ('2026-08-28', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -334,     5912,    761),
  ('2026-08-28', 'Jon Bet', 'jonbet', 'Roleta',   4328,   101826,  23884),
  ('2026-08-29', 'Blaze', 'blaze', 'Blackjack 1',   1370,    18070,   1159),
  ('2026-08-29', 'Blaze', 'blaze', 'Futebol Brasileiro',    173,      907,    223),
  ('2026-08-29', 'Blaze', 'blaze', 'Speed Baccarat',   -641,     2745,     83),
  ('2026-08-29', 'Blaze', 'blaze', 'Roleta',     18,     3718,   4344),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    140,      470,     32),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     -5,        5,      1),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -109,     1737,    461),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Roleta',    163,     3823,   7215),
  ('2026-08-29', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   2908,    38720,   1737),
  ('2026-08-29', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1834,    36475,   2455),
  ('2026-08-29', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   6593,    82833,   1594),
  ('2026-08-29', 'Esportiva Bet', 'esportiva_bet', 'Roleta',   5297,   447750, 126902),
  ('2026-08-29', 'Jon Bet', 'jonbet', 'Blackjack 1',    210,      835,     62),
  ('2026-08-29', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   1188,     1525,    118),
  ('2026-08-29', 'Jon Bet', 'jonbet', 'Speed Baccarat',   5091,    28214,    536),
  ('2026-08-29', 'Jon Bet', 'jonbet', 'Roleta',   2350,    13841,   7807),
  ('2026-08-30', 'Blaze', 'blaze', 'Blackjack 1',    268,    11565,    683),
  ('2026-08-30', 'Blaze', 'blaze', 'Futebol Brasileiro',   -104,     2451,    585),
  ('2026-08-30', 'Blaze', 'blaze', 'Speed Baccarat',   -282,     3011,    321),
  ('2026-08-30', 'Blaze', 'blaze', 'Roleta',    201,     9557,   3251),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    500,      865,     15),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -50,      150,      2),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     50,      220,    149),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Roleta',     40,      208,    333),
  ('2026-08-30', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   -680,    38473,   1771),
  ('2026-08-30', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',    414,    19792,   2085),
  ('2026-08-30', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   4683,    27004,   1102),
  ('2026-08-30', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  23252,   547167, 123224),
  ('2026-08-30', 'Jon Bet', 'jonbet', 'Blackjack 1',    475,     2410,    158),
  ('2026-08-30', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    122,      790,    228),
  ('2026-08-30', 'Jon Bet', 'jonbet', 'Speed Baccarat',    436,     1651,    649),
  ('2026-08-30', 'Jon Bet', 'jonbet', 'Roleta',    -67,    16715,   6292)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-28', 'blaze', 'Blackjack',  26),
  ('2026-08-28', 'blaze', 'Futebol Brasileiro',   6),
  ('2026-08-28', 'blaze', 'Speed Baccarat',  11),
  ('2026-08-28', 'blaze', 'Roleta',  13),
  ('2026-08-28', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-28', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-08-28', 'casa_apostas', 'Speed Baccarat',   2),
  ('2026-08-28', 'casa_apostas', 'Roleta',   4),
  ('2026-08-28', 'esportiva_bet', 'Blackjack',  60),
  ('2026-08-28', 'esportiva_bet', 'Futebol Brasileiro',  84),
  ('2026-08-28', 'esportiva_bet', 'Speed Baccarat',  46),
  ('2026-08-28', 'esportiva_bet', 'Roleta', 273),
  ('2026-08-28', 'jonbet', 'Blackjack',  13),
  ('2026-08-28', 'jonbet', 'Futebol Brasileiro',  26),
  ('2026-08-28', 'jonbet', 'Speed Baccarat',  25),
  ('2026-08-28', 'jonbet', 'Roleta',  49),
  ('2026-08-29', 'blaze', 'Blackjack',  24),
  ('2026-08-29', 'blaze', 'Futebol Brasileiro',   9),
  ('2026-08-29', 'blaze', 'Speed Baccarat',  10),
  ('2026-08-29', 'blaze', 'Roleta',  11),
  ('2026-08-29', 'casa_apostas', 'Blackjack',   3),
  ('2026-08-29', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-29', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-08-29', 'casa_apostas', 'Roleta',   5),
  ('2026-08-29', 'esportiva_bet', 'Blackjack',  49),
  ('2026-08-29', 'esportiva_bet', 'Futebol Brasileiro',  97),
  ('2026-08-29', 'esportiva_bet', 'Speed Baccarat',  52),
  ('2026-08-29', 'esportiva_bet', 'Roleta', 257),
  ('2026-08-29', 'jonbet', 'Blackjack',   4),
  ('2026-08-29', 'jonbet', 'Futebol Brasileiro',  21),
  ('2026-08-29', 'jonbet', 'Speed Baccarat',  28),
  ('2026-08-29', 'jonbet', 'Roleta',  35),
  ('2026-08-30', 'blaze', 'Blackjack',  14),
  ('2026-08-30', 'blaze', 'Futebol Brasileiro',   8),
  ('2026-08-30', 'blaze', 'Speed Baccarat',   9),
  ('2026-08-30', 'blaze', 'Roleta',   9),
  ('2026-08-30', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-30', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-30', 'casa_apostas', 'Speed Baccarat',   4),
  ('2026-08-30', 'casa_apostas', 'Roleta',   2),
  ('2026-08-30', 'esportiva_bet', 'Blackjack',  43),
  ('2026-08-30', 'esportiva_bet', 'Futebol Brasileiro',  93),
  ('2026-08-30', 'esportiva_bet', 'Speed Baccarat',  54),
  ('2026-08-30', 'esportiva_bet', 'Roleta', 211),
  ('2026-08-30', 'jonbet', 'Blackjack',   6),
  ('2026-08-30', 'jonbet', 'Futebol Brasileiro',  16),
  ('2026-08-30', 'jonbet', 'Speed Baccarat',  29),
  ('2026-08-30', 'jonbet', 'Roleta',  39)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 5320),
  ('2026-08-01', 'casa_apostas',  148),
  ('2026-08-01', 'blaze', 1100),
  ('2026-08-01', 'jonbet', 1872)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
