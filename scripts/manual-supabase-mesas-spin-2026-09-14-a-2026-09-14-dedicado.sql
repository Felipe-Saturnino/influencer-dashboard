-- Mesas Spin — 2026-09-14 a 2026-09-14: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-14', 'blaze',   911215,  37794, 102817, 875),
  ('2026-09-14', 'casa_apostas',   510872, -23404,  28294, 125)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-14', 'Blaze', 'blaze', 'Blackjack 1',   8938,   183413,  10204),
  ('2026-09-14', 'Blaze', 'blaze', 'Blackjack 2',   6688,   218603,   9615),
  ('2026-09-14', 'Blaze', 'blaze', 'Roleta',  10350,   241984,  75397),
  ('2026-09-14', 'Blaze', 'blaze', 'Speed Baccarat',   8005,   224240,   7402),
  ('2026-09-14', 'Blaze', 'blaze', 'Blackjack VIP',   3813,    42975,    199),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   1233,    83998,   1474),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   4843,    64610,   1796),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Roleta', -31240,   244119,  23918),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   5069,    51575,    629),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -6932,    39200,    232),
  ('2026-09-14', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   3623,    27370,    245)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-14', 'blaze', 'Blackjack', 271),
  ('2026-09-14', 'blaze', 'Speed Baccarat', 334),
  ('2026-09-14', 'blaze', 'Roleta', 331),
  ('2026-09-14', 'casa_apostas', 'Blackjack',  29),
  ('2026-09-14', 'casa_apostas', 'Futebol Brasileiro',   9),
  ('2026-09-14', 'casa_apostas', 'Speed Baccarat',  16),
  ('2026-09-14', 'casa_apostas', 'Roleta',  87)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  641),
  ('2026-09-01', 'blaze', 5847)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
