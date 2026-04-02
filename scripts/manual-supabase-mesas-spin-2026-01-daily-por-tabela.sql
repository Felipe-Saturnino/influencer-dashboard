-- Mesas Spin — jan/2026: relatorio_daily_summary + relatorio_por_tabela (sem monthly)
-- Origem: lote de prints jan/2026 (Daily + Per table d-1). UPSERT idempotente.
-- Ajustes de reconciliação: 08/01 Roulette apostas=7650 (soma mesas=daily 14758; linha OCR 7668);
-- 09/01 UAP=78 (print 07–09); 13/01 apostas=16461 (soma Per table);
-- 29/01 apostas=20468 (soma Per table); 31/01 GGR=2605 (soma Per table; daily do print diz 2805).
-- Sem dados neste lote: daily/por_tabela 01–04, 15, 19–26 (ver mensagem “dias não identificados”).
-- Por tabela: não insere "Bet Nacional / Speed Baccarat" a zero (usar delete-rel-por-tabela-baccarat-all-zero-jan2026.sql para limpar já carregado).
-- Correr no SQL Editor Supabase (role com bypass RLS).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, turnover, ggr, apostas, uap)
VALUES
  ('2026-01-05', 114573,  27466, 11835,  57),
  ('2026-01-06',  34784,  -1135, 10474,  55),
  ('2026-01-07', 219950,  -7155, 21199,  75),
  ('2026-01-08', 167409,   2903, 14758, 110),
  ('2026-01-09', 206715,  -1726, 16919,  78),
  ('2026-01-10',  59463,   2055, 18249, 105),
  ('2026-01-11',  64534,   1450, 21340,  86),
  ('2026-01-12',  54453,     92, 17116, 110),
  ('2026-01-13',  96456,   4649, 16461, 103),
  ('2026-01-14', 150798,  23876, 13400, 117),
  ('2026-01-15', 145941,   1991, 17659, 108),
  ('2026-01-16', 315553,    988, 13337, 103),
  ('2026-01-17', 224999,   6303, 17503, 109),
  ('2026-01-18', 208942,   6668, 10782,  92),
  ('2026-01-25', 143269,  -2701, 18279, 108),
  ('2026-01-26', 190677,  29496, 23308, 129),
  ('2026-01-27', 226687,   2789, 24391, 127),
  ('2026-01-28', 246488,  15329, 16001, 135),
  ('2026-01-29', 257563,   4192, 20468, 121),
  ('2026-01-30', 173674,   8169, 18920, 131),
  ('2026-01-31', 221921,   2605, 21790, 125)
ON CONFLICT (data) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

