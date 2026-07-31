-- Mesas Spin — 30/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1 / turnover −1; apostas = OK (daily corrigido 38208 → 38028).
-- Blaze: GGR/turnover ±1; apostas = OK (BJ2 7497 → 4797).
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-30', 'casa_apostas',  259914,  -13465,  38028, 135),
  ('2026-07-30', 'blaze',        3864106, -122879, 150371, 721)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',          5955,   53930,   841),
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',          3660,   17548,  1284),
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'Roleta',               -427,   48710, 33613),
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',         93,    4688,  1916),
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    -22645,  133175,   234),
  ('2026-07-30', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -102,    1864,   140),
  ('2026-07-30', 'Blaze',           'blaze',        'Blackjack 1',         -1515,  175928,  8590),
  ('2026-07-30', 'Blaze',           'blaze',        'Blackjack 2',          4233,  148685,  4797),
  ('2026-07-30', 'Blaze',           'blaze',        'Roleta',                824,  529036,130975),
  ('2026-07-30', 'Blaze',           'blaze',        'Speed Baccarat',    -132583, 2920658,  5717),
  ('2026-07-30', 'Blaze',           'blaze',        'Blackjack VIP',        6163,   89800,   292)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-30', 'casa_apostas', 'Blackjack',          29),
  ('2026-07-30', 'casa_apostas', 'Futebol Brasileiro', 10),
  ('2026-07-30', 'casa_apostas', 'Speed Baccarat',     32),
  ('2026-07-30', 'casa_apostas', 'Roleta',             82),
  ('2026-07-30', 'blaze',        'Blackjack',         203),
  ('2026-07-30', 'blaze',        'Speed Baccarat',    273),
  ('2026-07-30', 'blaze',        'Roleta',            298)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas', 1437),
  ('2026-07-01', 'blaze',        9914)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
