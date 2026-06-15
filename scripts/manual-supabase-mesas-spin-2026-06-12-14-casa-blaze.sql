-- Mesas Spin — 12–14/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: todos os dias ±1 ou ±2 em GGR/turnover; apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-12', 'casa_apostas', 533217, 36004, 94517, 207),
  ('2026-06-12', 'blaze',       1185451, 53519,146282, 809),
  ('2026-06-13', 'casa_apostas', 608387,  4989, 92534, 192),
  ('2026-06-13', 'blaze',        999633, 32909,112721, 827),
  ('2026-06-14', 'casa_apostas', 314573,   424, 67103, 160),
  ('2026-06-14', 'blaze',       1239436, 85707,125495, 872)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  -- 12/06 Casa
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',       -12173,  45120,  1342),
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'Roleta',            8676, 261633, 86532),
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',         -33,  42573,  2779),
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  11090,  71555,   539),
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -1322,  51069,  2242),
  ('2026-06-12', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 29765,  61268,  1083),
  -- 12/06 Blaze
  ('2026-06-12', 'Blaze', 'blaze', 'Blackjack 1',      3913, 167318, 10540),
  ('2026-06-12', 'Blaze', 'blaze', 'Roleta',          35387, 543209,116685),
  ('2026-06-12', 'Blaze', 'blaze', 'Blackjack 2',      1418,  93168,  7002),
  ('2026-06-12', 'Blaze', 'blaze', 'Blackjack VIP',    -700,  11750,    69),
  ('2026-06-12', 'Blaze', 'blaze', 'Speed Baccarat',  13503, 370007, 11986),
  -- 13/06 Casa
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -668,  72240,  1206),
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',            257, 195975, 86032),
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      -928,  76528,  2406),
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  2093,  10950,   122),
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -3823, 213186,  2065),
  ('2026-06-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 8058,  39509,   703),
  -- 13/06 Blaze
  ('2026-06-13', 'Blaze', 'blaze', 'Blackjack 1',      2188, 143118,  8245),
  ('2026-06-13', 'Blaze', 'blaze', 'Roleta',          24967, 466545, 90651),
  ('2026-06-13', 'Blaze', 'blaze', 'Blackjack 2',      6288,  81620,  5772),
  ('2026-06-13', 'Blaze', 'blaze', 'Blackjack VIP',   -4325,  25075,   120),
  ('2026-06-13', 'Blaze', 'blaze', 'Speed Baccarat',   3791, 283276,  7933),
  -- 14/06 Casa
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -110,  30243,   684),
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'Roleta',           5544, 167230, 62829),
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       425,  11893,  1403),
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     0,      0,     0),
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -4533,  89969,  1132),
  ('2026-06-14', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', -902,  15239,  1055),
  -- 14/06 Blaze
  ('2026-06-14', 'Blaze', 'blaze', 'Blackjack 1',      9860, 151365, 10110),
  ('2026-06-14', 'Blaze', 'blaze', 'Roleta',          20880, 546438,102622),
  ('2026-06-14', 'Blaze', 'blaze', 'Blackjack 2',      4750,  68553,  4122),
  ('2026-06-14', 'Blaze', 'blaze', 'Blackjack VIP',    -175,  26475,   137),
  ('2026-06-14', 'Blaze', 'blaze', 'Speed Baccarat',  50392, 446605,  8504)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-12', 'casa_apostas', 'Blackjack',          34),
  ('2026-06-12', 'casa_apostas', 'Futebol Brasileiro', 27),
  ('2026-06-12', 'casa_apostas', 'Speed Baccarat',     34),
  ('2026-06-12', 'casa_apostas', 'Roleta',            131),
  ('2026-06-12', 'blaze',        'Blackjack',         178),
  ('2026-06-12', 'blaze',        'Speed Baccarat',    315),
  ('2026-06-12', 'blaze',        'Roleta',            359),
  ('2026-06-13', 'casa_apostas', 'Blackjack',          42),
  ('2026-06-13', 'casa_apostas', 'Futebol Brasileiro', 25),
  ('2026-06-13', 'casa_apostas', 'Speed Baccarat',     35),
  ('2026-06-13', 'casa_apostas', 'Roleta',            113),
  ('2026-06-13', 'blaze',        'Blackjack',         200),
  ('2026-06-13', 'blaze',        'Speed Baccarat',    312),
  ('2026-06-13', 'blaze',        'Roleta',            379),
  ('2026-06-14', 'casa_apostas', 'Blackjack',          31),
  ('2026-06-14', 'casa_apostas', 'Futebol Brasileiro', 21),
  ('2026-06-14', 'casa_apostas', 'Speed Baccarat',     20),
  ('2026-06-14', 'casa_apostas', 'Roleta',            102),
  ('2026-06-14', 'blaze',        'Blackjack',         181),
  ('2026-06-14', 'blaze',        'Speed Baccarat',    373),
  ('2026-06-14', 'blaze',        'Roleta',            381)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 1190),
  ('2026-06-01', 'blaze',        6355)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
