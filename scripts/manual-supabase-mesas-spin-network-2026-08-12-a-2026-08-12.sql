-- Mesas Spin — 2026-08-12 a 2026-08-12: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-12', 'blaze',    76812,  -17861,  16958, 122),
  ('2026-08-12', 'casa_apostas',    21383,    1360,   1074,  10),
  ('2026-08-12', 'esportiva_bet',  1218570, -117213, 107513, 355),
  ('2026-08-12', 'jonbet',    31718,    1477,   2900, 118)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-12', 'Blaze', 'blaze', 'Blackjack 1',  -1077,    42075,   1800),
  ('2026-08-12', 'Blaze', 'blaze', 'Futebol Brasileiro',    170,     3073,    731),
  ('2026-08-12', 'Blaze', 'blaze', 'Speed Baccarat',    151,     4168,    230),
  ('2026-08-12', 'Blaze', 'blaze', 'Roleta', -17105,    27496,  14197),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    240,     5715,    187),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    285,     1925,     12),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    646,    11658,    631),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Roleta',    189,     2085,    244),
  ('2026-08-12', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',    853,    10343,    848),
  ('2026-08-12', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro', -29305,   274133,   3942),
  ('2026-08-12', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat', -23162,   109413,   2671),
  ('2026-08-12', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -65599,   824681, 100052),
  ('2026-08-12', 'Jon Bet', 'jonbet', 'Blackjack 1',   1635,    12598,    595),
  ('2026-08-12', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   -818,     4153,    149),
  ('2026-08-12', 'Jon Bet', 'jonbet', 'Speed Baccarat',    235,    11978,   1272),
  ('2026-08-12', 'Jon Bet', 'jonbet', 'Roleta',    425,     2989,    884)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-12', 'blaze', 'Blackjack',  30),
  ('2026-08-12', 'blaze', 'Futebol Brasileiro',  36),
  ('2026-08-12', 'blaze', 'Speed Baccarat',  13),
  ('2026-08-12', 'blaze', 'Roleta',  59),
  ('2026-08-12', 'casa_apostas', 'Blackjack',   4),
  ('2026-08-12', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-08-12', 'casa_apostas', 'Speed Baccarat',   4),
  ('2026-08-12', 'casa_apostas', 'Roleta',   3),
  ('2026-08-12', 'esportiva_bet', 'Blackjack',  22),
  ('2026-08-12', 'esportiva_bet', 'Futebol Brasileiro', 107),
  ('2026-08-12', 'esportiva_bet', 'Speed Baccarat',  79),
  ('2026-08-12', 'esportiva_bet', 'Roleta', 186),
  ('2026-08-12', 'jonbet', 'Blackjack',  24),
  ('2026-08-12', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-12', 'jonbet', 'Speed Baccarat',  74),
  ('2026-08-12', 'jonbet', 'Roleta',  25)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 2569),
  ('2026-08-01', 'casa_apostas',   87),
  ('2026-08-01', 'blaze',  608),
  ('2026-08-01', 'jonbet',  846)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
