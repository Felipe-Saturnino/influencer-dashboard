-- Mesas Spin — 2026-09-07 a 2026-09-07: Estúdio Network (bateu_bet, blaze, brx_bet, casa_apostas, esportiva_bet, jonbet) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-07', 'bateu_bet',    16231,    776,   3750,  19),
  ('2026-09-07', 'blaze',    63998,   4393,   6315,  62),
  ('2026-09-07', 'brx_bet',     4387,    121,   1250,  12),
  ('2026-09-07', 'casa_apostas',    11463,   -941,   3212,  18),
  ('2026-09-07', 'esportiva_bet',   770342, 394669,  72768, 318),
  ('2026-09-07', 'jonbet',    54376,   1421,   5238,  83)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-07', 'Bateu Bet', 'bateu_bet', 'Blackjack 1',    225,     1530,    148),
  ('2026-09-07', 'Bateu Bet', 'bateu_bet', 'Futebol Brasileiro',    196,     1696,    171),
  ('2026-09-07', 'Bateu Bet', 'bateu_bet', 'Speed Baccarat',    -48,      134,     35),
  ('2026-09-07', 'Bateu Bet', 'bateu_bet', 'Roleta',    403,    12871,   3396),
  ('2026-09-07', 'Blaze', 'blaze', 'Blackjack 1',   4005,    47345,   2513),
  ('2026-09-07', 'Blaze', 'blaze', 'Futebol Brasileiro',    287,     8804,    290),
  ('2026-09-07', 'Blaze', 'blaze', 'Speed Baccarat',   -120,      778,    177),
  ('2026-09-07', 'Blaze', 'blaze', 'Roleta',    221,     7071,   3335),
  ('2026-09-07', 'BRX Bet', 'brx_bet', 'Blackjack 1',      0,        0,      0),
  ('2026-09-07', 'BRX Bet', 'brx_bet', 'Futebol Brasileiro',    104,      596,     42),
  ('2026-09-07', 'BRX Bet', 'brx_bet', 'Speed Baccarat',    -70,      105,      8),
  ('2026-09-07', 'BRX Bet', 'brx_bet', 'Roleta',     87,     3686,   1200),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   -230,      695,     77),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     80,     1525,     77),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -858,     8341,    438),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Roleta',     67,      902,   2620),
  ('2026-09-07', 'Esportiva Bet', 'esportiva_bet', 'Blackjack 1', 395933,   526553,    662),
  ('2026-09-07', 'Esportiva Bet', 'esportiva_bet', 'Futebol Brasileiro',   5576,    25315,   2819),
  ('2026-09-07', 'Esportiva Bet', 'esportiva_bet', 'Speed Baccarat',  -1526,    19031,    978),
  ('2026-09-07', 'Esportiva Bet', 'esportiva_bet', 'Roleta',  -5314,   199443,  68309),
  ('2026-09-07', 'Jon Bet', 'jonbet', 'Blackjack 1',    583,     6580,    447),
  ('2026-09-07', 'Jon Bet', 'jonbet', 'Futebol Brasileiro',     94,      678,     91),
  ('2026-09-07', 'Jon Bet', 'jonbet', 'Speed Baccarat',    322,     1103,    267),
  ('2026-09-07', 'Jon Bet', 'jonbet', 'Roleta',    422,    46015,   4433)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-07', 'bateu_bet', 'Blackjack',   1),
  ('2026-09-07', 'bateu_bet', 'Futebol Brasileiro',   7),
  ('2026-09-07', 'bateu_bet', 'Speed Baccarat',   3),
  ('2026-09-07', 'bateu_bet', 'Roleta',  12),
  ('2026-09-07', 'blaze', 'Blackjack',  40),
  ('2026-09-07', 'blaze', 'Futebol Brasileiro',  11),
  ('2026-09-07', 'blaze', 'Speed Baccarat',  10),
  ('2026-09-07', 'blaze', 'Roleta',  11),
  ('2026-09-07', 'brx_bet', 'Blackjack',   0),
  ('2026-09-07', 'brx_bet', 'Futebol Brasileiro',   3),
  ('2026-09-07', 'brx_bet', 'Speed Baccarat',   1),
  ('2026-09-07', 'brx_bet', 'Roleta',   8),
  ('2026-09-07', 'casa_apostas', 'Blackjack',   3),
  ('2026-09-07', 'casa_apostas', 'Futebol Brasileiro',   1),
  ('2026-09-07', 'casa_apostas', 'Speed Baccarat',   7),
  ('2026-09-07', 'casa_apostas', 'Roleta',  12),
  ('2026-09-07', 'esportiva_bet', 'Blackjack',  28),
  ('2026-09-07', 'esportiva_bet', 'Futebol Brasileiro',  86),
  ('2026-09-07', 'esportiva_bet', 'Speed Baccarat',  41),
  ('2026-09-07', 'esportiva_bet', 'Roleta', 196),
  ('2026-09-07', 'jonbet', 'Blackjack',   7),
  ('2026-09-07', 'jonbet', 'Futebol Brasileiro',  16),
  ('2026-09-07', 'jonbet', 'Speed Baccarat',  21),
  ('2026-09-07', 'jonbet', 'Roleta',  42)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'esportiva_bet', 2097),
  ('2026-09-01', 'bateu_bet',   67),
  ('2026-09-01', 'brx_bet',   56),
  ('2026-09-01', 'rico_bet',    1),
  ('2026-09-01', 'casa_apostas',   57),
  ('2026-09-01', 'blaze',  235),
  ('2026-09-01', 'jonbet',  405)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
