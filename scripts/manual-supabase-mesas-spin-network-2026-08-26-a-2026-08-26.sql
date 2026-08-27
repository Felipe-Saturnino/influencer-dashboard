-- Mesas Spin — 2026-08-26 a 2026-08-26: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-26', 'blaze',    44736,   2763,   5353,  44),
  ('2026-08-26', 'casa_apostas',     7488,  -4842,   4592,  22),
  ('2026-08-26', 'esportiva_bet',   779349, 108978, 116624, 401),
  ('2026-08-26', 'jonbet',    78695,  25456,   4880, 134)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-26', 'Blaze', 'blaze', 'Blackjack 1',   2585,    38238,   2122),
  ('2026-08-26', 'Blaze', 'blaze', 'Futebol Brasileiro',    165,     1439,    138),
  ('2026-08-26', 'Blaze', 'blaze', 'Speed Baccarat',   -522,     2577,    134),
  ('2026-08-26', 'Blaze', 'blaze', 'Roleta',    535,     2482,   2959),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    140,      415,     34),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -54,      700,    163),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Roleta',  -4928,     6373,   4395),
  ('2026-08-26', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   3645,   120343,   3273),
  ('2026-08-26', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   -838,    57076,   2776),
  ('2026-08-26', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  55476,   229598,   2544),
  ('2026-08-26', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  50695,   372332, 108031),
  ('2026-08-26', 'Jon Bet', 'jonbet', 'Blackjack 1',   -107,     7535,    650),
  ('2026-08-26', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     46,      534,    169),
  ('2026-08-26', 'Jon Bet', 'jonbet', 'Speed Baccarat',    844,    13609,   1097),
  ('2026-08-26', 'Jon Bet', 'jonbet', 'Roleta',  24673,    57017,   2964)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-26', 'blaze', 'Blackjack',  27),
  ('2026-08-26', 'blaze', 'Futebol Brasileiro',   6),
  ('2026-08-26', 'blaze', 'Speed Baccarat',   6),
  ('2026-08-26', 'blaze', 'Roleta',  11),
  ('2026-08-26', 'casa_apostas', 'Blackjack',   1),
  ('2026-08-26', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-08-26', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-08-26', 'casa_apostas', 'Roleta',  16),
  ('2026-08-26', 'esportiva_bet', 'Blackjack',  41),
  ('2026-08-26', 'esportiva_bet', 'Futebol Brasileiro',  95),
  ('2026-08-26', 'esportiva_bet', 'Speed Baccarat',  70),
  ('2026-08-26', 'esportiva_bet', 'Roleta', 239),
  ('2026-08-26', 'jonbet', 'Blackjack',  10),
  ('2026-08-26', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-26', 'jonbet', 'Speed Baccarat',  87),
  ('2026-08-26', 'jonbet', 'Roleta',  35)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4657),
  ('2026-08-01', 'casa_apostas',  139),
  ('2026-08-01', 'blaze', 1053),
  ('2026-08-01', 'jonbet', 1744)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
