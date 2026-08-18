-- Mesas Spin — 2026-08-14 a 2026-08-16: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-14', 'blaze',    54650,   -109,  25945,  99),
  ('2026-08-14', 'casa_apostas',     5608,   -607,   1383,  15),
  ('2026-08-14', 'esportiva_bet',  1129564, -23316,  82382, 326),
  ('2026-08-14', 'jonbet',    36644,   1292,   5763, 161),
  ('2026-08-15', 'blaze',    65655,   1945,  22525, 108),
  ('2026-08-15', 'casa_apostas',    38899,  11765,   2861,  11),
  ('2026-08-15', 'esportiva_bet',   702168,  65463,  72530, 301),
  ('2026-08-15', 'jonbet',    50164,    307,   8384, 143),
  ('2026-08-16', 'blaze',    41657,    779,  17638,  84),
  ('2026-08-16', 'casa_apostas',     1468,     28,   1480,  10),
  ('2026-08-16', 'esportiva_bet',   455341,   7377,  48114, 236),
  ('2026-08-16', 'jonbet',    53604,    580,  10243, 113)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-14', 'Blaze', 'blaze', 'Blackjack 1',   1210,    20725,   1511),
  ('2026-08-14', 'Blaze', 'blaze', 'Futebol Brasileiro',   -290,     2580,    765),
  ('2026-08-14', 'Blaze', 'blaze', 'Speed Baccarat',  -1649,    11902,    284),
  ('2026-08-14', 'Blaze', 'blaze', 'Roleta',    620,    19443,  23385),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     -5,      685,     43),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -112,     1292,    245),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Roleta',   -490,     3631,   1095),
  ('2026-08-14', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',    523,     8808,    636),
  ('2026-08-14', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  16152,   104166,   2188),
  ('2026-08-14', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat', -21067,   586205,   2334),
  ('2026-08-14', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -18924,   430385,  77224),
  ('2026-08-14', 'Jon Bet', 'jonbet', 'Blackjack 1',   1773,    17290,    886),
  ('2026-08-14', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',      6,     1087,    333),
  ('2026-08-14', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -201,    13518,   1792),
  ('2026-08-14', 'Jon Bet', 'jonbet', 'Roleta',   -286,     4749,   2752),
  ('2026-08-15', 'Blaze', 'blaze', 'Blackjack 1',    978,    42740,   2391),
  ('2026-08-15', 'Blaze', 'blaze', 'Futebol Brasileiro',    115,     5911,    942),
  ('2026-08-15', 'Blaze', 'blaze', 'Speed Baccarat',      5,     1346,    207),
  ('2026-08-15', 'Blaze', 'blaze', 'Roleta',    847,    15658,  18985),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  13178,    16855,    119),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  -1765,    19975,     54),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    283,      785,    185),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',     69,     1284,   2503),
  ('2026-08-15', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   2188,    28965,   2087),
  ('2026-08-15', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   4143,   118180,   2438),
  ('2026-08-15', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   9220,   143734,   3137),
  ('2026-08-15', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  49912,   411289,  64868),
  ('2026-08-15', 'Jon Bet', 'jonbet', 'Blackjack 1',   1260,    13803,    973),
  ('2026-08-15', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    473,     1174,    265),
  ('2026-08-15', 'Jon Bet', 'jonbet', 'Speed Baccarat',  -1248,    28451,   1988),
  ('2026-08-15', 'Jon Bet', 'jonbet', 'Roleta',   -178,     6736,   5158),
  ('2026-08-16', 'Blaze', 'blaze', 'Blackjack 1',    375,    19328,   1192),
  ('2026-08-16', 'Blaze', 'blaze', 'Futebol Brasileiro',    306,     3329,    574),
  ('2026-08-16', 'Blaze', 'blaze', 'Speed Baccarat',   -491,     3337,    592),
  ('2026-08-16', 'Blaze', 'blaze', 'Roleta',    589,    15663,  15280),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     30,      670,     56),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     18,      100,     20),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      3,       18,     37),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -23,      680,   1367),
  ('2026-08-16', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  -1235,    22530,   1208),
  ('2026-08-16', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   2972,    29675,   1676),
  ('2026-08-16', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -6834,   165507,   2109),
  ('2026-08-16', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  12474,   237629,  43121),
  ('2026-08-16', 'Jon Bet', 'jonbet', 'Blackjack 1',    135,     9325,    508),
  ('2026-08-16', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    -54,      943,    226),
  ('2026-08-16', 'Jon Bet', 'jonbet', 'Speed Baccarat',   2524,    27729,   1435),
  ('2026-08-16', 'Jon Bet', 'jonbet', 'Roleta',  -2025,    15607,   8074)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-14', 'blaze', 'Blackjack',  31),
  ('2026-08-14', 'blaze', 'Futebol Brasileiro',  22),
  ('2026-08-14', 'blaze', 'Speed Baccarat',  14),
  ('2026-08-14', 'blaze', 'Roleta',  48),
  ('2026-08-14', 'casa_apostas', 'Blackjack',   3),
  ('2026-08-14', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-08-14', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-08-14', 'casa_apostas', 'Roleta',   8),
  ('2026-08-14', 'esportiva_bet', 'Blackjack',  19),
  ('2026-08-14', 'esportiva_bet', 'Futebol Brasileiro',  97),
  ('2026-08-14', 'esportiva_bet', 'Speed Baccarat',  51),
  ('2026-08-14', 'esportiva_bet', 'Roleta', 173),
  ('2026-08-14', 'jonbet', 'Blackjack',  24),
  ('2026-08-14', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-14', 'jonbet', 'Speed Baccarat', 112),
  ('2026-08-14', 'jonbet', 'Roleta',  32),
  ('2026-08-15', 'blaze', 'Blackjack',  31),
  ('2026-08-15', 'blaze', 'Futebol Brasileiro',  28),
  ('2026-08-15', 'blaze', 'Speed Baccarat',   6),
  ('2026-08-15', 'blaze', 'Roleta',  49),
  ('2026-08-15', 'casa_apostas', 'Blackjack',   5),
  ('2026-08-15', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-08-15', 'casa_apostas', 'Speed Baccarat',   3),
  ('2026-08-15', 'casa_apostas', 'Roleta',   4),
  ('2026-08-15', 'esportiva_bet', 'Blackjack',  24),
  ('2026-08-15', 'esportiva_bet', 'Futebol Brasileiro',  77),
  ('2026-08-15', 'esportiva_bet', 'Speed Baccarat',  59),
  ('2026-08-15', 'esportiva_bet', 'Roleta', 160),
  ('2026-08-15', 'jonbet', 'Blackjack',  19),
  ('2026-08-15', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-08-15', 'jonbet', 'Speed Baccarat',  88),
  ('2026-08-15', 'jonbet', 'Roleta',  33),
  ('2026-08-16', 'blaze', 'Blackjack',  26),
  ('2026-08-16', 'blaze', 'Futebol Brasileiro',  19),
  ('2026-08-16', 'blaze', 'Speed Baccarat',   5),
  ('2026-08-16', 'blaze', 'Roleta',  38),
  ('2026-08-16', 'casa_apostas', 'Blackjack',   5),
  ('2026-08-16', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-16', 'casa_apostas', 'Speed Baccarat',   3),
  ('2026-08-16', 'casa_apostas', 'Roleta',   5),
  ('2026-08-16', 'esportiva_bet', 'Blackjack',  20),
  ('2026-08-16', 'esportiva_bet', 'Futebol Brasileiro',  60),
  ('2026-08-16', 'esportiva_bet', 'Speed Baccarat',  47),
  ('2026-08-16', 'esportiva_bet', 'Roleta', 126),
  ('2026-08-16', 'jonbet', 'Blackjack',  19),
  ('2026-08-16', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-16', 'jonbet', 'Speed Baccarat',  74),
  ('2026-08-16', 'jonbet', 'Roleta',  24)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 2984),
  ('2026-08-01', 'casa_apostas',   99),
  ('2026-08-01', 'blaze',  840),
  ('2026-08-01', 'jonbet', 1237)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
