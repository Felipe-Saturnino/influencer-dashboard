-- Mesas Spin — 10/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa turnover +1; Blaze GGR +1; turnover/apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-10', 'casa_apostas', 733102, 23109, 94849, 320),
  ('2026-06-10', 'blaze',       1853371, 10917,144368, 888)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        6785,  80970,  3126),
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'Roleta',           6328, 201920, 79716),
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      6058,  59995,  3783),
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -558,  51140,   765),
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat', -12839, 228157,  4637),
  ('2026-06-10', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',17335, 110921,  2822),
  ('2026-06-10', 'Blaze',           'blaze',        'Blackjack 1',      4933, 187990, 11517),
  ('2026-06-10', 'Blaze',           'blaze',        'Roleta',          1564,1139807,116386),
  ('2026-06-10', 'Blaze',           'blaze',        'Blackjack 2',      6308, 126213,  6325),
  ('2026-06-10', 'Blaze',           'blaze',        'Blackjack VIP',   -2125,   5350,    42),
  ('2026-06-10', 'Blaze',           'blaze',        'Speed Baccarat',    238, 394011, 10098)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-10', 'casa_apostas', 'Blackjack',          71),
  ('2026-06-10', 'casa_apostas', 'Futebol Brasileiro', 71),
  ('2026-06-10', 'casa_apostas', 'Speed Baccarat',     80),
  ('2026-06-10', 'casa_apostas', 'Roleta',            161),
  ('2026-06-10', 'blaze',        'Blackjack',         233),
  ('2026-06-10', 'blaze',        'Speed Baccarat',    363),
  ('2026-06-10', 'blaze',        'Roleta',            360)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 1033),
  ('2026-06-01', 'blaze',        4904)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
