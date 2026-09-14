-- Mesas Spin — 2026-09-11 a 2026-09-12: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-11', 'blaze',  1129562,  63479,  98000, 950),
  ('2026-09-11', 'casa_apostas',   212054,  11473,  41318, 101),
  ('2026-09-12', 'blaze',   825464,  21162, 121469, 930),
  ('2026-09-12', 'casa_apostas',   387898,  12416,  60919, 126)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-11', 'Blaze', 'blaze', 'Blackjack 1',  21308,   159825,   9413),
  ('2026-09-11', 'Blaze', 'blaze', 'Blackjack 2',   7138,   182500,  10397),
  ('2026-09-11', 'Blaze', 'blaze', 'Roleta',  23420,   376508,  70242),
  ('2026-09-11', 'Blaze', 'blaze', 'Speed Baccarat',  17688,   381779,   7778),
  ('2026-09-11', 'Blaze', 'blaze', 'Blackjack VIP',  -6075,    28950,    170),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   1613,    32895,    698),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    100,    38373,    716),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'Roleta',   4190,    69743,  38762),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    968,    13215,    444),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -570,    25125,    334),
  ('2026-09-11', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   5172,    32703,    364),
  ('2026-09-12', 'Blaze', 'blaze', 'Blackjack 1',  13913,   160903,   9677),
  ('2026-09-12', 'Blaze', 'blaze', 'Blackjack 2',   3715,   131848,   8570),
  ('2026-09-12', 'Blaze', 'blaze', 'Roleta',  -1970,   289669,  94136),
  ('2026-09-12', 'Blaze', 'blaze', 'Speed Baccarat',   5704,   223544,   9039),
  ('2026-09-12', 'Blaze', 'blaze', 'Blackjack VIP',   -200,    19500,     47),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',  -2765,     9980,    176),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -675,    69703,   1851),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'Roleta',   4259,   129643,  57624),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  15789,    56870,    631),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -4355,   115105,    160),
  ('2026-09-12', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    163,     6597,    477)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-11', 'blaze', 'Blackjack', 289),
  ('2026-09-11', 'blaze', 'Speed Baccarat', 360),
  ('2026-09-11', 'blaze', 'Roleta', 379),
  ('2026-09-11', 'casa_apostas', 'Blackjack',  16),
  ('2026-09-11', 'casa_apostas', 'Futebol Brasileiro',  12),
  ('2026-09-11', 'casa_apostas', 'Speed Baccarat',  15),
  ('2026-09-11', 'casa_apostas', 'Roleta',  72),
  ('2026-09-12', 'blaze', 'Blackjack', 284),
  ('2026-09-12', 'blaze', 'Speed Baccarat', 383),
  ('2026-09-12', 'blaze', 'Roleta', 329),
  ('2026-09-12', 'casa_apostas', 'Blackjack',  30),
  ('2026-09-12', 'casa_apostas', 'Futebol Brasileiro',  11),
  ('2026-09-12', 'casa_apostas', 'Speed Baccarat',  17),
  ('2026-09-12', 'casa_apostas', 'Roleta',  82)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  594),
  ('2026-09-01', 'blaze', 5394)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
