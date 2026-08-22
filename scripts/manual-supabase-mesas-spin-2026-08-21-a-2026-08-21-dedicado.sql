-- Mesas Spin — 2026-08-21 a 2026-08-21: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-21', 'blaze',  1283081,  43666, 143956, 896),
  ('2026-08-21', 'casa_apostas',   402329, -26226,  36249, 138)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-21', 'Blaze', 'blaze', 'Blackjack 1',  12413,   304120,  12127),
  ('2026-08-21', 'Blaze', 'blaze', 'Blackjack 2',   3720,   169695,   8859),
  ('2026-08-21', 'Blaze', 'blaze', 'Roleta',  13310,   296010, 111210),
  ('2026-08-21', 'Blaze', 'blaze', 'Speed Baccarat',  -4177,   162306,   9899),
  ('2026-08-21', 'Blaze', 'blaze', 'Blackjack VIP',  18400,   350950,   1861),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   6088,    47273,   3005),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2', -11270,    89518,   8199),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Roleta', -19565,   148047,  22753),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -3422,    98690,   1757),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',      0,        0,      0),
  ('2026-08-21', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   1943,    18801,    535)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-21', 'blaze', 'Blackjack', 253),
  ('2026-08-21', 'blaze', 'Speed Baccarat', 360),
  ('2026-08-21', 'blaze', 'Roleta', 356),
  ('2026-08-21', 'casa_apostas', 'Blackjack',  53),
  ('2026-08-21', 'casa_apostas', 'Futebol Brasileiro',  17),
  ('2026-08-21', 'casa_apostas', 'Speed Baccarat',  26),
  ('2026-08-21', 'casa_apostas', 'Roleta',  67)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  921),
  ('2026-08-01', 'blaze', 6535)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
