-- Mesas Spin — 2026-09-03 a 2026-09-03: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-03', 'blaze',  1441699, -31671, 135577, 897),
  ('2026-09-03', 'casa_apostas',   585190,  57824,  34705, 136)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-03', 'Blaze', 'blaze', 'Blackjack 1',   2810,   211900,   9592),
  ('2026-09-03', 'Blaze', 'blaze', 'Blackjack 2',   9365,   134700,   8113),
  ('2026-09-03', 'Blaze', 'blaze', 'Roleta',   5789,   336439, 109003),
  ('2026-09-03', 'Blaze', 'blaze', 'Speed Baccarat', -59435,   650172,   8448),
  ('2026-09-03', 'Blaze', 'blaze', 'Blackjack VIP',   9800,   108488,    421),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  -4752,   125755,   1605),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   8215,    99033,   2156),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Roleta',  12133,   148744,  29023),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  46322,   179715,   1642),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -3495,    19370,    161),
  ('2026-09-03', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -599,    12573,    118)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-03', 'blaze', 'Blackjack', 289),
  ('2026-09-03', 'blaze', 'Speed Baccarat', 359),
  ('2026-09-03', 'blaze', 'Roleta', 325),
  ('2026-09-03', 'casa_apostas', 'Blackjack',  22),
  ('2026-09-03', 'casa_apostas', 'Futebol Brasileiro',  12),
  ('2026-09-03', 'casa_apostas', 'Speed Baccarat',  30),
  ('2026-09-03', 'casa_apostas', 'Roleta',  87)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  288),
  ('2026-09-01', 'blaze', 2248)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
