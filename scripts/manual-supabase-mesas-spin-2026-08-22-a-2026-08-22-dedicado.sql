-- Mesas Spin — 2026-08-22 a 2026-08-22: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-22', 'blaze',   939737,  34799, 125388, 813),
  ('2026-08-22', 'casa_apostas',   369436,  43921,  47431, 144)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-22', 'Blaze', 'blaze', 'Blackjack 1',  15420,   273715,  11650),
  ('2026-08-22', 'Blaze', 'blaze', 'Blackjack 2', -11022,   187918,   7236),
  ('2026-08-22', 'Blaze', 'blaze', 'Roleta',  15117,   270224,  98593),
  ('2026-08-22', 'Blaze', 'blaze', 'Speed Baccarat',   6571,   158905,   7525),
  ('2026-08-22', 'Blaze', 'blaze', 'Blackjack VIP',   8713,    48975,    384),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   3728,    19650,    855),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',  11345,    86633,   4362),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Roleta',  17921,   128268,  40369),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1786,    61163,   1105),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   9578,    61420,    485),
  ('2026-08-22', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   3135,    12302,    255)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-22', 'blaze', 'Blackjack', 238),
  ('2026-08-22', 'blaze', 'Speed Baccarat', 305),
  ('2026-08-22', 'blaze', 'Roleta', 330),
  ('2026-08-22', 'casa_apostas', 'Blackjack',  43),
  ('2026-08-22', 'casa_apostas', 'Futebol Brasileiro',  14),
  ('2026-08-22', 'casa_apostas', 'Speed Baccarat',  19),
  ('2026-08-22', 'casa_apostas', 'Roleta',  85)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  942),
  ('2026-08-01', 'blaze', 6766)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
