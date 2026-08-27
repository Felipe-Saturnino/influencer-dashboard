-- Mesas Spin — 2026-08-26 a 2026-08-26: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-26', 'blaze',  1035329,  41344, 152897, 819),
  ('2026-08-26', 'casa_apostas',   554967,  -1181,  23473, 125)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-26', 'Blaze', 'blaze', 'Blackjack 1',   6250,   228320,  11471),
  ('2026-08-26', 'Blaze', 'blaze', 'Blackjack 2',   1345,   188325,   9527),
  ('2026-08-26', 'Blaze', 'blaze', 'Roleta',   9901,   233584, 122163),
  ('2026-08-26', 'Blaze', 'blaze', 'Speed Baccarat',  16073,   358150,   9561),
  ('2026-08-26', 'Blaze', 'blaze', 'Blackjack VIP',   7775,    26950,    175),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    715,    19818,    443),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    778,    23078,   1595),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Roleta', -27306,   134258,  19927),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  43774,   206013,   1141),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -19115,   171240,    314),
  ('2026-08-26', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    -27,      560,     53)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-26', 'blaze', 'Blackjack', 232),
  ('2026-08-26', 'blaze', 'Speed Baccarat', 340),
  ('2026-08-26', 'blaze', 'Roleta', 310),
  ('2026-08-26', 'casa_apostas', 'Blackjack',  36),
  ('2026-08-26', 'casa_apostas', 'Futebol Brasileiro',   9),
  ('2026-08-26', 'casa_apostas', 'Speed Baccarat',  22),
  ('2026-08-26', 'casa_apostas', 'Roleta',  79)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 1026),
  ('2026-08-01', 'blaze', 7606)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
