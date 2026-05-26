-- Mesas Spin — 25/05/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação:
--   Casa: GGR/turnover soma mesas +1 vs daily (arredondamento); apostas = OK.
--   Blaze: GGR soma +1 vs daily (arredondamento); turnover e apostas = OK.
-- UAP: soma por jogo pode exceder daily (overlap) — esperado.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-05-25', 'casa_apostas', 434371, 34933, 34240, 260),
  ('2026-05-25', 'blaze',        1161710, 91129, 97573, 767)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        723,   20905,   1084),
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'Roleta',          2296,   64798,  18196),
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',     1943,   44055,   3275),
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', 1253,   10890,    175),
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat', 21426,  218387,   8093),
  ('2026-05-25', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 7293, 75337,   3417),
  ('2026-05-25', 'Blaze',           'blaze',        'Blackjack 1',      878,  215260,  11151),
  ('2026-05-25', 'Blaze',           'blaze',        'Roleta',         22250,  214510,  70620),
  ('2026-05-25', 'Blaze',           'blaze',        'Blackjack 2',    -5485,  189033,   7592),
  ('2026-05-25', 'Blaze',           'blaze',        'Blackjack VIP',  35975,  225500,    700),
  ('2026-05-25', 'Blaze',           'blaze',        'Speed Baccarat', 37512,  317407,   7510)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-05-25', 'casa_apostas', 'Blackjack',          54),
  ('2026-05-25', 'casa_apostas', 'Futebol Brasileiro', 120),
  ('2026-05-25', 'casa_apostas', 'Speed Baccarat',     63),
  ('2026-05-25', 'casa_apostas', 'Roleta',             70),
  ('2026-05-25', 'blaze',        'Blackjack',         203),
  ('2026-05-25', 'blaze',        'Speed Baccarat',    242),
  ('2026-05-25', 'blaze',        'Roleta',            377)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-05-01', 'casa_apostas', 1611),
  ('2026-05-01', 'blaze',        10855)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
