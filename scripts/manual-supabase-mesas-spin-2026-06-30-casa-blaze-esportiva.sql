-- Mesas Spin — 30/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa GGR/turnover ±1–2; Blaze GGR ±1; demais = OK.
-- Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-30', 'casa_apostas',  239449,  15011,  38254, 206),
  ('2026-06-30', 'blaze',        1365469,  -1639, 126118, 905),
  ('2026-06-30', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        6775,  31133,  1315),
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'Roleta',             8105, 132018, 30398),
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       -1005,  29118,  2901),
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    1125,  10888,   250),
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     -432,  29201,  2842),
  ('2026-06-30', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  444,   7093,   548),
  ('2026-06-30', 'Blaze',           'blaze',        'Blackjack 1',        5293, 273610, 10218),
  ('2026-06-30', 'Blaze',           'blaze',        'Roleta',           -14878, 621466,102308),
  ('2026-06-30', 'Blaze',           'blaze',        'Blackjack 2',        2938, 127718,  7050),
  ('2026-06-30', 'Blaze',           'blaze',        'Blackjack VIP',      1375,  15725,    60),
  ('2026-06-30', 'Blaze',           'blaze',        'Speed Baccarat',     3634, 326950,  6482),
  ('2026-06-30', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-30', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-06-30', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-30', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-30', 'casa_apostas',  'Blackjack',          55),
  ('2026-06-30', 'casa_apostas',  'Futebol Brasileiro', 24),
  ('2026-06-30', 'casa_apostas',  'Speed Baccarat',     49),
  ('2026-06-30', 'casa_apostas',  'Roleta',            112),
  ('2026-06-30', 'blaze',         'Blackjack',         204),
  ('2026-06-30', 'blaze',         'Speed Baccarat',    311),
  ('2026-06-30', 'blaze',         'Roleta',            436),
  ('2026-06-30', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-30', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-30', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-30', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1709),
  ('2026-06-01', 'blaze',        11101),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
