-- Mesas Spin — 2026-09-16 a 2026-09-16: Estúdio Network (bateu_bet, betponto_bet, blaze, brx_bet, casa_apostas, donald_bet, esportiva_bet, jonbet, rico_bet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-16', 'bateu_bet',     8391,   -518,   7634,  29),
  ('2026-09-16', 'betponto_bet',        0,      0,      0,   0),
  ('2026-09-16', 'blaze',    54843,   1634,   6221,  56),
  ('2026-09-16', 'brx_bet',    30620,  -2357,   1725,  13),
  ('2026-09-16', 'casa_apostas',     2445,    357,   1917,  14),
  ('2026-09-16', 'donald_bet',     4000,    855,    477,   2),
  ('2026-09-16', 'esportiva_bet',   517148,  51636,  93304, 498),
  ('2026-09-16', 'jonbet',    19759,   2274,   3910,  73),
  ('2026-09-16', 'rico_bet',       85,     -4,     82,   2)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-16', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-16', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',   -275,     5103,    664),
  ('2026-09-16', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',      0,        1,      3),
  ('2026-09-16', 'Bateu Bet', 'bateu_bet', 'Roleta',   -243,     3287,   6967),
  ('2026-09-16', 'Bet.Bet', 'betponto_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-16', 'Bet.Bet', 'betponto_bet', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-16', 'Bet.Bet', 'betponto_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-16', 'Bet.Bet', 'betponto_bet', 'Roleta',      0,        0,      0),
  ('2026-09-16', 'Blaze', 'blaze', 'Blackjack 1',   1390,    36390,   2113),
  ('2026-09-16', 'Blaze', 'blaze', 'Futebol Brasileiro',    196,      543,     58),
  ('2026-09-16', 'Blaze', 'blaze', 'Speed Baccarat',    363,     3507,    202),
  ('2026-09-16', 'Blaze', 'blaze', 'Roleta',   -315,    14403,   3848),
  ('2026-09-16', 'BRX Bet', 'brx_bet', 'Blackjack 1',      5,    13033,    638),
  ('2026-09-16', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',   -167,      276,     37),
  ('2026-09-16', 'BRX Bet', 'brx_bet', 'Speed Baccarat',      1,       15,     14),
  ('2026-09-16', 'BRX Bet', 'brx_bet', 'Roleta',  -2196,    17296,   1036),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     10,       10,      1),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    203,     1456,    414),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Roleta',    144,      979,   1502),
  ('2026-09-16', 'Donald Bet', 'donald_bet', 'Blackjack 1',    613,     2930,    270),
  ('2026-09-16', 'Donald Bet', 'donald_bet', 'Futebol Brasileiro',     -7,       11,      6),
  ('2026-09-16', 'Donald Bet', 'donald_bet', 'Speed Baccarat',      3,        4,      8),
  ('2026-09-16', 'Donald Bet', 'donald_bet', 'Roleta',    246,     1055,    193),
  ('2026-09-16', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',    898,    41638,   3331),
  ('2026-09-16', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  12175,    81996,   6048),
  ('2026-09-16', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',     77,    25783,   2230),
  ('2026-09-16', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  38486,   367731,  81695),
  ('2026-09-16', 'Jon Bet', 'jonbet', 'Blackjack 1',    208,     6085,    407),
  ('2026-09-16', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   1390,     5093,    169),
  ('2026-09-16', 'Jon Bet', 'jonbet', 'Speed Baccarat',    106,      605,    158),
  ('2026-09-16', 'Jon Bet', 'jonbet', 'Roleta',    570,     7976,   3176),
  ('2026-09-16', 'Rico Bet', 'rico_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-16', 'Rico Bet', 'rico_bet', 'Futebol Brasileiro',     -7,       60,     57),
  ('2026-09-16', 'Rico Bet', 'rico_bet', 'Speed Baccarat',      0,        0,      0),
  ('2026-09-16', 'Rico Bet', 'rico_bet', 'Roleta',      3,       25,     25)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-16', 'bateu_bet', 'Blackjack',   0),
  ('2026-09-16', 'bateu_bet', 'Futebol Brasileiro',  18),
  ('2026-09-16', 'bateu_bet', 'Speed Baccarat',   1),
  ('2026-09-16', 'bateu_bet', 'Roleta',  12),
  ('2026-09-16', 'betponto_bet', 'Blackjack',   0),
  ('2026-09-16', 'betponto_bet', 'Futebol Brasileiro',   0),
  ('2026-09-16', 'betponto_bet', 'Speed Baccarat',   0),
  ('2026-09-16', 'betponto_bet', 'Roleta',   0),
  ('2026-09-16', 'blaze', 'Blackjack',  26),
  ('2026-09-16', 'blaze', 'Futebol Brasileiro',   9),
  ('2026-09-16', 'blaze', 'Speed Baccarat',   8),
  ('2026-09-16', 'blaze', 'Roleta',  16),
  ('2026-09-16', 'brx_bet', 'Blackjack',   2),
  ('2026-09-16', 'brx_bet', 'Futebol Brasileiro',   5),
  ('2026-09-16', 'brx_bet', 'Speed Baccarat',   1),
  ('2026-09-16', 'brx_bet', 'Roleta',   6),
  ('2026-09-16', 'casa_apostas', 'Blackjack',   1),
  ('2026-09-16', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-09-16', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-16', 'casa_apostas', 'Roleta',   8),
  ('2026-09-16', 'donald_bet', 'Blackjack',   1),
  ('2026-09-16', 'donald_bet', 'Futebol Brasileiro',   1),
  ('2026-09-16', 'donald_bet', 'Speed Baccarat',   1),
  ('2026-09-16', 'donald_bet', 'Roleta',   2),
  ('2026-09-16', 'esportiva_bet', 'Blackjack',  39),
  ('2026-09-16', 'esportiva_bet', 'Futebol Brasileiro', 136),
  ('2026-09-16', 'esportiva_bet', 'Speed Baccarat',  54),
  ('2026-09-16', 'esportiva_bet', 'Roleta', 312),
  ('2026-09-16', 'jonbet', 'Blackjack',   8),
  ('2026-09-16', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-09-16', 'jonbet', 'Speed Baccarat',  10),
  ('2026-09-16', 'jonbet', 'Roleta',  42),
  ('2026-09-16', 'rico_bet', 'Blackjack',   0),
  ('2026-09-16', 'rico_bet', 'Futebol Brasileiro',   2),
  ('2026-09-16', 'rico_bet', 'Speed Baccarat',   0),
  ('2026-09-16', 'rico_bet', 'Roleta',   1)
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
