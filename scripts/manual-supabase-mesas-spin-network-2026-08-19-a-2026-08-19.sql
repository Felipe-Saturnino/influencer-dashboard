-- Mesas Spin — 2026-08-19 a 2026-08-19: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-19', 'blaze',    44881,  -1404,  13866,  78),
  ('2026-08-19', 'casa_apostas',    54775,   -198,   8198,  18),
  ('2026-08-19', 'esportiva_bet',   697767,  21898,  91768, 435),
  ('2026-08-19', 'jonbet',    63224,  -2782,   9871, 125)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-19', 'Blaze', 'blaze', 'Blackjack 1',   3425,    22160,   1235),
  ('2026-08-19', 'Blaze', 'blaze', 'Futebol Brasileiro',   -487,     8080,    527),
  ('2026-08-19', 'Blaze', 'blaze', 'Speed Baccarat',   -579,     2297,    228),
  ('2026-08-19', 'Blaze', 'blaze', 'Roleta',  -3763,    12344,  11876),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    130,     1570,    113),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    180,      770,     18),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -569,     5931,    952),
  ('2026-08-19', 'Casa de Apostas', 'casa_apostas', 'Roleta',     61,    46504,   7115),
  ('2026-08-19', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   4858,    21938,    987),
  ('2026-08-19', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',    347,   134458,   3416),
  ('2026-08-19', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   1146,    68098,   2581),
  ('2026-08-19', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  15547,   473273,  84784),
  ('2026-08-19', 'Jon Bet', 'jonbet', 'Blackjack 1',   -150,    11050,    938),
  ('2026-08-19', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    273,     4140,    638),
  ('2026-08-19', 'Jon Bet', 'jonbet', 'Speed Baccarat',    335,    28590,   1924),
  ('2026-08-19', 'Jon Bet', 'jonbet', 'Roleta',  -3240,    19444,   6371)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-19', 'blaze', 'Blackjack',  19),
  ('2026-08-19', 'blaze', 'Futebol Brasileiro',  18),
  ('2026-08-19', 'blaze', 'Speed Baccarat',  11),
  ('2026-08-19', 'blaze', 'Roleta',  35),
  ('2026-08-19', 'casa_apostas', 'Blackjack',   4),
  ('2026-08-19', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-08-19', 'casa_apostas', 'Speed Baccarat',   9),
  ('2026-08-19', 'casa_apostas', 'Roleta',   8),
  ('2026-08-19', 'esportiva_bet', 'Blackjack',  42),
  ('2026-08-19', 'esportiva_bet', 'Futebol Brasileiro', 125),
  ('2026-08-19', 'esportiva_bet', 'Speed Baccarat',  78),
  ('2026-08-19', 'esportiva_bet', 'Roleta', 238),
  ('2026-08-19', 'jonbet', 'Blackjack',  12),
  ('2026-08-19', 'jonbet', 'Futebol Brasileiro',  17),
  ('2026-08-19', 'jonbet', 'Speed Baccarat',  77),
  ('2026-08-19', 'jonbet', 'Roleta',  34)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 3439),
  ('2026-08-01', 'casa_apostas',  108),
  ('2026-08-01', 'blaze',  952),
  ('2026-08-01', 'jonbet', 1389)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
