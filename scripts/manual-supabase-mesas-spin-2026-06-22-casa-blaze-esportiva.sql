-- Mesas Spin — 22/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa turnover ±1; demais = OK. Blaze GGR ±1; turnover/apostas = OK.
-- Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-22', 'casa_apostas',  396169,   3097,  66640, 223),
  ('2026-06-22', 'blaze',        1021511,   9113,  93258, 847),
  ('2026-06-22', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',       -2400,  84563,  2993),
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'Roleta',             3525, 155696, 55764),
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2845,  54810,  4403),
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    1048,  67615,  1355),
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      -54,  13930,  1097),
  ('2026-06-22', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',-1867,  19556,  1028),
  ('2026-06-22', 'Blaze',           'blaze',        'Blackjack 1',        9198, 258650, 11880),
  ('2026-06-22', 'Blaze',           'blaze',        'Roleta',            16905, 268939, 66596),
  ('2026-06-22', 'Blaze',           'blaze',        'Blackjack 2',        7160, 108590,  7262),
  ('2026-06-22', 'Blaze',           'blaze',        'Blackjack VIP',      7150,  30425,    85),
  ('2026-06-22', 'Blaze',           'blaze',        'Speed Baccarat',   -31299, 354907,  7435),
  ('2026-06-22', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-22', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-06-22', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-22', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-22', 'casa_apostas',  'Blackjack',          51),
  ('2026-06-22', 'casa_apostas',  'Futebol Brasileiro', 27),
  ('2026-06-22', 'casa_apostas',  'Speed Baccarat',     40),
  ('2026-06-22', 'casa_apostas',  'Roleta',            141),
  ('2026-06-22', 'blaze',         'Blackjack',         185),
  ('2026-06-22', 'blaze',         'Speed Baccarat',    314),
  ('2026-06-22', 'blaze',         'Roleta',            399),
  ('2026-06-22', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-22', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-22', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-22', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1490),
  ('2026-06-01', 'blaze',         9096),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
