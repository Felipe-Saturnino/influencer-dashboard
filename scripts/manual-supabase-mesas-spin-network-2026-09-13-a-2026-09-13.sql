-- Mesas Spin — 2026-09-13 a 2026-09-13: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-13', 'bateu_bet',     8685,    706,   2843,  21),
  ('2026-09-13', 'betponto_bet',       79,      6,     48,   2),
  ('2026-09-13', 'blaze',    42502,   2434,   3862,  52),
  ('2026-09-13', 'brx_bet',    33042,   1258,   5888,  15),
  ('2026-09-13', 'casa_apostas',     7417,   -628,   1699,  13),
  ('2026-09-13', 'donald_bet',      535,     52,    991,   1),
  ('2026-09-13', 'esportiva_bet',   470010,    734,  76919, 421),
  ('2026-09-13', 'jonbet',    36415,    177,   6096,  86),
  ('2026-09-13', 'rico_bet',      251,     97,     60,   2)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-13', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',     -5,       35,      3),
  ('2026-09-13', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',    559,     7554,    908),
  ('2026-09-13', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',     40,      451,     92),
  ('2026-09-13', 'Bateu Bet', 'bateu_bet', 'Roleta',    112,      645,   1840),
  ('2026-09-13', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-13', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',      6,       79,     48),
  ('2026-09-13', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-13', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-13', 'Blaze', 'blaze', 'Blackjack 1',   1518,    36790,   1849),
  ('2026-09-13', 'Blaze', 'blaze', 'Futebol Brasileiro',    157,      675,     93),
  ('2026-09-13', 'Blaze', 'blaze', 'Speed Baccarat',     -9,      202,     81),
  ('2026-09-13', 'Blaze', 'blaze', 'Roleta',    768,     4835,   1839),
  ('2026-09-13', 'BRX Bet', 'brx_bet', 'Blackjack 1',    240,     1505,     83),
  ('2026-09-13', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',     14,       64,     12),
  ('2026-09-13', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-13', 'BRX Bet', 'brx_bet', 'Roleta',   1004,    31473,   5793),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -515,     4263,    509),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     30,       30,      1),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -229,     2727,     75),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',     86,      397,   1114),
  ('2026-09-13', 'Donald Bet', 'donald_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-13', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-13', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-13', 'Donald Bet', 'donald_bet', 'Roleta',     52,      535,    991),
  ('2026-09-13', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   2900,    48435,   2442),
  ('2026-09-13', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  -1000,    27756,   3022),
  ('2026-09-13', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',    466,    26494,   3656),
  ('2026-09-13', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  -1632,   367325,  67799),
  ('2026-09-13', 'Jon Bet', 'jonbet', 'Blackjack 1',  -1045,    24935,   1502),
  ('2026-09-13', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    -49,      887,    131),
  ('2026-09-13', 'Jon Bet', 'jonbet', 'Speed Baccarat',    255,     1440,    239),
  ('2026-09-13', 'Jon Bet', 'jonbet', 'Roleta',   1016,     9153,   4224),
  ('2026-09-13', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-13', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',    102,      226,     35),
  ('2026-09-13', 'Rico Bet', 'rico_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-13', 'Rico Bet', 'rico_bet', 'Roleta',     -5,       25,     25)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-13', 'bateu_bet', 'Blackjack',   1),
  ('2026-09-13', 'bateu_bet', 'Futebol Brasileiro',  13),
  ('2026-09-13', 'bateu_bet', 'Speed Baccarat',   5),
  ('2026-09-13', 'bateu_bet', 'Roleta',   6),
  ('2026-09-13', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-13', 'betponto_bet', 'Futebol Brasileiro',   2),
  ('2026-09-13', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-13', 'betponto_bet', 'Roleta',   0),
  ('2026-09-13', 'blaze', 'Blackjack',  34),
  ('2026-09-13', 'blaze', 'Futebol Brasileiro',   7),
  ('2026-09-13', 'blaze', 'Speed Baccarat',   7),
  ('2026-09-13', 'blaze', 'Roleta',  13),
  ('2026-09-13', 'brx_bet', 'Blackjack',   1),
  ('2026-09-13', 'brx_bet', 'Futebol Brasileiro',   4),
  ('2026-09-13', 'brx_bet', 'Speed Baccarat',   0),
  ('2026-09-13', 'brx_bet', 'Roleta',  10),
  ('2026-09-13', 'casa_apostas', 'Blackjack',   4),
  ('2026-09-13', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-09-13', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-09-13', 'casa_apostas', 'Roleta',   8),
  ('2026-09-13', 'donald_bet', 'Blackjack',   0),
  ('2026-09-13', 'donald_bet', 'Futebol Brasileiro',   0),
  ('2026-09-13', 'donald_bet', 'Speed Baccarat',   0),
  ('2026-09-13', 'donald_bet', 'Roleta',   1),
  ('2026-09-13', 'esportiva_bet', 'Blackjack',  43),
  ('2026-09-13', 'esportiva_bet', 'Futebol Brasileiro', 106),
  ('2026-09-13', 'esportiva_bet', 'Speed Baccarat',  46),
  ('2026-09-13', 'esportiva_bet', 'Roleta', 270),
  ('2026-09-13', 'jonbet', 'Blackjack',   3),
  ('2026-09-13', 'jonbet', 'Futebol Brasileiro',  27),
  ('2026-09-13', 'jonbet', 'Speed Baccarat',  15),
  ('2026-09-13', 'jonbet', 'Roleta',  44),
  ('2026-09-13', 'rico_bet', 'Blackjack',   0),
  ('2026-09-13', 'rico_bet', 'Futebol Brasileiro',   2),
  ('2026-09-13', 'rico_bet', 'Speed Baccarat',   0),
  ('2026-09-13', 'rico_bet', 'Roleta',   1)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 3532),
  ('2026-09-01', 'bateu_bet',  163),
  ('2026-09-01', 'brx_bet',   94),
  ('2026-09-01', 'rico_bet',    7),
  ('2026-09-01', 'donald_bet',    6),
  ('2026-09-01', 'betponto_bet',    3),
  ('2026-09-01', 'casa_apostas',   73),
  ('2026-09-01', 'blaze',  364),
  ('2026-09-01', 'jonbet',  593)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
