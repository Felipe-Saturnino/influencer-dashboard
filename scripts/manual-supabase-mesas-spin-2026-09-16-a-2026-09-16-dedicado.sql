-- Mesas Spin — 2026-09-16 a 2026-09-16: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-16', 'blaze',  1284430,  45637, 109867, 862),
  ('2026-09-16', 'casa_apostas',   380726, -45011,  41437, 118)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-16', 'Blaze', 'blaze', 'Blackjack 1',    930,   178400,  10434),
  ('2026-09-16', 'Blaze', 'blaze', 'Blackjack 2',    693,   127290,   8416),
  ('2026-09-16', 'Blaze', 'blaze', 'Roleta',  39265,   604737,  81595),
  ('2026-09-16', 'Blaze', 'blaze', 'Speed Baccarat',   2474,   337853,   9126),
  ('2026-09-16', 'Blaze', 'blaze', 'Blackjack VIP',   2275,    36150,    296),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    300,     9975,    552),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   1613,    23673,   1211),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Roleta', -39837,   309326,  38920),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -256,    21748,    561),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -7220,    14150,     61),
  ('2026-09-16', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    389,     1854,    132)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-16', 'blaze', 'Blackjack', 275),
  ('2026-09-16', 'blaze', 'Speed Baccarat', 339),
  ('2026-09-16', 'blaze', 'Roleta', 321),
  ('2026-09-16', 'casa_apostas', 'Blackjack',  23),
  ('2026-09-16', 'casa_apostas', 'Futebol Brasileiro',   7),
  ('2026-09-16', 'casa_apostas', 'Speed Baccarat',  13),
  ('2026-09-16', 'casa_apostas', 'Roleta',  85)
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
