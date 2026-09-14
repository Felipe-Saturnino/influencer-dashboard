-- Mesas Spin — 2026-09-13 a 2026-09-13: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-13', 'blaze',   858682,  64566, 108083, 763),
  ('2026-09-13', 'casa_apostas',   420313,  -5439,  71731, 117)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-13', 'Blaze', 'blaze', 'Blackjack 1',   5748,   209415,  10678),
  ('2026-09-13', 'Blaze', 'blaze', 'Blackjack 2',   9750,   131368,   7855),
  ('2026-09-13', 'Blaze', 'blaze', 'Roleta',  21505,   269184,  81712),
  ('2026-09-13', 'Blaze', 'blaze', 'Speed Baccarat',  30688,   206415,   7732),
  ('2026-09-13', 'Blaze', 'blaze', 'Blackjack VIP',  -3125,    42300,    106),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   6303,    16950,    494),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    748,    27913,   1337),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',   1533,   197536,  68446),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -2418,    70739,    868),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -11240,   100770,    136),
  ('2026-09-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   -365,     6405,    450)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-13', 'blaze', 'Blackjack', 236),
  ('2026-09-13', 'blaze', 'Speed Baccarat', 298),
  ('2026-09-13', 'blaze', 'Roleta', 291),
  ('2026-09-13', 'casa_apostas', 'Blackjack',  29),
  ('2026-09-13', 'casa_apostas', 'Futebol Brasileiro',  10),
  ('2026-09-13', 'casa_apostas', 'Speed Baccarat',  18),
  ('2026-09-13', 'casa_apostas', 'Roleta',  80)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  614),
  ('2026-09-01', 'blaze', 5508)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
