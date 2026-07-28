-- Mesas Spin — 27/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR ±1; Blaze GGR/turnover ±1; demais = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-27', 'casa_apostas',  514603, -14106,  33062, 165),
  ('2026-07-27', 'blaze',        2025255, 267343, 144123, 756)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         8353,   86830,  3069),
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       -12468,  103270,  3723),
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'Roleta',              3303,   50924, 23891),
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      1925,   49964,  1229),
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -15435,  211535,   755),
  ('2026-07-27', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   217,   12080,   395),
  ('2026-07-27', 'Blaze',           'blaze',        'Blackjack 1',         3695,  232263,  9185),
  ('2026-07-27', 'Blaze',           'blaze',        'Blackjack 2',         3923,  134935,  6892),
  ('2026-07-27', 'Blaze',           'blaze',        'Roleta',            260846, 1278783,117678),
  ('2026-07-27', 'Blaze',           'blaze',        'Speed Baccarat',     -2233,  327950, 10084),
  ('2026-07-27', 'Blaze',           'blaze',        'Blackjack VIP',       1113,   51325,   284)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-27', 'casa_apostas', 'Blackjack',          43),
  ('2026-07-27', 'casa_apostas', 'Futebol Brasileiro', 14),
  ('2026-07-27', 'casa_apostas', 'Speed Baccarat',     42),
  ('2026-07-27', 'casa_apostas', 'Roleta',             94),
  ('2026-07-27', 'blaze',        'Blackjack',         208),
  ('2026-07-27', 'blaze',        'Speed Baccarat',    283),
  ('2026-07-27', 'blaze',        'Roleta',            314)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  1396),
  ('2026-07-01', 'blaze',         9434)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
