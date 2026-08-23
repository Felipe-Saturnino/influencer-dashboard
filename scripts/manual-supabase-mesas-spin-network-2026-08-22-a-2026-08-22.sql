-- Mesas Spin — 2026-08-22 a 2026-08-22: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-22', 'blaze',    28225,   1824,   7959,  36),
  ('2026-08-22', 'casa_apostas',    11372,  -3810,   3453,  20),
  ('2026-08-22', 'esportiva_bet',   728357,  42932, 119685, 440),
  ('2026-08-22', 'jonbet',    69755,  -1504,   8511, 134)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-22', 'Blaze', 'blaze', 'Blackjack 1',  -1057,    15860,   1070),
  ('2026-08-22', 'Blaze', 'blaze', 'Futebol Brasileiro',     12,     2361,    217),
  ('2026-08-22', 'Blaze', 'blaze', 'Speed Baccarat',    150,     3060,    287),
  ('2026-08-22', 'Blaze', 'blaze', 'Roleta',   2719,     6944,   6385),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     80,      993,     99),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -70,      140,      8),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    103,      859,    358),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Roleta',  -3923,     9380,   2988),
  ('2026-08-22', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',   1775,    37185,   1798),
  ('2026-08-22', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',  -6249,    48997,   3202),
  ('2026-08-22', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  31841,   206910,   3196),
  ('2026-08-22', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  15565,   435265, 111489),
  ('2026-08-22', 'Jon Bet', 'jonbet', 'Blackjack 1',   1175,     6185,    136),
  ('2026-08-22', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     86,      651,    258),
  ('2026-08-22', 'Jon Bet', 'jonbet', 'Speed Baccarat',   1290,    19806,   3151),
  ('2026-08-22', 'Jon Bet', 'jonbet', 'Roleta',  -4055,    43113,   4966)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-22', 'blaze', 'Blackjack',  15),
  ('2026-08-22', 'blaze', 'Futebol Brasileiro',   9),
  ('2026-08-22', 'blaze', 'Speed Baccarat',   5),
  ('2026-08-22', 'blaze', 'Roleta',  13),
  ('2026-08-22', 'casa_apostas', 'Blackjack',   4),
  ('2026-08-22', 'casa_apostas', 'Futebol Brasileiro',   2),
  ('2026-08-22', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-08-22', 'casa_apostas', 'Roleta',  11),
  ('2026-08-22', 'esportiva_bet', 'Blackjack',  36),
  ('2026-08-22', 'esportiva_bet', 'Futebol Brasileiro', 109),
  ('2026-08-22', 'esportiva_bet', 'Speed Baccarat',  72),
  ('2026-08-22', 'esportiva_bet', 'Roleta', 265),
  ('2026-08-22', 'jonbet', 'Blackjack',  12),
  ('2026-08-22', 'jonbet', 'Futebol Brasileiro',  13),
  ('2026-08-22', 'jonbet', 'Speed Baccarat',  93),
  ('2026-08-22', 'jonbet', 'Roleta',  33)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4060),
  ('2026-08-01', 'casa_apostas',  122),
  ('2026-08-01', 'blaze',  986),
  ('2026-08-01', 'jonbet', 1546)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
