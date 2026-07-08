-- Mesas Spin — 06/07/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa GGR/turnover ±1; Blaze = OK. Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-06', 'casa_apostas',  260548,  24615,  32846, 203),
  ('2026-07-06', 'blaze',        1262763,  -7727, 121557, 931),
  ('2026-07-06', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        3543,  12530,   678),
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'Roleta',             8795,  89016, 26279),
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        3270,  43143,  1746),
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -1175,   7045,   175),
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     1298,  23638,  3097),
  ('2026-07-06', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 8885,  85177,   871),
  ('2026-07-06', 'Blaze',           'blaze',        'Blackjack 1',       14475, 155640,  9697),
  ('2026-07-06', 'Blaze',           'blaze',        'Roleta',            22795, 389869, 93121),
  ('2026-07-06', 'Blaze',           'blaze',        'Blackjack 2',        7643, 124385,  7549),
  ('2026-07-06', 'Blaze',           'blaze',        'Blackjack VIP',    -61750, 275625,   133),
  ('2026-07-06', 'Blaze',           'blaze',        'Speed Baccarat',     9110, 317244, 11057),
  ('2026-07-06', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-07-06', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-07-06', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-07-06', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-06', 'casa_apostas',  'Blackjack',          41),
  ('2026-07-06', 'casa_apostas',  'Futebol Brasileiro', 24),
  ('2026-07-06', 'casa_apostas',  'Speed Baccarat',     43),
  ('2026-07-06', 'casa_apostas',  'Roleta',            122),
  ('2026-07-06', 'blaze',         'Blackjack',         214),
  ('2026-07-06', 'blaze',         'Speed Baccarat',    311),
  ('2026-07-06', 'blaze',         'Roleta',            463),
  ('2026-07-06', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-06', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-06', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-06', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  614),
  ('2026-07-01', 'blaze',        3742),
  ('2026-07-01', 'esportiva_bet',   0)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
