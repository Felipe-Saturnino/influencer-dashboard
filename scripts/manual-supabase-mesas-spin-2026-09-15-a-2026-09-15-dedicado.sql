-- Mesas Spin — 2026-09-15 a 2026-09-15: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-15', 'blaze',  1508765,   4279, 124267, 848),
  ('2026-09-15', 'casa_apostas',   400329,  22409,  32589, 115)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-15', 'Blaze', 'blaze', 'Blackjack 1',  15708,   250693,  13066),
  ('2026-09-15', 'Blaze', 'blaze', 'Blackjack 2',   5980,   216993,  11136),
  ('2026-09-15', 'Blaze', 'blaze', 'Roleta', -26054,   662774,  92284),
  ('2026-09-15', 'Blaze', 'blaze', 'Speed Baccarat', -10580,   286605,   7549),
  ('2026-09-15', 'Blaze', 'blaze', 'Blackjack VIP',  19225,    91700,    232),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1', -10540,    36805,    730),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1820,    16958,   1264),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',  28876,   216290,  29295),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  13188,    95595,   1066),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -11100,    31850,     50),
  ('2026-09-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    165,     2831,    184)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-15', 'blaze', 'Blackjack', 263),
  ('2026-09-15', 'blaze', 'Speed Baccarat', 324),
  ('2026-09-15', 'blaze', 'Roleta', 328),
  ('2026-09-15', 'casa_apostas', 'Blackjack',  21),
  ('2026-09-15', 'casa_apostas', 'Futebol Brasileiro',  11),
  ('2026-09-15', 'casa_apostas', 'Speed Baccarat',  16),
  ('2026-09-15', 'casa_apostas', 'Roleta',  79)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  668),
  ('2026-09-01', 'blaze', 6086)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
