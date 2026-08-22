-- Mesas Spin — 2026-08-21 a 2026-08-21: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-21', 'blaze',    77831,   1124,  12580,  55),
  ('2026-08-21', 'casa_apostas',     4695,   -309,   2344,  21),
  ('2026-08-21', 'esportiva_bet',  1023240,  13032, 122443, 439),
  ('2026-08-21', 'jonbet',   125914, -21002,   7506, 145)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-21', 'Blaze', 'blaze', 'Blackjack 1',    733,    66635,   3490),
  ('2026-08-21', 'Blaze', 'blaze', 'Futebol Brasileiro',     90,      582,    117),
  ('2026-08-21', 'Blaze', 'blaze', 'Speed Baccarat',    -98,     1427,    304),
  ('2026-08-21', 'Blaze', 'blaze', 'Roleta',    399,     9187,   8669),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     85,      230,     28),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -10,       40,      8),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     46,     2988,    646),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Roleta',   -430,     1437,   1662),
  ('2026-08-21', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  -1842,    16030,   1080),
  ('2026-08-21', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   -981,    22020,   2874),
  ('2026-08-21', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat', -11876,   123371,   3070),
  ('2026-08-21', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  27731,   861819, 115419),
  ('2026-08-21', 'Jon Bet', 'jonbet', 'Blackjack 1',     45,    13860,    659),
  ('2026-08-21', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     36,     1358,    327),
  ('2026-08-21', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -999,    35684,   1979),
  ('2026-08-21', 'Jon Bet', 'jonbet', 'Roleta', -20084,    75012,   4541)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-21', 'blaze', 'Blackjack',  25),
  ('2026-08-21', 'blaze', 'Futebol Brasileiro',  14),
  ('2026-08-21', 'blaze', 'Speed Baccarat',  10),
  ('2026-08-21', 'blaze', 'Roleta',  18),
  ('2026-08-21', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-21', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-08-21', 'casa_apostas', 'Speed Baccarat',   9),
  ('2026-08-21', 'casa_apostas', 'Roleta',  12),
  ('2026-08-21', 'esportiva_bet', 'Blackjack',  36),
  ('2026-08-21', 'esportiva_bet', 'Futebol Brasileiro', 110),
  ('2026-08-21', 'esportiva_bet', 'Speed Baccarat',  76),
  ('2026-08-21', 'esportiva_bet', 'Roleta', 256),
  ('2026-08-21', 'jonbet', 'Blackjack',  15),
  ('2026-08-21', 'jonbet', 'Futebol Brasileiro',  17),
  ('2026-08-21', 'jonbet', 'Speed Baccarat',  95),
  ('2026-08-21', 'jonbet', 'Roleta',  36)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 3852),
  ('2026-08-01', 'casa_apostas',  118),
  ('2026-08-01', 'blaze',  978),
  ('2026-08-01', 'jonbet', 1497)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
