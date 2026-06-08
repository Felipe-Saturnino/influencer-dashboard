-- Mesas Spin — 03–07/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Correções aplicadas vs prints iniciais:
--   03/06 Blaze Roleta turnover 190738
--   04/06 Blaze Blackjack 2 turnover 111220
--   05/06 Blaze Roleta 490778, Speed Baccarat 247397
--   06/06 Casa VIP Blackjack 1 GGR 988, turnover 3788, apostas 58
--   07/06 Casa GGR soma mesas 218 vs daily 215 (Δ 3 — arredondamento aceite)
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-03', 'casa_apostas', 372886, 12694, 46293, 220),
  ('2026-06-03', 'blaze',       1076579, 19423,113469, 774),
  ('2026-06-04', 'casa_apostas', 454238, -7979, 50815, 249),
  ('2026-06-04', 'blaze',        872291, 35559,112133, 826),
  ('2026-06-05', 'casa_apostas', 523035, 17190, 57783, 276),
  ('2026-06-05', 'blaze',       1069055,-17636,120339, 963),
  ('2026-06-06', 'casa_apostas', 397060, 29628, 73095, 255),
  ('2026-06-06', 'blaze',       1721989, 44385,144933, 874),
  ('2026-06-07', 'casa_apostas', 431940,   215, 87917, 252),
  ('2026-06-07', 'blaze',       1048765, 14993,139272, 752)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  -- 03/06 Casa
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -178,  65940,  3242),
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'Roleta',           3784,  49503, 29239),
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      -210,  59843,  3974),
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  1565,   9720,   206),
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   4246,  66365,  5919),
  ('2026-06-03', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 3486, 121516,  3713),
  -- 03/06 Blaze
  ('2026-06-03', 'Blaze', 'blaze', 'Blackjack 1',     -4925, 205580, 11122),
  ('2026-06-03', 'Blaze', 'blaze', 'Roleta',          13075, 190738, 85559),
  ('2026-06-03', 'Blaze', 'blaze', 'Blackjack 2',      5678, 143410,  8007),
  ('2026-06-03', 'Blaze', 'blaze', 'Blackjack VIP',    -225,  67475,   268),
  ('2026-06-03', 'Blaze', 'blaze', 'Speed Baccarat',   5820, 469376,  8513),
  -- 04/06 Casa
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',       -8298,  76205,  1946),
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'Roleta',            5156,  54710, 38738),
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       5885,  53803,  2321),
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -4100,  31445,   249),
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -6903, 165742,  5842),
  ('2026-06-04', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  281,  72334,  1719),
  -- 04/06 Blaze
  ('2026-06-04', 'Blaze', 'blaze', 'Blackjack 1',     19293, 242020, 12070),
  ('2026-06-04', 'Blaze', 'blaze', 'Roleta',           2626, 145702, 84917),
  ('2026-06-04', 'Blaze', 'blaze', 'Blackjack 2',      9163, 111220,  6322),
  ('2026-06-04', 'Blaze', 'blaze', 'Blackjack VIP',   -1025,  57275,   365),
  ('2026-06-04', 'Blaze', 'blaze', 'Speed Baccarat',   5503, 316075,  8459),
  -- 05/06 Casa
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        3153,  93150,  3059),
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'Roleta',            8950,  94048, 39696),
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      -2465,  48330,  3208),
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -1990,   9665,    92),
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    3367, 192375,  9264),
  ('2026-06-05', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 6177,  85467,  2464),
  -- 05/06 Blaze
  ('2026-06-05', 'Blaze', 'blaze', 'Blackjack 1',     -1380, 168290, 10826),
  ('2026-06-05', 'Blaze', 'blaze', 'Roleta',           2169, 490778, 95190),
  ('2026-06-05', 'Blaze', 'blaze', 'Blackjack 2',       450,  96165,  5971),
  ('2026-06-05', 'Blaze', 'blaze', 'Blackjack VIP',   -6988,  66425,   316),
  ('2026-06-05', 'Blaze', 'blaze', 'Speed Baccarat', -11888, 247397,  8036),
  -- 06/06 Casa
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        4768,  42313,  1405),
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'Roleta',            1793, 124140, 60578),
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       2123,  44665,  3047),
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    988,   3788,    58),
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  19552, 134034,  6019),
  ('2026-06-06', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  406,  48121,  1988),
  -- 06/06 Blaze
  ('2026-06-06', 'Blaze', 'blaze', 'Blackjack 1',      6940, 232435,  9228),
  ('2026-06-06', 'Blaze', 'blaze', 'Roleta',          11771, 871361,117097),
  ('2026-06-06', 'Blaze', 'blaze', 'Blackjack 2',     -1478, 186208,  8636),
  ('2026-06-06', 'Blaze', 'blaze', 'Blackjack VIP',   13713, 137275,   335),
  ('2026-06-06', 'Blaze', 'blaze', 'Speed Baccarat',  13439, 294710,  9637),
  -- 07/06 Casa
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        2998,  23888,  1508),
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'Roleta',            789, 141048, 75733),
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       2323,  38470,  3613),
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    528,   2910,    31),
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -7051, 162383,  4869),
  ('2026-06-07', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  631,  63242,  2163),
  -- 07/06 Blaze
  ('2026-06-07', 'Blaze', 'blaze', 'Blackjack 1',     10805, 179093, 10238),
  ('2026-06-07', 'Blaze', 'blaze', 'Roleta',         -12173, 485675,113538),
  ('2026-06-07', 'Blaze', 'blaze', 'Blackjack 2',     5580, 153835,  7070),
  ('2026-06-07', 'Blaze', 'blaze', 'Blackjack VIP',   -975,  13275,    60),
  ('2026-06-07', 'Blaze', 'blaze', 'Speed Baccarat',  11756, 216887,  8366)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-03', 'casa_apostas', 'Blackjack',          62),
  ('2026-06-03', 'casa_apostas', 'Futebol Brasileiro', 57),
  ('2026-06-03', 'casa_apostas', 'Speed Baccarat',     58),
  ('2026-06-03', 'casa_apostas', 'Roleta',             85),
  ('2026-06-03', 'blaze',        'Blackjack',         189),
  ('2026-06-03', 'blaze',        'Speed Baccarat',    298),
  ('2026-06-03', 'blaze',        'Roleta',            345),
  ('2026-06-04', 'casa_apostas', 'Blackjack',          59),
  ('2026-06-04', 'casa_apostas', 'Futebol Brasileiro', 43),
  ('2026-06-04', 'casa_apostas', 'Speed Baccarat',     76),
  ('2026-06-04', 'casa_apostas', 'Roleta',            102),
  ('2026-06-04', 'blaze',        'Blackjack',         220),
  ('2026-06-04', 'blaze',        'Speed Baccarat',    296),
  ('2026-06-04', 'blaze',        'Roleta',            371),
  ('2026-06-05', 'casa_apostas', 'Blackjack',          73),
  ('2026-06-05', 'casa_apostas', 'Futebol Brasileiro', 59),
  ('2026-06-05', 'casa_apostas', 'Speed Baccarat',     91),
  ('2026-06-05', 'casa_apostas', 'Roleta',            108),
  ('2026-06-05', 'blaze',        'Blackjack',         212),
  ('2026-06-05', 'blaze',        'Speed Baccarat',    380),
  ('2026-06-05', 'blaze',        'Roleta',            425),
  ('2026-06-06', 'casa_apostas', 'Blackjack',          55),
  ('2026-06-06', 'casa_apostas', 'Futebol Brasileiro', 48),
  ('2026-06-06', 'casa_apostas', 'Speed Baccarat',     75),
  ('2026-06-06', 'casa_apostas', 'Roleta',            131),
  ('2026-06-06', 'blaze',        'Blackjack',         218),
  ('2026-06-06', 'blaze',        'Speed Baccarat',    314),
  ('2026-06-06', 'blaze',        'Roleta',            416),
  ('2026-06-07', 'casa_apostas', 'Blackjack',          56),
  ('2026-06-07', 'casa_apostas', 'Futebol Brasileiro', 48),
  ('2026-06-07', 'casa_apostas', 'Speed Baccarat',     62),
  ('2026-06-07', 'casa_apostas', 'Roleta',            133),
  ('2026-06-07', 'blaze',        'Blackjack',         221),
  ('2026-06-07', 'blaze',        'Speed Baccarat',    283),
  ('2026-06-07', 'blaze',        'Roleta',            306)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 794),
  ('2026-06-01', 'blaze',        3797)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
