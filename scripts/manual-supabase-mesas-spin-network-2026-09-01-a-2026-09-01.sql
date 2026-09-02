-- Mesas Spin — 2026-09-01 a 2026-09-01: Estúdio Network (blaze, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-01', 'blaze',    65980,   1427,   8970,  62),
  ('2026-09-01', 'casa_apostas',     2313,     70,    798,  13),
  ('2026-09-01', 'esportiva_bet',  1108874, -34045, 107971, 445),
  ('2026-09-01', 'jonbet',    54757,   -380,  10775, 100)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-01', 'Blaze', 'blaze', 'Blackjack 1',   1433,    36580,   1935),
  ('2026-09-01', 'Blaze', 'blaze', 'Futebol Brasileiro',   -511,     5495,    299),
  ('2026-09-01', 'Blaze', 'blaze', 'Speed Baccarat',   -122,    11417,    301),
  ('2026-09-01', 'Blaze', 'blaze', 'Roleta',    627,    12488,   6435),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     20,     1548,    167),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',      0,        0,      0),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     17,      423,    150),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Roleta',     33,      342,    481),
  ('2026-09-01', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1',  25163,    78813,   1685),
  ('2026-09-01', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   1947,    11118,   1859),
  ('2026-09-01', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -2143,    35833,   2068),
  ('2026-09-01', 'Esportiva Bet', 'esportiva_bet', 'Roleta', -59012,   983110, 102359),
  ('2026-09-01', 'Jon Bet', 'jonbet', 'Blackjack 1',   -835,    11205,    297),
  ('2026-09-01', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',   -124,      663,    177),
  ('2026-09-01', 'Jon Bet', 'jonbet', 'Speed Baccarat',    701,     4671,    712),
  ('2026-09-01', 'Jon Bet', 'jonbet', 'Roleta',   -122,    38218,   9589)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-01', 'blaze', 'Blackjack',  37),
  ('2026-09-01', 'blaze', 'Futebol Brasileiro',   8),
  ('2026-09-01', 'blaze', 'Speed Baccarat',   8),
  ('2026-09-01', 'blaze', 'Roleta',  19),
  ('2026-09-01', 'casa_apostas', 'Blackjack',   4),
  ('2026-09-01', 'casa_apostas', 'Futebol Brasileiro',   0),
  ('2026-09-01', 'casa_apostas', 'Speed Baccarat',   6),
  ('2026-09-01', 'casa_apostas', 'Roleta',   4),
  ('2026-09-01', 'esportiva_bet', 'Blackjack',  52),
  ('2026-09-01', 'esportiva_bet', 'Futebol Brasileiro',  85),
  ('2026-09-01', 'esportiva_bet', 'Speed Baccarat',  63),
  ('2026-09-01', 'esportiva_bet', 'Roleta', 284),
  ('2026-09-01', 'jonbet', 'Blackjack',   9),
  ('2026-09-01', 'jonbet', 'Futebol Brasileiro',  21),
  ('2026-09-01', 'jonbet', 'Speed Baccarat',  25),
  ('2026-09-01', 'jonbet', 'Roleta',  55)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 461),
  ('2026-09-01', 'casa_apostas',  13),
  ('2026-09-01', 'blaze',  65),
  ('2026-09-01', 'jonbet', 105)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
