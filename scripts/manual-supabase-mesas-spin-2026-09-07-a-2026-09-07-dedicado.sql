-- Mesas Spin — 2026-09-07 a 2026-09-07: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-07', 'blaze',  1133641,  -2305, 125908, 936),
  ('2026-09-07', 'casa_apostas',   106698,   5021,  20444, 113)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-07', 'Blaze', 'blaze', 'Blackjack 1',   7468,   219875,  11489),
  ('2026-09-07', 'Blaze', 'blaze', 'Blackjack 2',  13548,   152688,   9712),
  ('2026-09-07', 'Blaze', 'blaze', 'Roleta', -17714,   385889,  95339),
  ('2026-09-07', 'Blaze', 'blaze', 'Speed Baccarat',   8105,   260889,   8980),
  ('2026-09-07', 'Blaze', 'blaze', 'Blackjack VIP', -13712,   114300,    388),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    165,     6318,    211),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -575,     4078,    371),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Roleta',   3385,    67498,  18969),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    375,    15453,    464),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -525,     1450,     10),
  ('2026-09-07', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   2196,    11901,    419)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-07', 'blaze', 'Blackjack', 276),
  ('2026-09-07', 'blaze', 'Speed Baccarat', 360),
  ('2026-09-07', 'blaze', 'Roleta', 371),
  ('2026-09-07', 'casa_apostas', 'Blackjack',  18),
  ('2026-09-07', 'casa_apostas', 'Futebol Brasileiro',   9),
  ('2026-09-07', 'casa_apostas', 'Speed Baccarat',  17),
  ('2026-09-07', 'casa_apostas', 'Roleta',  81)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  457),
  ('2026-09-01', 'blaze', 3785)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
