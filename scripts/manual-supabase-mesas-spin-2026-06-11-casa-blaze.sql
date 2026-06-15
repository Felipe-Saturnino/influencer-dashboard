-- Mesas Spin — 11/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Correções: daily Casa turnover 569483; Roleta Casa apostas 67346 (print 67246).
-- Reconciliação: Casa GGR +2, turnover +1; Blaze turnover +1; demais = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-11', 'casa_apostas', 569483, 49889, 77580, 265),
  ('2026-06-11', 'blaze',       1573967,-65014,120533, 821)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        3233,  41638,  2138),
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'Roleta',          22376, 242323, 67346),
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',     10788,  85773,  3403),
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', 10475,  21010,   181),
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -2003, 138651,  3033),
  ('2026-06-11', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 5022,  40089,  1579),
  ('2026-06-11', 'Blaze',           'blaze',        'Blackjack 1',     12268, 143048,  8796),
  ('2026-06-11', 'Blaze',           'blaze',        'Roleta',         -76635, 752915, 95586),
  ('2026-06-11', 'Blaze',           'blaze',        'Blackjack 2',     -1033, 113138,  6442),
  ('2026-06-11', 'Blaze',           'blaze',        'Blackjack VIP',    2313,  12375,    75),
  ('2026-06-11', 'Blaze',           'blaze',        'Speed Baccarat',  -1927, 552492,  9634)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-11', 'casa_apostas', 'Blackjack',          48),
  ('2026-06-11', 'casa_apostas', 'Futebol Brasileiro', 45),
  ('2026-06-11', 'casa_apostas', 'Speed Baccarat',     67),
  ('2026-06-11', 'casa_apostas', 'Roleta',            154),
  ('2026-06-11', 'blaze',        'Blackjack',         210),
  ('2026-06-11', 'blaze',        'Speed Baccarat',    312),
  ('2026-06-11', 'blaze',        'Roleta',            354)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 1078),
  ('2026-06-01', 'blaze',        5176)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
