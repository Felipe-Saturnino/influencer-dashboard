-- Mesas Spin — 2026-08-20 a 2026-08-20: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-20', 'blaze',    58299,   2822,   9538,  51),
  ('2026-08-20', 'casa_apostas',     5942,    286,   1685,  19),
  ('2026-08-20', 'esportiva_bet',  1029021,  11388, 120935, 452),
  ('2026-08-20', 'jonbet',    32704,   1157,   6281, 135)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-20', 'Blaze', 'blaze', 'Blackjack 1',   1338,    40378,   1720),
  ('2026-08-20', 'Blaze', 'blaze', 'Futebol Brasileiro',   -134,     9425,    633),
  ('2026-08-20', 'Blaze', 'blaze', 'Speed Baccarat',    938,     2042,    335),
  ('2026-08-20', 'Blaze', 'blaze', 'Roleta',    680,     6454,   6850),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     15,      440,     41),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     28,      210,     26),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -196,     4363,    456),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Roleta',    439,      929,   1162),
  ('2026-08-20', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',    270,    25330,   1738),
  ('2026-08-20', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',    790,    34775,   2239),
  ('2026-08-20', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   -135,    42974,   2808),
  ('2026-08-20', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  10463,   925942, 114150),
  ('2026-08-20', 'Jon Bet', 'jonbet', 'Blackjack 1',    240,     4280,    410),
  ('2026-08-20', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   -131,     1505,    123),
  ('2026-08-20', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -694,    16423,   1736),
  ('2026-08-20', 'Jon Bet', 'jonbet', 'Roleta',   1742,    10496,   4012)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-20', 'blaze', 'Blackjack',  24),
  ('2026-08-20', 'blaze', 'Futebol Brasileiro',  15),
  ('2026-08-20', 'blaze', 'Speed Baccarat',   7),
  ('2026-08-20', 'blaze', 'Roleta',  15),
  ('2026-08-20', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-20', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-08-20', 'casa_apostas', 'Speed Baccarat',   9),
  ('2026-08-20', 'casa_apostas', 'Roleta',   9),
  ('2026-08-20', 'esportiva_bet', 'Blackjack',  37),
  ('2026-08-20', 'esportiva_bet', 'Futebol Brasileiro', 100),
  ('2026-08-20', 'esportiva_bet', 'Speed Baccarat',  80),
  ('2026-08-20', 'esportiva_bet', 'Roleta', 267),
  ('2026-08-20', 'jonbet', 'Blackjack',   5),
  ('2026-08-20', 'jonbet', 'Futebol Brasileiro',   9),
  ('2026-08-20', 'jonbet', 'Speed Baccarat',  96),
  ('2026-08-20', 'jonbet', 'Roleta',  34)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 3733),
  ('2026-08-01', 'casa_apostas',  116),
  ('2026-08-01', 'blaze',  971),
  ('2026-08-01', 'jonbet', 1469)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
