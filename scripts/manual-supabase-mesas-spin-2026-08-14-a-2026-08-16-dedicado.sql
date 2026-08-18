-- Mesas Spin — 2026-08-14 a 2026-08-16: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-14', 'blaze',  1447592,  65775,  98442, 794),
  ('2026-08-14', 'casa_apostas',   216490,  -7738,  31741, 154),
  ('2026-08-15', 'blaze',   915855,  65238, 118513, 838),
  ('2026-08-15', 'casa_apostas',   150266,   6911,  15274, 123),
  ('2026-08-16', 'blaze',  1988907, 129767, 100651, 713),
  ('2026-08-16', 'casa_apostas',   257287,   1612,  24616, 111)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-14', 'Blaze', 'blaze', 'Blackjack 1',  17360,   233473,  10732),
  ('2026-08-14', 'Blaze', 'blaze', 'Blackjack 2',   9228,   250613,   9682),
  ('2026-08-14', 'Blaze', 'blaze', 'Roleta',   3878,   230169,  69235),
  ('2026-08-14', 'Blaze', 'blaze', 'Speed Baccarat',  13134,   511137,   7715),
  ('2026-08-14', 'Blaze', 'blaze', 'Blackjack VIP',  22175,   222200,   1078),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   3158,    41920,   1683),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -855,    55823,   2390),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Roleta',   -435,    73367,  26141),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -2476,    13202,    738),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -7170,    12220,    118),
  ('2026-08-14', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     40,    19958,    671),
  ('2026-08-15', 'Blaze', 'blaze', 'Blackjack 1',   7003,   196993,  10068),
  ('2026-08-15', 'Blaze', 'blaze', 'Blackjack 2',   -790,   144960,   9348),
  ('2026-08-15', 'Blaze', 'blaze', 'Roleta',  37678,   228892,  91912),
  ('2026-08-15', 'Blaze', 'blaze', 'Speed Baccarat',  14697,   297035,   7069),
  ('2026-08-15', 'Blaze', 'blaze', 'Blackjack VIP',   6650,    47975,    116),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   5550,    26208,   1062),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -517,    36353,   2109),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',    902,    19912,  10967),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1330,    35420,    693),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   2280,    23700,     78),
  ('2026-08-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     26,     8673,    365),
  ('2026-08-16', 'Blaze', 'blaze', 'Blackjack 1',   2250,   208945,  10023),
  ('2026-08-16', 'Blaze', 'blaze', 'Blackjack 2',    288,   134360,   8793),
  ('2026-08-16', 'Blaze', 'blaze', 'Roleta',  14689,   182535,  72661),
  ('2026-08-16', 'Blaze', 'blaze', 'Speed Baccarat', 111140,  1459917,   9147),
  ('2026-08-16', 'Blaze', 'blaze', 'Blackjack VIP',   1400,     3150,     27),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   2735,    19818,    800),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    430,    17935,   1274),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Roleta',    333,    57932,  21165),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -6211,   149438,   1112),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    -35,     1865,     39),
  ('2026-08-16', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   4360,    10299,    226)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-14', 'blaze', 'Blackjack', 273),
  ('2026-08-14', 'blaze', 'Speed Baccarat', 304),
  ('2026-08-14', 'blaze', 'Roleta', 288),
  ('2026-08-14', 'casa_apostas', 'Blackjack',  39),
  ('2026-08-14', 'casa_apostas', 'Futebol Brasileiro',  21),
  ('2026-08-14', 'casa_apostas', 'Speed Baccarat',  29),
  ('2026-08-14', 'casa_apostas', 'Roleta',  89),
  ('2026-08-15', 'blaze', 'Blackjack', 258),
  ('2026-08-15', 'blaze', 'Speed Baccarat', 346),
  ('2026-08-15', 'blaze', 'Roleta', 310),
  ('2026-08-15', 'casa_apostas', 'Blackjack',  36),
  ('2026-08-15', 'casa_apostas', 'Futebol Brasileiro',  14),
  ('2026-08-15', 'casa_apostas', 'Speed Baccarat',  16),
  ('2026-08-15', 'casa_apostas', 'Roleta',  70),
  ('2026-08-16', 'blaze', 'Blackjack', 222),
  ('2026-08-16', 'blaze', 'Speed Baccarat', 282),
  ('2026-08-16', 'blaze', 'Roleta', 265),
  ('2026-08-16', 'casa_apostas', 'Blackjack',  33),
  ('2026-08-16', 'casa_apostas', 'Futebol Brasileiro',  10),
  ('2026-08-16', 'casa_apostas', 'Speed Baccarat',  20),
  ('2026-08-16', 'casa_apostas', 'Roleta',  68)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  795),
  ('2026-08-01', 'blaze', 5525)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
