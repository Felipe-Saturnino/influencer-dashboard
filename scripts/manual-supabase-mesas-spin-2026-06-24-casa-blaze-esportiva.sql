-- Mesas Spin — 24/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa turnover ±1; demais Casa = OK. Blaze GGR/turnover ±1; apostas = OK.
-- Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-24', 'casa_apostas',  220726,   6627,  48171, 183),
  ('2026-06-24', 'blaze',         923021, -14515, 122655, 869),
  ('2026-06-24', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        2013,  26845,  1275),
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'Roleta',             7007, 112537, 40580),
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',         -80,  28965,  2951),
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -1460,  29095,   499),
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    -1405,  15206,  2271),
  ('2026-06-24', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  552,   8079,   595),
  ('2026-06-24', 'Blaze',           'blaze',        'Blackjack 1',        5455, 166780,  8815),
  ('2026-06-24', 'Blaze',           'blaze',        'Roleta',           -10481, 346788,101880),
  ('2026-06-24', 'Blaze',           'blaze',        'Blackjack 2',        7518,  82288,  4637),
  ('2026-06-24', 'Blaze',           'blaze',        'Blackjack VIP',       650,  47950,   168),
  ('2026-06-24', 'Blaze',           'blaze',        'Speed Baccarat',   -17656, 279216,  7155),
  ('2026-06-24', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-24', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-06-24', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-24', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-24', 'casa_apostas',  'Blackjack',          44),
  ('2026-06-24', 'casa_apostas',  'Futebol Brasileiro', 20),
  ('2026-06-24', 'casa_apostas',  'Speed Baccarat',     43),
  ('2026-06-24', 'casa_apostas',  'Roleta',            103),
  ('2026-06-24', 'blaze',         'Blackjack',         171),
  ('2026-06-24', 'blaze',         'Speed Baccarat',    323),
  ('2026-06-24', 'blaze',         'Roleta',            415),
  ('2026-06-24', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-24', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-24', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-24', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1548),
  ('2026-06-01', 'blaze',         9732),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
