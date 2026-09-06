-- Mesas Spin — 2026-09-04 a 2026-09-05: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-04', 'blaze',  1767751,  -1495, 141681, 930),
  ('2026-09-04', 'casa_apostas',   269055,  -1951,  34971, 140),
  ('2026-09-05', 'blaze',  1585653, 100734, 151472, 982),
  ('2026-09-05', 'casa_apostas',   738433,  51981,  47238, 155)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-04', 'Blaze', 'blaze', 'Blackjack 1',  12040,   259455,  11063),
  ('2026-09-04', 'Blaze', 'blaze', 'Blackjack 2',   2365,   206933,  11551),
  ('2026-09-04', 'Blaze', 'blaze', 'Roleta', -26468,   383085, 109713),
  ('2026-09-04', 'Blaze', 'blaze', 'Speed Baccarat',   8280,   889778,   9200),
  ('2026-09-04', 'Blaze', 'blaze', 'Blackjack VIP',   2288,    28500,    154),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   4173,    36810,    819),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   3318,    29988,   1643),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Roleta',  -1362,    84127,  30915),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -7172,    46768,   1051),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   1715,     4585,     46),
  ('2026-09-04', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  -2623,    66777,    497),
  ('2026-09-05', 'Blaze', 'blaze', 'Blackjack 1',   7285,   242208,  12954),
  ('2026-09-05', 'Blaze', 'blaze', 'Blackjack 2',   2440,   193753,  11717),
  ('2026-09-05', 'Blaze', 'blaze', 'Roleta',  36170,   448792, 115718),
  ('2026-09-05', 'Blaze', 'blaze', 'Speed Baccarat',  68189,   479975,  10579),
  ('2026-09-05', 'Blaze', 'blaze', 'Blackjack VIP', -13350,   220925,    504),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  -1290,   281095,   4498),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   2228,    59165,   2083),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Roleta',  17291,   112849,  38322),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  36298,   161205,   1396),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -6860,    99090,    372),
  ('2026-09-05', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   4314,    25029,    567)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-04', 'blaze', 'Blackjack', 287),
  ('2026-09-04', 'blaze', 'Speed Baccarat', 383),
  ('2026-09-04', 'blaze', 'Roleta', 339),
  ('2026-09-04', 'casa_apostas', 'Blackjack',  27),
  ('2026-09-04', 'casa_apostas', 'Futebol Brasileiro',  12),
  ('2026-09-04', 'casa_apostas', 'Speed Baccarat',  25),
  ('2026-09-04', 'casa_apostas', 'Roleta',  88),
  ('2026-09-05', 'blaze', 'Blackjack', 295),
  ('2026-09-05', 'blaze', 'Speed Baccarat', 411),
  ('2026-09-05', 'blaze', 'Roleta', 368),
  ('2026-09-05', 'casa_apostas', 'Blackjack',  33),
  ('2026-09-05', 'casa_apostas', 'Futebol Brasileiro',  11),
  ('2026-09-05', 'casa_apostas', 'Speed Baccarat',  19),
  ('2026-09-05', 'casa_apostas', 'Roleta', 107)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  391),
  ('2026-09-01', 'blaze', 3114)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
