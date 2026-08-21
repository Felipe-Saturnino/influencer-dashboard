-- Mesas Spin — 2026-08-20 a 2026-08-20: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-20', 'blaze',  1089882,  32829, 129954, 837),
  ('2026-08-20', 'casa_apostas',   191177, -15062,  22517, 136)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-20', 'Blaze', 'blaze', 'Blackjack 1',  11483,   231093,  10860),
  ('2026-08-20', 'Blaze', 'blaze', 'Blackjack 2',   7905,   141450,   8193),
  ('2026-08-20', 'Blaze', 'blaze', 'Roleta',   -257,   320612, 101511),
  ('2026-08-20', 'Blaze', 'blaze', 'Speed Baccarat',   5273,   269652,   8718),
  ('2026-08-20', 'Blaze', 'blaze', 'Blackjack VIP',   8425,   127075,    672),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    638,    14803,    875),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    325,    34153,   2459),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Roleta', -16514,   107979,  17833),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    667,    27460,   1103),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -430,     5510,    120),
  ('2026-08-20', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    252,     1272,    127)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-20', 'blaze', 'Blackjack', 236),
  ('2026-08-20', 'blaze', 'Speed Baccarat', 332),
  ('2026-08-20', 'blaze', 'Roleta', 333),
  ('2026-08-20', 'casa_apostas', 'Blackjack',  44),
  ('2026-08-20', 'casa_apostas', 'Futebol Brasileiro',  10),
  ('2026-08-20', 'casa_apostas', 'Speed Baccarat',  25),
  ('2026-08-20', 'casa_apostas', 'Roleta',  72)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  903),
  ('2026-08-01', 'blaze', 6393)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
