-- Mesas Spin — 2026-09-15 a 2026-09-15: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-15', 'bateu_bet',    10221,   1357,   4220,  36),
  ('2026-09-15', 'betponto_bet',        0,      0,      0,   0),
  ('2026-09-15', 'blaze',    81482,   1227,   5772,  54),
  ('2026-09-15', 'brx_bet',    15080,   1571,    703,  16),
  ('2026-09-15', 'casa_apostas',     6054,    673,   3812,  15),
  ('2026-09-15', 'donald_bet',      892,   -245,    875,   2),
  ('2026-09-15', 'esportiva_bet',   872152, 105179, 120019, 531),
  ('2026-09-15', 'jonbet',    26851,   5969,   5532,  81),
  ('2026-09-15', 'rico_bet',       60,    -13,     55,   2)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-15', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-15', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',   1192,     8451,    592),
  ('2026-09-15', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',     -3,       36,     21),
  ('2026-09-15', 'Bateu Bet', 'bateu_bet', 'Roleta',    168,     1734,   3607),
  ('2026-09-15', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-15', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-15', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-15', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-15', 'Blaze', 'blaze', 'Blackjack 1',   1683,    69453,   3379),
  ('2026-09-15', 'Blaze', 'blaze', 'Futebol Brasileiro',    240,     2444,    309),
  ('2026-09-15', 'Blaze', 'blaze', 'Speed Baccarat',   -360,     6045,    407),
  ('2026-09-15', 'Blaze', 'blaze', 'Roleta',   -336,     3540,   1677),
  ('2026-09-15', 'BRX Bet', 'brx_bet', 'Blackjack 1',   -402,     7118,    306),
  ('2026-09-15', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',    -26,      180,     67),
  ('2026-09-15', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-15', 'BRX Bet', 'brx_bet', 'Roleta',   1999,     7782,    330),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    168,     1800,    168),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     50,      260,     25),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     18,      956,    258),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',    437,     3038,   3361),
  ('2026-09-15', 'Donald Bet', 'donald_bet', 'Blackjack 1',   -315,      480,     47),
  ('2026-09-15', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-15', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-15', 'Donald Bet', 'donald_bet', 'Roleta',     70,      412,    828),
  ('2026-09-15', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  -2375,    51570,   2436),
  ('2026-09-15', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   9746,    65422,   4684),
  ('2026-09-15', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   7744,    43170,   2204),
  ('2026-09-15', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  90064,   711990, 110695),
  ('2026-09-15', 'Jon Bet', 'jonbet', 'Blackjack 1',   1045,     5895,    399),
  ('2026-09-15', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   2946,     5156,    268),
  ('2026-09-15', 'Jon Bet', 'jonbet', 'Speed Baccarat',     60,     1829,   1159),
  ('2026-09-15', 'Jon Bet', 'jonbet', 'Roleta',   1918,    13971,   3706),
  ('2026-09-15', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-15', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',    -12,       55,     50),
  ('2026-09-15', 'Rico Bet', 'rico_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-15', 'Rico Bet', 'rico_bet', 'Roleta',     -1,        5,      5)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-15', 'bateu_bet', 'Blackjack',   0),
  ('2026-09-15', 'bateu_bet', 'Futebol Brasileiro',  20),
  ('2026-09-15', 'bateu_bet', 'Speed Baccarat',   3),
  ('2026-09-15', 'bateu_bet', 'Roleta',  14),
  ('2026-09-15', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-15', 'betponto_bet', 'Futebol Brasileiro',   0),
  ('2026-09-15', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-15', 'betponto_bet', 'Roleta',   0),
  ('2026-09-15', 'blaze', 'Blackjack',  25),
  ('2026-09-15', 'blaze', 'Futebol Brasileiro',  14),
  ('2026-09-15', 'blaze', 'Speed Baccarat',   9),
  ('2026-09-15', 'blaze', 'Roleta',  15),
  ('2026-09-15', 'brx_bet', 'Blackjack',   5),
  ('2026-09-15', 'brx_bet', 'Futebol Brasileiro',   5),
  ('2026-09-15', 'brx_bet', 'Speed Baccarat',   0),
  ('2026-09-15', 'brx_bet', 'Roleta',   7),
  ('2026-09-15', 'casa_apostas', 'Blackjack',   1),
  ('2026-09-15', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-09-15', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-15', 'casa_apostas', 'Roleta',  10),
  ('2026-09-15', 'donald_bet', 'Blackjack',   1),
  ('2026-09-15', 'donald_bet', 'Futebol Brasileiro',   0),
  ('2026-09-15', 'donald_bet', 'Speed Baccarat',   0),
  ('2026-09-15', 'donald_bet', 'Roleta',   1),
  ('2026-09-15', 'esportiva_bet', 'Blackjack',  45),
  ('2026-09-15', 'esportiva_bet', 'Futebol Brasileiro', 147),
  ('2026-09-15', 'esportiva_bet', 'Speed Baccarat',  77),
  ('2026-09-15', 'esportiva_bet', 'Roleta', 324),
  ('2026-09-15', 'jonbet', 'Blackjack',   5),
  ('2026-09-15', 'jonbet', 'Futebol Brasileiro',  24),
  ('2026-09-15', 'jonbet', 'Speed Baccarat',  16),
  ('2026-09-15', 'jonbet', 'Roleta',  43),
  ('2026-09-15', 'rico_bet', 'Blackjack',   0),
  ('2026-09-15', 'rico_bet', 'Futebol Brasileiro',   2),
  ('2026-09-15', 'rico_bet', 'Speed Baccarat',   0),
  ('2026-09-15', 'rico_bet', 'Roleta',   1)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 3998),
  ('2026-09-01', 'bateu_bet',  183),
  ('2026-09-01', 'brx_bet',  116),
  ('2026-09-01', 'rico_bet',    8),
  ('2026-09-01', 'donald_bet',    7),
  ('2026-09-01', 'betponto_bet',    3),
  ('2026-09-01', 'casa_apostas',   81),
  ('2026-09-01', 'blaze',  407),
  ('2026-09-01', 'jonbet',  660)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