-- por_tabela: dia = data do d-1 (totais batem com daily desse dia)

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-07', 'Casa de Apostas', 'VIP Blackjack 1',  10380,  38295,   200),
  ('2026-01-07', 'Casa de Apostas', 'Blackjack 2',       2383,  60830,  1719),
  ('2026-01-07', 'Casa de Apostas', 'Roulette',         -1441,  33728, 16347),
  ('2026-01-07', 'Casa de Apostas', 'Blackjack 1',      -5005,  36865,  2314),
  ('2026-01-07', 'Casa de Apostas', 'Speed Baccarat',  -13471,  50232,   619),
  ('2026-01-07', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-07', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-08', 'Casa de Apostas', 'Blackjack 2',       5343,  45293,  3181),
  ('2026-01-08', 'Casa de Apostas', 'Blackjack 1',       1885,  87560,  3205),
  ('2026-01-08', 'Casa de Apostas', 'VIP Blackjack 1',    448,  18155,   339),
  ('2026-01-08', 'Casa de Apostas', 'Speed Baccarat',    -378,   1822,   383),
  ('2026-01-08', 'Casa de Apostas', 'Roulette',         -4393,  16580,  7650),  -- soma mesas = daily 14758
  ('2026-01-08', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-08', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-09', 'Casa de Apostas', 'VIP Blackjack 1',   3180,  25670,   375),
  ('2026-01-09', 'Casa de Apostas', 'Roulette',          1738,  21316, 12053),
  ('2026-01-09', 'Casa de Apostas', 'Blackjack 1',       -800,  62123,  2761),
  ('2026-01-09', 'Casa de Apostas', 'Speed Baccarat',   -1369,  27307,   313),
  ('2026-01-09', 'Casa de Apostas', 'Blackjack 2',      -4475,  70300,  1417),
  ('2026-01-09', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-09', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-10', 'Casa de Apostas', 'Roulette',          1212,  14961, 15277),
  ('2026-01-10', 'Casa de Apostas', 'Blackjack 2',       1053,   9323,   902),
  ('2026-01-10', 'Casa de Apostas', 'Speed Baccarat',     763,   8377,   188),
  ('2026-01-10', 'Casa de Apostas', 'VIP Blackjack 1',   -150,    400,     8),
  ('2026-01-10', 'Casa de Apostas', 'Blackjack 1',       -823,  26403,  1874),
  ('2026-01-10', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-10', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-11', 'Casa de Apostas', 'Blackjack 2',       1118,  19900,  1607),
  ('2026-01-11', 'Casa de Apostas', 'Roulette',          1103,  15365, 17616),
  ('2026-01-11', 'Casa de Apostas', 'Speed Baccarat',      97,   4404,   634),
  ('2026-01-11', 'Casa de Apostas', 'VIP Blackjack 1',     75,   1850,    28),
  ('2026-01-11', 'Casa de Apostas', 'Blackjack 1',       -943,  23015,  1455),
  ('2026-01-11', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-11', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-12', 'Casa de Apostas', 'Blackjack 2',        585,   6798,   698),
  ('2026-01-12', 'Casa de Apostas', 'Roulette',         256,  21616, 13898),
  ('2026-01-12', 'Casa de Apostas', 'Speed Baccarat',     202,   2052,   841),
  ('2026-01-12', 'Casa de Apostas', 'VIP Blackjack 1',   -475,   2743,    40),
  ('2026-01-12', 'Casa de Apostas', 'Blackjack 1',       -475,  21245,  1639),
  ('2026-01-12', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-12', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-13', 'Casa de Apostas', 'Roulette',          4134,  27641, 12885),
  ('2026-01-13', 'Casa de Apostas', 'Speed Baccarat',     657,  13625,   285),
  ('2026-01-13', 'Casa de Apostas', 'VIP Blackjack 1',    535,   1410,    39),
  ('2026-01-13', 'Casa de Apostas', 'Blackjack 2',        198,  28880,  1475),
  ('2026-01-13', 'Casa de Apostas', 'Blackjack 1',       -875,  24900,  1777),
  ('2026-01-13', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-13', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-14', 'Casa de Apostas', 'VIP Blackjack 1',  19000,  51100,    16),
  ('2026-01-14', 'Casa de Apostas', 'Blackjack 1',       2628,  66500,  2285),
  ('2026-01-14', 'Casa de Apostas', 'Speed Baccarat',     813,   9224,   341),
  ('2026-01-14', 'Casa de Apostas', 'Blackjack 2',        783,  10463,   536),
  ('2026-01-14', 'Casa de Apostas', 'Roulette',          653,  13511, 10222),
  ('2026-01-14', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-14', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-16', 'Casa de Apostas', 'Blackjack 1',       6915, 105423,  3006),
  ('2026-01-16', 'Casa de Apostas', 'Speed Baccarat',    2902,   6878,   319),
  ('2026-01-16', 'Casa de Apostas', 'Roulette',          1317,  13405,  8162),
  ('2026-01-16', 'Casa de Apostas', 'VIP Blackjack 1',    770,   5690,   226),
  ('2026-01-16', 'Casa de Apostas', 'Blackjack 2',     -10915, 184158,  1624),
  ('2026-01-16', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-16', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-17', 'Casa de Apostas', 'Roulette',          6250,  60872,  8869),
  ('2026-01-17', 'Casa de Apostas', 'Blackjack 1',       1160, 102735,  3249),
  ('2026-01-17', 'Casa de Apostas', 'Blackjack 2',         90,  44285,  3271),
  ('2026-01-17', 'Casa de Apostas', 'VIP Blackjack 1',   -240,   1580,    61),
  ('2026-01-17', 'Casa de Apostas', 'Speed Baccarat',    -957,  15527,  2053),
  ('2026-01-17', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-17', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-18', 'Casa de Apostas', 'Blackjack 2',       3205,  28763,  1156),
  ('2026-01-18', 'Casa de Apostas', 'Blackjack 1',       2958,  64440,  3269),
  ('2026-01-18', 'Casa de Apostas', 'Roulette',          2727,  78178,  5365),
  ('2026-01-18', 'Casa de Apostas', 'Speed Baccarat',    1013,  11546,   896),
  ('2026-01-18', 'Casa de Apostas', 'VIP Blackjack 1',  -3235,  24015,    96),
  ('2026-01-18', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-18', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-27', 'Casa de Apostas', 'Blackjack 1',       4573,  82300,  2759),
  ('2026-01-27', 'Casa de Apostas', 'Blackjack 2',       3990,  34805,  1659),
  ('2026-01-27', 'Casa de Apostas', 'Speed Baccarat',    3962,  18553,  1080),
  ('2026-01-27', 'Casa de Apostas', 'Roulette',          1987,  28725, 18338),
  ('2026-01-27', 'Casa de Apostas', 'VIP Blackjack 1', -11723,  64305,   555),
  ('2026-01-27', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-27', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-28', 'Casa de Apostas', 'Blackjack 1',       5208,  33918,  1266),
  ('2026-01-28', 'Casa de Apostas', 'Roulette',          3865,  19946, 10983),
  ('2026-01-28', 'Casa de Apostas', 'Blackjack 2',       3073,  83700,  2169),
  ('2026-01-28', 'Casa de Apostas', 'Speed Baccarat',    2102,  17505,   822),
  ('2026-01-28', 'Casa de Apostas', 'VIP Blackjack 1',   1083,  91420,   761),
  ('2026-01-28', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-28', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-29', 'Casa de Apostas', 'Blackjack 1',       4900,  50895,  2087),
  ('2026-01-29', 'Casa de Apostas', 'Blackjack 2',       2635,  65688,  2076),
  ('2026-01-29', 'Casa de Apostas', 'Roulette',          1834,  49600, 15292),
  ('2026-01-29', 'Casa de Apostas', 'VIP Blackjack 1',    -53,  72245,   736),
  ('2026-01-29', 'Casa de Apostas', 'Speed Baccarat',   -5125,  19136,   277),
  ('2026-01-29', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-29', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-30', 'Casa de Apostas', 'VIP Blackjack 1',   5350,  44040,   384),
  ('2026-01-30', 'Casa de Apostas', 'Blackjack 2',       1690,  48378,  2217),
  ('2026-01-30', 'Casa de Apostas', 'Blackjack 1',       1560,  48595,  3029),
  ('2026-01-30', 'Casa de Apostas', 'Roulette',           691,  18758, 12424),
  ('2026-01-30', 'Casa de Apostas', 'Speed Baccarat',   -1122,  15903,   866),
  ('2026-01-30', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-30', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas) VALUES
  ('2026-01-31', 'Casa de Apostas', 'VIP Blackjack 1',   4213,  66405,   632),
  ('2026-01-31', 'Casa de Apostas', 'Blackjack 1',        408,  53868,  2964),
  ('2026-01-31', 'Casa de Apostas', 'Roulette',           405,  25414, 15350),
  ('2026-01-31', 'Casa de Apostas', 'Blackjack 2',        -58,  33090,  2242),
  ('2026-01-31', 'Casa de Apostas', 'Speed Baccarat',   -2363,  43144,   602),
  ('2026-01-31', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-31', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr = EXCLUDED.ggr, turnover = EXCLUDED.turnover, apostas = EXCLUDED.apostas, updated_at = now();

COMMIT;
