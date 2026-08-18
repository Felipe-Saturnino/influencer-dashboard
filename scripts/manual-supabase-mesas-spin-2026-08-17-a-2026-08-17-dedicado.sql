-- Mesas Spin — 2026-08-17 a 2026-08-17: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-17', 'blaze',  1078445,  11260, 103947, 788),
  ('2026-08-17', 'casa_apostas',   215308,   3914,  21413, 111)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-17', 'Blaze', 'blaze', 'Blackjack 1',   5940,   284365,  10441),
  ('2026-08-17', 'Blaze', 'blaze', 'Blackjack 2',   8600,   114418,   6843),
  ('2026-08-17', 'Blaze', 'blaze', 'Roleta',  12303,   295928,  78109),
  ('2026-08-17', 'Blaze', 'blaze', 'Speed Baccarat',     54,   259509,   8163),
  ('2026-08-17', 'Blaze', 'blaze', 'Blackjack VIP', -15637,   124225,    391),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   1560,    16650,    966),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -485,    34405,   2888),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Roleta',   3778,    42245,  15940),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -4801,   112525,   1452),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    430,     1290,     29),
  ('2026-08-17', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   3432,     8193,    138)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-17', 'blaze', 'Blackjack', 248),
  ('2026-08-17', 'blaze', 'Speed Baccarat', 278),
  ('2026-08-17', 'blaze', 'Roleta', 319),
  ('2026-08-17', 'casa_apostas', 'Blackjack',  31),
  ('2026-08-17', 'casa_apostas', 'Futebol Brasileiro',   7),
  ('2026-08-17', 'casa_apostas', 'Speed Baccarat',  24),
  ('2026-08-17', 'casa_apostas', 'Roleta',  68)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  809),
  ('2026-08-01', 'blaze', 5657)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
