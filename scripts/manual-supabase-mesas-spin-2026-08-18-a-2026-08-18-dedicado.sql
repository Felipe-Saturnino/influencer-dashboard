-- Mesas Spin — 2026-08-18 a 2026-08-18: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-18', 'blaze',  1408283,  42494, 134241, 747),
  ('2026-08-18', 'casa_apostas',   301696,   9417,  30328, 129)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-18', 'Blaze', 'blaze', 'Blackjack 1',   7530,   236433,  10107),
  ('2026-08-18', 'Blaze', 'blaze', 'Blackjack 2',   3640,   183328,   7541),
  ('2026-08-18', 'Blaze', 'blaze', 'Roleta',  20592,   377651, 105726),
  ('2026-08-18', 'Blaze', 'blaze', 'Speed Baccarat',  12382,   355346,   9692),
  ('2026-08-18', 'Blaze', 'blaze', 'Blackjack VIP',  -1650,   255525,   1175),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   2798,    32980,   1052),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   4595,    93340,   5417),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Roleta',    372,    78924,  22607),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -3899,    71060,    828),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   5248,    22248,    308),
  ('2026-08-18', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    303,     3144,    116)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-18', 'blaze', 'Blackjack', 244),
  ('2026-08-18', 'blaze', 'Speed Baccarat', 262),
  ('2026-08-18', 'blaze', 'Roleta', 292),
  ('2026-08-18', 'casa_apostas', 'Blackjack',  48),
  ('2026-08-18', 'casa_apostas', 'Futebol Brasileiro',  17),
  ('2026-08-18', 'casa_apostas', 'Speed Baccarat',  25),
  ('2026-08-18', 'casa_apostas', 'Roleta',  65)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  839),
  ('2026-08-01', 'blaze', 5897)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
