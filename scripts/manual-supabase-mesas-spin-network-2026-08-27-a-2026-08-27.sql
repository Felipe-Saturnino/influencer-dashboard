-- Mesas Spin — 2026-08-27 a 2026-08-27: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-27', 'blaze',    51985,    8600,   5878,  54),
  ('2026-08-27', 'casa_apostas',     4280,    -101,   5053,  13),
  ('2026-08-27', 'esportiva_bet',   991516, -151823, 158619, 494),
  ('2026-08-27', 'jonbet',    32593,    -131,  13255, 124)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-27', 'Blaze', 'blaze', 'Blackjack 1',   8715,    48305,   2385),
  ('2026-08-27', 'Blaze', 'blaze', 'Futebol Brasileiro',    -84,      671,    102),
  ('2026-08-27', 'Blaze', 'blaze', 'Speed Baccarat',   -129,     1035,    289),
  ('2026-08-27', 'Blaze', 'blaze', 'Roleta',     98,     1974,   3102),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     35,       95,      7),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -10,       10,      2),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     24,     2047,    411),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Roleta',   -150,     2128,   4633),
  ('2026-08-27', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1', -72935,   313528,   2544),
  ('2026-08-27', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro', -14811,    45399,   2784),
  ('2026-08-27', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -1013,    17933,   1813),
  ('2026-08-27', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -63064,   614656, 151478),
  ('2026-08-27', 'Jon Bet', 'jonbet', 'Blackjack 1',    358,     4760,    375),
  ('2026-08-27', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',    193,      539,     71),
  ('2026-08-27', 'Jon Bet', 'jonbet', 'Speed Baccarat',    951,    10381,   1848),
  ('2026-08-27', 'Jon Bet', 'jonbet', 'Roleta',  -1633,    16913,  10961)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-27', 'blaze', 'Blackjack',  33),
  ('2026-08-27', 'blaze', 'Futebol Brasileiro',   6),
  ('2026-08-27', 'blaze', 'Speed Baccarat',  11),
  ('2026-08-27', 'blaze', 'Roleta',  10),
  ('2026-08-27', 'casa_apostas', 'Blackjack',   1),
  ('2026-08-27', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-08-27', 'casa_apostas', 'Speed Baccarat',   5),
  ('2026-08-27', 'casa_apostas', 'Roleta',   7),
  ('2026-08-27', 'esportiva_bet', 'Blackjack',  58),
  ('2026-08-27', 'esportiva_bet', 'Futebol Brasileiro',  95),
  ('2026-08-27', 'esportiva_bet', 'Speed Baccarat',  69),
  ('2026-08-27', 'esportiva_bet', 'Roleta', 316),
  ('2026-08-27', 'jonbet', 'Blackjack',   6),
  ('2026-08-27', 'jonbet', 'Futebol Brasileiro',  16),
  ('2026-08-27', 'jonbet', 'Speed Baccarat',  73),
  ('2026-08-27', 'jonbet', 'Roleta',  41)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 4889),
  ('2026-08-01', 'casa_apostas',  142),
  ('2026-08-01', 'blaze', 1069),
  ('2026-08-01', 'jonbet', 1800)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
