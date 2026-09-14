-- Mesas Spin — 2026-09-10 a 2026-09-10: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-10', 'bateu_bet',    20490,   1660,   5736,  36),
  ('2026-09-10', 'betponto_bet',        0,      0,      0,   0),
  ('2026-09-10', 'blaze',   128934,   4112,   6833,  68),
  ('2026-09-10', 'brx_bet',    20573,  -2130,   5987,  10),
  ('2026-09-10', 'casa_apostas',    22225,   1725,   4908,  18),
  ('2026-09-10', 'donald_bet',        0,      0,      0,   0),
  ('2026-09-10', 'esportiva_bet',  2069150, 115503, 156914, 587),
  ('2026-09-10', 'jonbet',    45693,  -3699,   3793,  71),
  ('2026-09-10', 'rico_bet',      109,    -36,     85,   3)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-10', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',    100,     1525,    143),
  ('2026-09-10', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',    938,     4877,    222),
  ('2026-09-10', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',  -1669,     4155,    113),
  ('2026-09-10', 'Bateu Bet', 'bateu_bet', 'Roleta',   2291,     9933,   5258),
  ('2026-09-10', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-10', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-10', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-10', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-10', 'Blaze', 'blaze', 'Blackjack 1',   -287,    71733,   3179),
  ('2026-09-10', 'Blaze', 'blaze', 'Futebol Brasileiro',    456,    42501,    469),
  ('2026-09-10', 'Blaze', 'blaze', 'Speed Baccarat',     59,     3745,    212),
  ('2026-09-10', 'Blaze', 'blaze', 'Roleta',   3884,    10955,   2973),
  ('2026-09-10', 'BRX Bet', 'brx_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-10', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',     21,      125,     47),
  ('2026-09-10', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-10', 'BRX Bet', 'brx_bet', 'Roleta',  -2151,    20448,   5940),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   1698,    16430,    358),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     10,       85,     16),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     72,     4070,   1035),
  ('2026-09-10', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -55,     1640,   3499),
  ('2026-09-10', 'Donald Bet', 'donald_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-10', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-10', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-10', 'Donald Bet', 'donald_bet', 'Roleta',      0,        0,      0),
  ('2026-09-10', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   9318,   151130,   3292),
  ('2026-09-10', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1717,    64729,   4049),
  ('2026-09-10', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   -689,   128001,   4005),
  ('2026-09-10', 'Esportiva Bet', 'esportiva_bet', 'Roleta', 105157,  1725290, 145568),
  ('2026-09-10', 'Jon Bet', 'jonbet', 'Blackjack 1',  -1060,    15060,   1120),
  ('2026-09-10', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   -115,     2081,    172),
  ('2026-09-10', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -596,     8667,    847),
  ('2026-09-10', 'Jon Bet', 'jonbet', 'Roleta',  -1928,    19885,   1654),
  ('2026-09-10', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-10', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',     -9,       25,     25),
  ('2026-09-10', 'Rico Bet', 'rico_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-10', 'Rico Bet', 'rico_bet', 'Roleta',    -27,       84,     60)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-10', 'bateu_bet', 'Blackjack',   1),
  ('2026-09-10', 'bateu_bet', 'Futebol Brasileiro',  17),
  ('2026-09-10', 'bateu_bet', 'Speed Baccarat',   3),
  ('2026-09-10', 'bateu_bet', 'Roleta',  18),
  ('2026-09-10', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-10', 'betponto_bet', 'Futebol Brasileiro',   0),
  ('2026-09-10', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-10', 'betponto_bet', 'Roleta',   0),
  ('2026-09-10', 'blaze', 'Blackjack',  32),
  ('2026-09-10', 'blaze', 'Futebol Brasileiro',  12),
  ('2026-09-10', 'blaze', 'Speed Baccarat',  12),
  ('2026-09-10', 'blaze', 'Roleta',  22),
  ('2026-09-10', 'brx_bet', 'Blackjack',   0),
  ('2026-09-10', 'brx_bet', 'Futebol Brasileiro',   3),
  ('2026-09-10', 'brx_bet', 'Speed Baccarat',   0),
  ('2026-09-10', 'brx_bet', 'Roleta',   8),
  ('2026-09-10', 'casa_apostas', 'Blackjack',   4),
  ('2026-09-10', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-09-10', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-10', 'casa_apostas', 'Roleta',  10),
  ('2026-09-10', 'donald_bet', 'Blackjack',   0),
  ('2026-09-10', 'donald_bet', 'Futebol Brasileiro',   0),
  ('2026-09-10', 'donald_bet', 'Speed Baccarat',   0),
  ('2026-09-10', 'donald_bet', 'Roleta',   0),
  ('2026-09-10', 'esportiva_bet', 'Blackjack',  51),
  ('2026-09-10', 'esportiva_bet', 'Futebol Brasileiro', 138),
  ('2026-09-10', 'esportiva_bet', 'Speed Baccarat',  75),
  ('2026-09-10', 'esportiva_bet', 'Roleta', 381),
  ('2026-09-10', 'jonbet', 'Blackjack',  10),
  ('2026-09-10', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-09-10', 'jonbet', 'Speed Baccarat',  24),
  ('2026-09-10', 'jonbet', 'Roleta',  29),
  ('2026-09-10', 'rico_bet', 'Blackjack',   0),
  ('2026-09-10', 'rico_bet', 'Futebol Brasileiro',   1),
  ('2026-09-10', 'rico_bet', 'Speed Baccarat',   0),
  ('2026-09-10', 'rico_bet', 'Roleta',   3)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 3055),
  ('2026-09-01', 'bateu_bet',  129),
  ('2026-09-01', 'brx_bet',   75),
  ('2026-09-01', 'rico_bet',    4),
  ('2026-09-01', 'donald_bet',    4),
  ('2026-09-01', 'betponto_bet',    1),
  ('2026-09-01', 'casa_apostas',   64),
  ('2026-09-01', 'blaze',  319),
  ('2026-09-01', 'jonbet',  506)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
