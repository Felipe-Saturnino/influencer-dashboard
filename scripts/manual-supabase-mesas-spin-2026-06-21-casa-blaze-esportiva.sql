-- Mesas Spin — 21/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa GGR/turnover ±1; apostas = OK. Blaze turnover ±1; demais = OK.
-- Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-21', 'casa_apostas',  322411,  15212,  48083, 210),
  ('2026-06-21', 'blaze',        1184800,  56535, 112545, 864),
  ('2026-06-21', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',       -1505,  12285,   362),
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'Roleta',             8039, 139206, 40459),
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2865,  40333,  4525),
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -3013,  13585,    71),
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     6610,  97109,  1894),
  ('2026-06-21', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 2215,  19894,   772),
  ('2026-06-21', 'Blaze',           'blaze',        'Blackjack 1',       -1173, 284123, 10605),
  ('2026-06-21', 'Blaze',           'blaze',        'Roleta',            30340, 296522, 85609),
  ('2026-06-21', 'Blaze',           'blaze',        'Blackjack 2',        4550, 164858,  6977),
  ('2026-06-21', 'Blaze',           'blaze',        'Blackjack VIP',      4700,  31300,   141),
  ('2026-06-21', 'Blaze',           'blaze',        'Speed Baccarat',    18118, 407998,  9213),
  ('2026-06-21', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-21', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-06-21', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-21', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-21', 'casa_apostas',  'Blackjack',          41),
  ('2026-06-21', 'casa_apostas',  'Futebol Brasileiro', 26),
  ('2026-06-21', 'casa_apostas',  'Speed Baccarat',     49),
  ('2026-06-21', 'casa_apostas',  'Roleta',            128),
  ('2026-06-21', 'blaze',         'Blackjack',         216),
  ('2026-06-21', 'blaze',         'Speed Baccarat',    315),
  ('2026-06-21', 'blaze',         'Roleta',            384),
  ('2026-06-21', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-21', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-21', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-21', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1460),
  ('2026-06-01', 'blaze',         8756),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
