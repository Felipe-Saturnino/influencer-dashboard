-- Mesas Spin — 2026-09-01 a 2026-09-01: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-01', 'blaze',  1584059,  18530, 138566, 932),
  ('2026-09-01', 'casa_apostas',   719846,  48374,  42552, 126)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-01', 'Blaze', 'blaze', 'Blackjack 1', -24845,   432435,  10668),
  ('2026-09-01', 'Blaze', 'blaze', 'Blackjack 2',   7995,   288133,   9421),
  ('2026-09-01', 'Blaze', 'blaze', 'Roleta',  30624,   322780, 110416),
  ('2026-09-01', 'Blaze', 'blaze', 'Speed Baccarat',  -3519,   384286,   7677),
  ('2026-09-01', 'Blaze', 'blaze', 'Blackjack VIP',   8275,   156425,    384),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   6208,    57780,   1689),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1108,    19825,   1671),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Roleta',  11412,   102814,  37579),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1465,   133230,   1033),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   1440,     3105,     32),
  ('2026-09-01', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  29671,   403092,    548)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-01', 'blaze', 'Blackjack', 310),
  ('2026-09-01', 'blaze', 'Speed Baccarat', 360),
  ('2026-09-01', 'blaze', 'Roleta', 334),
  ('2026-09-01', 'casa_apostas', 'Blackjack',  33),
  ('2026-09-01', 'casa_apostas', 'Futebol Brasileiro',  17),
  ('2026-09-01', 'casa_apostas', 'Speed Baccarat',  18),
  ('2026-09-01', 'casa_apostas', 'Roleta',  73)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas', 131),
  ('2026-09-01', 'blaze', 970)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
