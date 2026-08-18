-- Mesas Spin — 2026-08-17 a 2026-08-17: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-17', 'blaze',   197399, -32095,  20906, 116),
  ('2026-08-17', 'casa_apostas',     1813,     35,   1154,  19),
  ('2026-08-17', 'esportiva_bet',   457618,   1119,  68275, 284),
  ('2026-08-17', 'jonbet',    74961,  14568,  10464, 150)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-17', 'Blaze', 'blaze', 'Blackjack 1', -32707,   171678,   2064),
  ('2026-08-17', 'Blaze', 'blaze', 'Futebol Brasileiro',   -315,     2608,    368),
  ('2026-08-17', 'Blaze', 'blaze', 'Speed Baccarat',  -1091,     9372,    335),
  ('2026-08-17', 'Blaze', 'blaze', 'Roleta',   2018,    13741,  18139),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    103,      160,     10),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      5,       15,      3),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -69,      994,    256),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Roleta',     -4,      644,    885),
  ('2026-08-17', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   -410,    14358,   1114),
  ('2026-08-17', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   5463,    64776,   4262),
  ('2026-08-17', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -5987,    66740,   2111),
  ('2026-08-17', 'Esportiva Bet', 'esportiva_bet', 'Roleta',   2053,   311744,  60788),
  ('2026-08-17', 'Jon Bet', 'jonbet', 'Blackjack 1',   2038,    30695,   1695),
  ('2026-08-17', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    -26,      656,    296),
  ('2026-08-17', 'Jon Bet', 'jonbet', 'Speed Baccarat',  11942,    32642,   3020),
  ('2026-08-17', 'Jon Bet', 'jonbet', 'Roleta',    614,    10968,   5453)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-17', 'blaze', 'Blackjack',  32),
  ('2026-08-17', 'blaze', 'Futebol Brasileiro',  21),
  ('2026-08-17', 'blaze', 'Speed Baccarat',  12),
  ('2026-08-17', 'blaze', 'Roleta',  61),
  ('2026-08-17', 'casa_apostas', 'Blackjack',   3),
  ('2026-08-17', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-08-17', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-08-17', 'casa_apostas', 'Roleta',   9),
  ('2026-08-17', 'esportiva_bet', 'Blackjack',  26),
  ('2026-08-17', 'esportiva_bet', 'Futebol Brasileiro',  84),
  ('2026-08-17', 'esportiva_bet', 'Speed Baccarat',  48),
  ('2026-08-17', 'esportiva_bet', 'Roleta', 183),
  ('2026-08-17', 'jonbet', 'Blackjack',  20),
  ('2026-08-17', 'jonbet', 'Futebol Brasileiro',  15),
  ('2026-08-17', 'jonbet', 'Speed Baccarat', 101),
  ('2026-08-17', 'jonbet', 'Roleta',  29)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 3071),
  ('2026-08-01', 'casa_apostas',  100),
  ('2026-08-01', 'blaze',  884),
  ('2026-08-01', 'jonbet', 1269)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
