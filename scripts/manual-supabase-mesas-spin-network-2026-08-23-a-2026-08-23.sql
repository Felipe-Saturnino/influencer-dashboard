-- Mesas Spin — 2026-08-23 a 2026-08-23: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-23', 'blaze',    32655,   1807,   6514,  38),
  ('2026-08-23', 'casa_apostas',     3068,    478,   3861,  11),
  ('2026-08-23', 'esportiva_bet',   331082,  27780,  69952, 391),
  ('2026-08-23', 'jonbet',    30962,  -2834,   4203, 126)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-23', 'Blaze', 'blaze', 'Blackjack 1',    928,    19233,   1183),
  ('2026-08-23', 'Blaze', 'blaze', 'Futebol Brasileiro',     63,     5131,    544),
  ('2026-08-23', 'Blaze', 'blaze', 'Speed Baccarat',    344,     2516,    426),
  ('2026-08-23', 'Blaze', 'blaze', 'Roleta',    472,     5775,   4361),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    375,      998,    121),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -30,      110,     10),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     -4,       49,     53),
  ('2026-08-23', 'Casa de Apostas', 'casa_apostas', 'Roleta',    137,     1911,   3677),
  ('2026-08-23', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   2253,    22618,   1285),
  ('2026-08-23', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1106,    16141,   1809),
  ('2026-08-23', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',   1979,    67846,   2441),
  ('2026-08-23', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  22442,   224477,  64417),
  ('2026-08-23', 'Jon Bet', 'jonbet', 'Blackjack 1',   -762,     6085,    604),
  ('2026-08-23', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    163,      526,    244),
  ('2026-08-23', 'Jon Bet', 'jonbet', 'Speed Baccarat',    997,     9475,   2277),
  ('2026-08-23', 'Jon Bet', 'jonbet', 'Roleta',  -3232,    14876,   1078)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-23', 'blaze', 'Blackjack',  15),
  ('2026-08-23', 'blaze', 'Futebol Brasileiro',   8),
  ('2026-08-23', 'blaze', 'Speed Baccarat',   7),
  ('2026-08-23', 'blaze', 'Roleta',  14),
  ('2026-08-23', 'casa_apostas', 'Blackjack',   2),
  ('2026-08-23', 'casa_apostas', 'Futebol Brasileiro',   3),
  ('2026-08-23', 'casa_apostas', 'Speed Baccarat',   4),
  ('2026-08-23', 'casa_apostas', 'Roleta',   5),
  ('2026-08-23', 'esportiva_bet', 'Blackjack',  44),
  ('2026-08-23', 'esportiva_bet', 'Futebol Brasileiro',  78),
  ('2026-08-23', 'esportiva_bet', 'Speed Baccarat',  88),
  ('2026-08-23', 'esportiva_bet', 'Roleta', 221),
  ('2026-08-23', 'jonbet', 'Blackjack',  10),
  ('2026-08-23', 'jonbet', 'Futebol Brasileiro',  14),
  ('2026-08-23', 'jonbet', 'Speed Baccarat',  95),
  ('2026-08-23', 'jonbet', 'Roleta',  20)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4234),
  ('2026-08-01', 'casa_apostas',  128),
  ('2026-08-01', 'blaze', 1003),
  ('2026-08-01', 'jonbet', 1603)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
