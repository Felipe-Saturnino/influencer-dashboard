-- Mesas Spin — 27/05/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa e Blaze — GGR/turnover ±1 (arredondamento); apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-05-27', 'casa_apostas', 305703, 7817, 39281, 266),
  ('2026-05-27', 'blaze',        1074702, -14166, 83903, 844)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        1120,  26960,   1499),
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'Roleta',            954,  37915,  24667),
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      3068,  50350,   3549),
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   670,   2935,     64),
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    200,  97169,   3845),
  ('2026-05-27', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 1806, 90375,   5657),
  ('2026-05-27', 'Blaze',           'blaze',        'Blackjack 1',       108, 190473,   9600),
  ('2026-05-27', 'Blaze',           'blaze',        'Roleta',         -31956, 241006,  57142),
  ('2026-05-27', 'Blaze',           'blaze',        'Blackjack 2',     -4800, 166098,   8625),
  ('2026-05-27', 'Blaze',           'blaze',        'Blackjack VIP',     525, 102925,    563),
  ('2026-05-27', 'Blaze',           'blaze',        'Speed Baccarat',  21957, 374201,   7973)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-05-27', 'casa_apostas', 'Blackjack',          57),
  ('2026-05-27', 'casa_apostas', 'Futebol Brasileiro', 157),
  ('2026-05-27', 'casa_apostas', 'Speed Baccarat',     57),
  ('2026-05-27', 'casa_apostas', 'Roleta',             75),
  ('2026-05-27', 'blaze',        'Blackjack',         218),
  ('2026-05-27', 'blaze',        'Speed Baccarat',    299),
  ('2026-05-27', 'blaze',        'Roleta',            378)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-05-01', 'casa_apostas', 1756),
  ('2026-05-01', 'blaze',        11465)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
