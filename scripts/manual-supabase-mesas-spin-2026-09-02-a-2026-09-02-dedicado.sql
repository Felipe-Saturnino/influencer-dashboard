-- Mesas Spin — 2026-09-02 a 2026-09-02: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-09-02', 'blaze',  2433332, -28696, 175237, 925),
  ('2026-09-02', 'casa_apostas',   471088,  -4645,  31309, 120)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-09-02', 'Blaze', 'blaze', 'Blackjack 1',   9863,   258095,  11159),
  ('2026-09-02', 'Blaze', 'blaze', 'Blackjack 2',   2863,   273805,  10298),
  ('2026-09-02', 'Blaze', 'blaze', 'Roleta', -32760,   921125, 145518),
  ('2026-09-02', 'Blaze', 'blaze', 'Speed Baccarat',   5938,   616907,   7483),
  ('2026-09-02', 'Blaze', 'blaze', 'Blackjack VIP', -14600,   363400,    779),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    218,     4665,    346),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2', -11827,    51863,   1084),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Roleta',   3746,    61464,  27813),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   1214,   244595,   1859),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',      0,        0,      0),
  ('2026-09-02', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   2004,   108501,    207)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-09-02', 'blaze', 'Blackjack', 265),
  ('2026-09-02', 'blaze', 'Speed Baccarat', 382),
  ('2026-09-02', 'blaze', 'Roleta', 352),
  ('2026-09-02', 'casa_apostas', 'Blackjack',  22),
  ('2026-09-02', 'casa_apostas', 'Futebol Brasileiro',  12),
  ('2026-09-02', 'casa_apostas', 'Speed Baccarat',  19),
  ('2026-09-02', 'casa_apostas', 'Roleta',  81)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-09-01', 'casa_apostas',  213),
  ('2026-09-01', 'blaze', 1878)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
