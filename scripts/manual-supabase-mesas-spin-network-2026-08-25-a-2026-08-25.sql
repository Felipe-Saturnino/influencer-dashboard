-- Mesas Spin — 2026-08-25 a 2026-08-25: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-25', 'blaze',    38324,   1160,   4606,  44),
  ('2026-08-25', 'casa_apostas',     4316,    445,   1863,  15),
  ('2026-08-25', 'esportiva_bet',   576828,  32906, 125342, 449),
  ('2026-08-25', 'jonbet',    61664,  17594,   5304, 142)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-25', 'Blaze', 'blaze', 'Blackjack 1',    713,    33905,   2046),
  ('2026-08-25', 'Blaze', 'blaze', 'Futebol Brasileiro',    209,     1512,    220),
  ('2026-08-25', 'Blaze', 'blaze', 'Speed Baccarat',     24,      129,     80),
  ('2026-08-25', 'Blaze', 'blaze', 'Roleta',    214,     2778,   2260),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     60,     1918,    168),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     33,      225,      6),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     11,     1167,    310),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Roleta',    341,     1006,   1379),
  ('2026-08-25', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  -2700,    78370,   3694),
  ('2026-08-25', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   -725,    22059,   2803),
  ('2026-08-25', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',    743,    63518,   2564),
  ('2026-08-25', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  35588,   412881, 116281),
  ('2026-08-25', 'Jon Bet', 'jonbet', 'Blackjack 1',    553,     4705,    411),
  ('2026-08-25', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    139,      351,     81),
  ('2026-08-25', 'Jon Bet', 'jonbet', 'Speed Baccarat',   9827,    17776,   1350),
  ('2026-08-25', 'Jon Bet', 'jonbet', 'Roleta',   7075,    38832,   3462)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-25', 'blaze', 'Blackjack',  21),
  ('2026-08-25', 'blaze', 'Futebol Brasileiro',  12),
  ('2026-08-25', 'blaze', 'Speed Baccarat',   5),
  ('2026-08-25', 'blaze', 'Roleta',  12),
  ('2026-08-25', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-25', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-25', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-08-25', 'casa_apostas', 'Roleta',   6),
  ('2026-08-25', 'esportiva_bet', 'Blackjack',  35),
  ('2026-08-25', 'esportiva_bet', 'Futebol Brasileiro',  91),
  ('2026-08-25', 'esportiva_bet', 'Speed Baccarat',  58),
  ('2026-08-25', 'esportiva_bet', 'Roleta', 305),
  ('2026-08-25', 'jonbet', 'Blackjack',  10),
  ('2026-08-25', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-25', 'jonbet', 'Speed Baccarat',  96),
  ('2026-08-25', 'jonbet', 'Roleta',  34)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4569),
  ('2026-08-01', 'casa_apostas',  136),
  ('2026-08-01', 'blaze', 1037),
  ('2026-08-01', 'jonbet', 1712)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
