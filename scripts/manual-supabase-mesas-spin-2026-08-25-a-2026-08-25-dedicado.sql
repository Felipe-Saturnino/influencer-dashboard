-- Mesas Spin — 2026-08-25 a 2026-08-25: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-25', 'blaze',  1653320, 323784, 132584, 832),
  ('2026-08-25', 'casa_apostas',   414782,  15266,  22833, 113)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-25', 'Blaze', 'blaze', 'Blackjack 1', -11150,   233965,  11109),
  ('2026-08-25', 'Blaze', 'blaze', 'Blackjack 2',  -2272,   270320,   9559),
  ('2026-08-25', 'Blaze', 'blaze', 'Roleta',   6994,   369814,  98598),
  ('2026-08-25', 'Blaze', 'blaze', 'Speed Baccarat', 306862,   636546,  12538),
  ('2026-08-25', 'Blaze', 'blaze', 'Blackjack VIP',  23350,   142675,    780),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  -1175,    68413,   1422),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1880,    81033,   2687),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Roleta',  17466,   139618,  17331),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -2409,    32168,    693),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -590,    92615,    648),
  ('2026-08-25', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     94,      935,     52)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-25', 'blaze', 'Blackjack', 241),
  ('2026-08-25', 'blaze', 'Speed Baccarat', 335),
  ('2026-08-25', 'blaze', 'Roleta', 322),
  ('2026-08-25', 'casa_apostas', 'Blackjack',  37),
  ('2026-08-25', 'casa_apostas', 'Futebol Brasileiro',   8),
  ('2026-08-25', 'casa_apostas', 'Speed Baccarat',  22),
  ('2026-08-25', 'casa_apostas', 'Roleta',  65)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 1010),
  ('2026-08-01', 'blaze', 7480)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
