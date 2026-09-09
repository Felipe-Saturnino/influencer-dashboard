-- Mesas Spin — 2026-09-03 a 2026-09-03: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-03', 'blaze',    90055,  21140,   3289,  59),
  ('2026-09-03', 'casa_apostas',     1972,   -187,   1173,  14),
  ('2026-09-03', 'esportiva_bet',  2046090,  12919,  93621, 490),
  ('2026-09-03', 'jonbet',    52364,   9952,   4251,  69)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-03', 'Blaze', 'blaze', 'Blackjack 1',   2330,    42110,   1568),
  ('2026-09-03', 'Blaze', 'blaze', 'Futebol Brasileiro',  15866,    40100,    200),
  ('2026-09-03', 'Blaze', 'blaze', 'Speed Baccarat',   2797,     5375,    101),
  ('2026-09-03', 'Blaze', 'blaze', 'Roleta',    147,     2470,   1420),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -212,      250,      8),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -55,      105,      5),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    128,     1021,    265),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Roleta',    -48,      596,    895),
  ('2026-09-03', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  14105,   113168,   2239),
  ('2026-09-03', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1489,    54578,   1409),
  ('2026-09-03', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  53650,   239808,   3550),
  ('2026-09-03', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -56325,  1638536,  86423),
  ('2026-09-03', 'Jon Bet', 'jonbet', 'Blackjack 1',   4273,    19720,    460),
  ('2026-09-03', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    135,     1435,    242),
  ('2026-09-03', 'Jon Bet', 'jonbet', 'Speed Baccarat',   -984,     2355,    504),
  ('2026-09-03', 'Jon Bet', 'jonbet', 'Roleta',   6528,    28854,   3045)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-03', 'blaze', 'Blackjack',  28),
  ('2026-09-03', 'blaze', 'Futebol Brasileiro',  11),
  ('2026-09-03', 'blaze', 'Speed Baccarat',  10),
  ('2026-09-03', 'blaze', 'Roleta',  12),
  ('2026-09-03', 'casa_apostas', 'Blackjack',   1),
  ('2026-09-03', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-09-03', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-09-03', 'casa_apostas', 'Roleta',   7),
  ('2026-09-03', 'esportiva_bet', 'Blackjack',  46),
  ('2026-09-03', 'esportiva_bet', 'Futebol Brasileiro',  95),
  ('2026-09-03', 'esportiva_bet', 'Speed Baccarat',  70),
  ('2026-09-03', 'esportiva_bet', 'Roleta', 322),
  ('2026-09-03', 'jonbet', 'Blackjack',   8),
  ('2026-09-03', 'jonbet', 'Futebol Brasileiro',  22),
  ('2026-09-03', 'jonbet', 'Speed Baccarat',  19),
  ('2026-09-03', 'jonbet', 'Roleta',  31)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 1258),
  ('2026-09-01', 'casa_apostas',   32),
  ('2026-09-01', 'blaze',  144),
  ('2026-09-01', 'jonbet',  239)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
