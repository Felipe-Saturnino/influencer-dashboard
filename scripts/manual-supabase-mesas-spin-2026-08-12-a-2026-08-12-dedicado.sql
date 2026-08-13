-- Mesas Spin — 2026-08-12 a 2026-08-12: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-12', 'blaze',  1404505,  74894, 157842, 865),
  ('2026-08-12', 'casa_apostas',   315058,  15174,  43269, 155)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-12', 'Blaze', 'blaze', 'Blackjack 1',  11078,   242673,  10592),
  ('2026-08-12', 'Blaze', 'blaze', 'Blackjack 2',   9683,   160955,   7771),
  ('2026-08-12', 'Blaze', 'blaze', 'Roleta',  49514,   723029, 132444),
  ('2026-08-12', 'Blaze', 'blaze', 'Speed Baccarat',   8669,   242248,   6895),
  ('2026-08-12', 'Blaze', 'blaze', 'Blackjack VIP',  -4050,    35600,    140),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   5395,    88970,   1659),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   4833,   102850,   5035),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Roleta',   5052,    79948,  33439),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    328,    19793,   2435),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -640,    14190,    298),
  ('2026-08-12', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    206,     9307,    403)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-12', 'blaze', 'Blackjack', 261),
  ('2026-08-12', 'blaze', 'Speed Baccarat', 305),
  ('2026-08-12', 'blaze', 'Roleta', 357),
  ('2026-08-12', 'casa_apostas', 'Blackjack',  45),
  ('2026-08-12', 'casa_apostas', 'Futebol Brasileiro',  14),
  ('2026-08-12', 'casa_apostas', 'Speed Baccarat',  38),
  ('2026-08-12', 'casa_apostas', 'Roleta',  90)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  669),
  ('2026-08-01', 'blaze', 4486)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
