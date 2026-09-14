-- Mesas Spin — 2026-09-09 a 2026-09-09: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-09', 'bateu_bet',    12207,    198,   6540,  40),
  ('2026-09-09', 'betponto_bet',        1,     -1,      1,   1),
  ('2026-09-09', 'blaze',   132779,    108,  15034,  63),
  ('2026-09-09', 'brx_bet',    80555,   1024,  16869,   6),
  ('2026-09-09', 'casa_apostas',     7263,   1114,   2204,  20),
  ('2026-09-09', 'donald_bet',        6,     -3,     21,   2),
  ('2026-09-09', 'esportiva_bet',  1659413, -26664, 147708, 560),
  ('2026-09-09', 'jonbet',   112061,  18673,   3746,  63),
  ('2026-09-09', 'rico_bet',       43,      4,     43,   2)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-09', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-09', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',   -521,     6013,    341),
  ('2026-09-09', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',      4,       27,     18),
  ('2026-09-09', 'Bateu Bet', 'bateu_bet', 'Roleta',    715,     6167,   6181),
  ('2026-09-09', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-09', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',     -1,        1,      1),
  ('2026-09-09', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-09', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-09', 'Blaze', 'blaze', 'Blackjack 1',   1813,    97563,   4832),
  ('2026-09-09', 'Blaze', 'blaze', 'Futebol Brasileiro',   -987,    16774,    315),
  ('2026-09-09', 'Blaze', 'blaze', 'Speed Baccarat',    109,     1073,    378),
  ('2026-09-09', 'Blaze', 'blaze', 'Roleta',   -827,    17369,   9509),
  ('2026-09-09', 'BRX Bet', 'brx_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-09', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',     10,       40,      2),
  ('2026-09-09', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-09', 'BRX Bet', 'brx_bet', 'Roleta',   1014,    80515,  16867),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    793,     1665,    125),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    410,     2125,    103),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     10,     1270,    344),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -99,     2203,   1632),
  ('2026-09-09', 'Donald Bet', 'donald_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-09', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',      1,        1,      1),
  ('2026-09-09', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-09', 'Donald Bet', 'donald_bet', 'Roleta',     -4,        5,     20),
  ('2026-09-09', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   4045,    67813,   2130),
  ('2026-09-09', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  -5399,    55514,   4154),
  ('2026-09-09', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   1357,    40903,   3449),
  ('2026-09-09', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -26667,  1495183, 137975),
  ('2026-09-09', 'Jon Bet', 'jonbet', 'Blackjack 1',    408,     7980,    718),
  ('2026-09-09', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    532,      796,    217),
  ('2026-09-09', 'Jon Bet', 'jonbet', 'Speed Baccarat',  -1492,     5072,    582),
  ('2026-09-09', 'Jon Bet', 'jonbet', 'Roleta',  19225,    98213,   2229),
  ('2026-09-09', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-09', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',     -1,        2,      3),
  ('2026-09-09', 'Rico Bet', 'rico_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-09', 'Rico Bet', 'rico_bet', 'Roleta',      5,       41,     40)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-09', 'bateu_bet', 'Blackjack',   0),
  ('2026-09-09', 'bateu_bet', 'Futebol Brasileiro',  16),
  ('2026-09-09', 'bateu_bet', 'Speed Baccarat',   1),
  ('2026-09-09', 'bateu_bet', 'Roleta',  24),
  ('2026-09-09', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-09', 'betponto_bet', 'Futebol Brasileiro',   1),
  ('2026-09-09', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-09', 'betponto_bet', 'Roleta',   0),
  ('2026-09-09', 'blaze', 'Blackjack',  37),
  ('2026-09-09', 'blaze', 'Futebol Brasileiro',  11),
  ('2026-09-09', 'blaze', 'Speed Baccarat',   7),
  ('2026-09-09', 'blaze', 'Roleta',  17),
  ('2026-09-09', 'brx_bet', 'Blackjack',   0),
  ('2026-09-09', 'brx_bet', 'Futebol Brasileiro',   1),
  ('2026-09-09', 'brx_bet', 'Speed Baccarat',   0),
  ('2026-09-09', 'brx_bet', 'Roleta',   6),
  ('2026-09-09', 'casa_apostas', 'Blackjack',   4),
  ('2026-09-09', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-09-09', 'casa_apostas', 'Speed Baccarat',   9),
  ('2026-09-09', 'casa_apostas', 'Roleta',  10),
  ('2026-09-09', 'donald_bet', 'Blackjack',   0),
  ('2026-09-09', 'donald_bet', 'Futebol Brasileiro',   1),
  ('2026-09-09', 'donald_bet', 'Speed Baccarat',   0),
  ('2026-09-09', 'donald_bet', 'Roleta',   1),
  ('2026-09-09', 'esportiva_bet', 'Blackjack',  50),
  ('2026-09-09', 'esportiva_bet', 'Futebol Brasileiro', 134),
  ('2026-09-09', 'esportiva_bet', 'Speed Baccarat',  66),
  ('2026-09-09', 'esportiva_bet', 'Roleta', 370),
  ('2026-09-09', 'jonbet', 'Blackjack',  11),
  ('2026-09-09', 'jonbet', 'Futebol Brasileiro',  17),
  ('2026-09-09', 'jonbet', 'Speed Baccarat',  16),
  ('2026-09-09', 'jonbet', 'Roleta',  27),
  ('2026-09-09', 'rico_bet', 'Blackjack',   0),
  ('2026-09-09', 'rico_bet', 'Futebol Brasileiro',   1),
  ('2026-09-09', 'rico_bet', 'Speed Baccarat',   0),
  ('2026-09-09', 'rico_bet', 'Roleta',   1)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
