-- Mesas Spin — 2026-08-13 a 2026-08-13: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-13', 'blaze',   151167,  16231,  14685, 105),
  ('2026-08-13', 'casa_apostas',     6357,     22,    544,  15),
  ('2026-08-13', 'esportiva_bet',  1613412,  33711, 107053, 333),
  ('2026-08-13', 'jonbet',    35271,   4232,   6469, 194)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-13', 'Blaze', 'blaze', 'Blackjack 1',  15370,   135835,   2317),
  ('2026-08-13', 'Blaze', 'blaze', 'Futebol Brasileiro',    851,     2273,    722),
  ('2026-08-13', 'Blaze', 'blaze', 'Speed Baccarat',   -478,     6122,    302),
  ('2026-08-13', 'Blaze', 'blaze', 'Roleta',    488,     6937,  11344),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     60,       85,     11),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -147,     3075,     22),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    134,     3087,    397),
  ('2026-08-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -25,      110,    114),
  ('2026-08-13', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   -425,     5090,    432),
  ('2026-08-13', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  17733,   179040,   4125),
  ('2026-08-13', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -2889,    88428,   2542),
  ('2026-08-13', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  19292,  1340854,  99954),
  ('2026-08-13', 'Jon Bet', 'jonbet', 'Blackjack 1',    443,     7315,    550),
  ('2026-08-13', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    -81,      836,     59),
  ('2026-08-13', 'Jon Bet', 'jonbet', 'Speed Baccarat',   1689,     9235,   1565),
  ('2026-08-13', 'Jon Bet', 'jonbet', 'Roleta',   2181,    17885,   4295)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-13', 'blaze', 'Blackjack',  23),
  ('2026-08-13', 'blaze', 'Futebol Brasileiro',  26),
  ('2026-08-13', 'blaze', 'Speed Baccarat',  12),
  ('2026-08-13', 'blaze', 'Roleta',  52),
  ('2026-08-13', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-13', 'casa_apostas', 'Futebol Brasileiro',   4),
  ('2026-08-13', 'casa_apostas', 'Speed Baccarat',   8),
  ('2026-08-13', 'casa_apostas', 'Roleta',   5),
  ('2026-08-13', 'esportiva_bet', 'Blackjack',  17),
  ('2026-08-13', 'esportiva_bet', 'Futebol Brasileiro',  91),
  ('2026-08-13', 'esportiva_bet', 'Speed Baccarat',  69),
  ('2026-08-13', 'esportiva_bet', 'Roleta', 175),
  ('2026-08-13', 'jonbet', 'Blackjack',  19),
  ('2026-08-13', 'jonbet', 'Futebol Brasileiro',  16),
  ('2026-08-13', 'jonbet', 'Speed Baccarat', 135),
  ('2026-08-13', 'jonbet', 'Roleta',  34)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 2648),
  ('2026-08-01', 'casa_apostas',   90),
  ('2026-08-01', 'blaze',  651),
  ('2026-08-01', 'jonbet',  994)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
