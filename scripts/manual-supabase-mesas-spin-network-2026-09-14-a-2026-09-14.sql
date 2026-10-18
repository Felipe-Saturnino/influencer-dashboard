-- Mesas Spin — 2026-09-14 a 2026-09-14: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-14', 'bateu_bet',    11930,    871,   2732,  29),
  ('2026-09-14', 'betponto_bet',        0,      0,      0,   0),
  ('2026-09-14', 'blaze',    67514,    896,   8513,  66),
  ('2026-09-14', 'brx_bet',    20747,   3397,   3609,  15),
  ('2026-09-14', 'casa_apostas',     7148,    221,   2040,  16),
  ('2026-09-14', 'donald_bet',        0,      0,      0,   0),
  ('2026-09-14', 'esportiva_bet',   443643,  26429,  80395, 530),
  ('2026-09-14', 'jonbet',    51155,  -7490,   5789,  83),
  ('2026-09-14', 'rico_bet',      437,   -267,    133,   3)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-14', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-14', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',    798,    10849,    870),
  ('2026-09-14', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',     -9,       34,     15),
  ('2026-09-14', 'Bateu Bet', 'bateu_bet', 'Roleta',     82,     1047,   1847),
  ('2026-09-14', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-14', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-14', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-14', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-14', 'Blaze', 'blaze', 'Blackjack 1',   1245,    49978,   2968),
  ('2026-09-14', 'Blaze', 'blaze', 'Futebol Brasileiro',    128,      677,    142),
  ('2026-09-14', 'Blaze', 'blaze', 'Speed Baccarat',  -1105,    10541,    435),
  ('2026-09-14', 'Blaze', 'blaze', 'Roleta',    628,     6318,   4968),
  ('2026-09-14', 'BRX Bet', 'brx_bet', 'Blackjack 1',     98,     1560,     96),
  ('2026-09-14', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',     37,      118,     40),
  ('2026-09-14', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      5,        5,      1),
  ('2026-09-14', 'BRX Bet', 'brx_bet', 'Roleta',   3257,    19064,   3472),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    318,     5535,    575),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -25,       35,      6),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -47,      538,    107),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -25,     1040,   1352),
  ('2026-09-14', 'Donald Bet', 'donald_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-14', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-14', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-14', 'Donald Bet', 'donald_bet', 'Roleta',      0,        0,      0),
  ('2026-09-14', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   5808,    67558,   3233),
  ('2026-09-14', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   -393,    74738,   3896),
  ('2026-09-14', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',    586,    31141,   2190),
  ('2026-09-14', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  20428,   270206,  71076),
  ('2026-09-14', 'Jon Bet', 'jonbet', 'Blackjack 1',    593,    30915,   1276),
  ('2026-09-14', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',  -1115,     6282,    443),
  ('2026-09-14', 'Jon Bet', 'jonbet', 'Speed Baccarat',    188,     1114,    311),
  ('2026-09-14', 'Jon Bet', 'jonbet', 'Roleta',  -7156,    12844,   3759),
  ('2026-09-14', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-14', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',    -85,      153,     54),
  ('2026-09-14', 'Rico Bet', 'rico_bet', 'Speed Baccarat',   -100,      100,      1),
  ('2026-09-14', 'Rico Bet', 'rico_bet', 'Roleta',    -82,      184,     78)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-14', 'bateu_bet', 'Blackjack',   0),
  ('2026-09-14', 'bateu_bet', 'Futebol Brasileiro',  19),
  ('2026-09-14', 'bateu_bet', 'Speed Baccarat',   2),
  ('2026-09-14', 'bateu_bet', 'Roleta',  11),
  ('2026-09-14', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-14', 'betponto_bet', 'Futebol Brasileiro',   0),
  ('2026-09-14', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-14', 'betponto_bet', 'Roleta',   0),
  ('2026-09-14', 'blaze', 'Blackjack',  32),
  ('2026-09-14', 'blaze', 'Futebol Brasileiro',  13),
  ('2026-09-14', 'blaze', 'Speed Baccarat',   8),
  ('2026-09-14', 'blaze', 'Roleta',  15),
  ('2026-09-14', 'brx_bet', 'Blackjack',   2),
  ('2026-09-14', 'brx_bet', 'Futebol Brasileiro',   6),
  ('2026-09-14', 'brx_bet', 'Speed Baccarat',   1),
  ('2026-09-14', 'brx_bet', 'Roleta',   7),
  ('2026-09-14', 'casa_apostas', 'Blackjack',   5),
  ('2026-09-14', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-09-14', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-14', 'casa_apostas', 'Roleta',   8),
  ('2026-09-14', 'donald_bet', 'Blackjack',   0),
  ('2026-09-14', 'donald_bet', 'Futebol Brasileiro',   0),
  ('2026-09-14', 'donald_bet', 'Speed Baccarat',   0),
  ('2026-09-14', 'donald_bet', 'Roleta',   0),
  ('2026-09-14', 'esportiva_bet', 'Blackjack',  63),
  ('2026-09-14', 'esportiva_bet', 'Futebol Brasileiro', 145),
  ('2026-09-14', 'esportiva_bet', 'Speed Baccarat',  96),
  ('2026-09-14', 'esportiva_bet', 'Roleta', 341),
  ('2026-09-14', 'jonbet', 'Blackjack',   8),
  ('2026-09-14', 'jonbet', 'Futebol Brasileiro',  25),
  ('2026-09-14', 'jonbet', 'Speed Baccarat',  13),
  ('2026-09-14', 'jonbet', 'Roleta',  46),
  ('2026-09-14', 'rico_bet', 'Blackjack',   0),
  ('2026-09-14', 'rico_bet', 'Futebol Brasileiro',   2),
  ('2026-09-14', 'rico_bet', 'Speed Baccarat',   1),
  ('2026-09-14', 'rico_bet', 'Roleta',   3)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 3814),
  ('2026-09-01', 'bateu_bet',  172),
  ('2026-09-01', 'brx_bet',  103),
  ('2026-09-01', 'rico_bet',    8),
  ('2026-09-01', 'donald_bet',    6),
  ('2026-09-01', 'betponto_bet',    3),
  ('2026-09-01', 'casa_apostas',   76),
  ('2026-09-01', 'blaze',  390),
  ('2026-09-01', 'jonbet',  636)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
