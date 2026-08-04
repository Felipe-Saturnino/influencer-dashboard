-- Mesas Spin — 01/08/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1 / turnover −2; Blaze GGR/turnover −1; apostas = OK.
-- UAP por jogo ≠ daily (esperado).
-- Monthly agosto conforme print do dia 01.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  151390,  7853,  45626, 136),
  ('2026-08-01', 'blaze',        1549989, 29684, 149616, 724)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',          2225,   22333,  1203),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',         -6280,   51543,  2545),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'Roleta',               2144,   50025, 40221),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      -1426,    6248,  1459),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     10683,   19355,    82),
  ('2026-08-01', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    508,    1888,   116),
  ('2026-08-01', 'Blaze',           'blaze',        'Blackjack 1',         32695,  240703,  9862),
  ('2026-08-01', 'Blaze',           'blaze',        'Blackjack 2',          8425,  151068,  8936),
  ('2026-08-01', 'Blaze',           'blaze',        'Roleta',             -31290,  896559,125425),
  ('2026-08-01', 'Blaze',           'blaze',        'Speed Baccarat',      15428,  199060,  5182),
  ('2026-08-01', 'Blaze',           'blaze',        'Blackjack VIP',        4425,   62600,   211)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 'Blackjack',          34),
  ('2026-08-01', 'casa_apostas', 'Futebol Brasileiro',  8),
  ('2026-08-01', 'casa_apostas', 'Speed Baccarat',     28),
  ('2026-08-01', 'casa_apostas', 'Roleta',             79),
  ('2026-08-01', 'blaze',        'Blackjack',         214),
  ('2026-08-01', 'blaze',        'Speed Baccarat',    272),
  ('2026-08-01', 'blaze',        'Roleta',            288)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  223),
  ('2026-08-01', 'blaze',        1297)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
