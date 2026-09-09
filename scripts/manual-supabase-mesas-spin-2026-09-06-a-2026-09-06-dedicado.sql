-- Mesas Spin — 2026-09-06 a 2026-09-06: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-06', 'blaze',  1457542,  10158, 121246, 868),
  ('2026-09-06', 'casa_apostas',   332027,  -5679,  33899, 133)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-06', 'Blaze', 'blaze', 'Blackjack 1',   4408,   242708,  11388),
  ('2026-09-06', 'Blaze', 'blaze', 'Blackjack 2',   5755,   178205,   9827),
  ('2026-09-06', 'Blaze', 'blaze', 'Roleta',   5098,   506301,  90895),
  ('2026-09-06', 'Blaze', 'blaze', 'Speed Baccarat', -41228,   475353,   9061),
  ('2026-09-06', 'Blaze', 'blaze', 'Blackjack VIP',  36125,    54975,     75),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   3518,    82575,   1673),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2', -14022,    57753,   1891),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Roleta',   2916,    61016,  28988),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   5577,    22235,    537),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -3785,   102125,    229),
  ('2026-09-06', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    117,     6323,    581)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-06', 'blaze', 'Blackjack', 270),
  ('2026-09-06', 'blaze', 'Speed Baccarat', 334),
  ('2026-09-06', 'blaze', 'Roleta', 330),
  ('2026-09-06', 'casa_apostas', 'Blackjack',  31),
  ('2026-09-06', 'casa_apostas', 'Futebol Brasileiro',  11),
  ('2026-09-06', 'casa_apostas', 'Speed Baccarat',  15),
  ('2026-09-06', 'casa_apostas', 'Roleta',  91)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  422),
  ('2026-09-01', 'blaze', 3477)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
