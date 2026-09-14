-- Mesas Spin — 2026-09-09 a 2026-09-09: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-09', 'blaze',  1197324,  63338, 127321, 892),
  ('2026-09-09', 'casa_apostas',   434171, -16767,  43602, 137)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-09', 'Blaze', 'blaze', 'Blackjack 1',   4965,   231708,   9204),
  ('2026-09-09', 'Blaze', 'blaze', 'Blackjack 2',   4320,   210800,  10068),
  ('2026-09-09', 'Blaze', 'blaze', 'Roleta',  40629,   395368,  98930),
  ('2026-09-09', 'Blaze', 'blaze', 'Speed Baccarat',  16424,   325323,   8876),
  ('2026-09-09', 'Blaze', 'blaze', 'Blackjack VIP',  -3000,    34125,    243),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    898,    26190,   1082),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   3908,    67660,   3287),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Roleta', -14538,   209608,  37263),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1677,    87875,   1178),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -6045,    36175,    567),
  ('2026-09-09', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    687,     6663,    225)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-09', 'blaze', 'Blackjack', 265),
  ('2026-09-09', 'blaze', 'Speed Baccarat', 354),
  ('2026-09-09', 'blaze', 'Roleta', 348),
  ('2026-09-09', 'casa_apostas', 'Blackjack',  34),
  ('2026-09-09', 'casa_apostas', 'Futebol Brasileiro',   7),
  ('2026-09-09', 'casa_apostas', 'Speed Baccarat',  14),
  ('2026-09-09', 'casa_apostas', 'Roleta',  89)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
