-- Mesas Spin — 2026-08-27 a 2026-08-27: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-27', 'blaze',  1624918,  14499, 125172, 881),
  ('2026-08-27', 'casa_apostas',   241141,   8997,  23866, 119)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-27', 'Blaze', 'blaze', 'Blackjack 1',  -9177,   289653,  13362),
  ('2026-08-27', 'Blaze', 'blaze', 'Blackjack 2',   8335,   321830,   9839),
  ('2026-08-27', 'Blaze', 'blaze', 'Roleta',  21991,   295581,  89668),
  ('2026-08-27', 'Blaze', 'blaze', 'Speed Baccarat',  12675,   369254,  11181),
  ('2026-08-27', 'Blaze', 'blaze', 'Blackjack VIP', -19325,   348600,   1122),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   4148,    41363,   1630),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',  -4270,    40655,   1147),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Roleta',  17674,   105408,  20318),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -7199,    46208,    630),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -1432,     3895,     37),
  ('2026-08-27', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',     76,     3612,    104)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-27', 'blaze', 'Blackjack', 256),
  ('2026-08-27', 'blaze', 'Speed Baccarat', 383),
  ('2026-08-27', 'blaze', 'Roleta', 323),
  ('2026-08-27', 'casa_apostas', 'Blackjack',  35),
  ('2026-08-27', 'casa_apostas', 'Futebol Brasileiro',   9),
  ('2026-08-27', 'casa_apostas', 'Speed Baccarat',  17),
  ('2026-08-27', 'casa_apostas', 'Roleta',  71)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 1049),
  ('2026-08-01', 'blaze', 7894)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
