-- Mesas Spin — 2026-08-31 a 2026-08-31: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-31', 'blaze',  2306889, 262483, 109780, 834),
  ('2026-08-31', 'casa_apostas',   447491,  54422,  19573, 113)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-31', 'Blaze', 'blaze', 'Blackjack 1',  29375,   203938,   8452),
  ('2026-08-31', 'Blaze', 'blaze', 'Blackjack 2',  -5730,   168583,   6088),
  ('2026-08-31', 'Blaze', 'blaze', 'Roleta',   9838,   188203,  85679),
  ('2026-08-31', 'Blaze', 'blaze', 'Speed Baccarat', 193725,  1590640,   9039),
  ('2026-08-31', 'Blaze', 'blaze', 'Blackjack VIP',  35275,   155525,    522),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  -2117,    69460,   1729),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1580,    10748,   1063),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Roleta',   1331,    38235,  14794),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  30991,   205153,   1199),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  12820,    80580,    540),
  ('2026-08-31', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   9817,    43315,    248)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-31', 'blaze', 'Blackjack', 237),
  ('2026-08-31', 'blaze', 'Speed Baccarat', 316),
  ('2026-08-31', 'blaze', 'Roleta', 340),
  ('2026-08-31', 'casa_apostas', 'Blackjack',  29),
  ('2026-08-31', 'casa_apostas', 'Futebol Brasileiro',  16),
  ('2026-08-31', 'casa_apostas', 'Speed Baccarat',  16),
  ('2026-08-31', 'casa_apostas', 'Roleta',  69)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 1145),
  ('2026-08-01', 'blaze', 8617)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
