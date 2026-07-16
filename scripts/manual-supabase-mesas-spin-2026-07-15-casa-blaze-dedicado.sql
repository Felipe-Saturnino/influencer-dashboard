-- Mesas Spin — 15/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR/turnover ±1; Blaze = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-15', 'casa_apostas',  416608,  18356,  49013, 179),
  ('2026-07-15', 'blaze',        1122297,  66024, 107975, 824)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        4595,  63370,  2635),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',             3135,  84502, 38961),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        1958, 102748,  3773),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    6585,  32943,   636),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      943,  96056,  1850),
  ('2026-07-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 1141,  36990,  1158),
  ('2026-07-15', 'Blaze',           'blaze',        'Blackjack 1',        9255, 173720, 10819),
  ('2026-07-15', 'Blaze',           'blaze',        'Roleta',            43496, 450477, 79949),
  ('2026-07-15', 'Blaze',           'blaze',        'Blackjack 2',       -2075, 144390,  9668),
  ('2026-07-15', 'Blaze',           'blaze',        'Blackjack VIP',      4850,  13300,    48),
  ('2026-07-15', 'Blaze',           'blaze',        'Speed Baccarat',    10498, 340410,  7491)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-15', 'casa_apostas', 'Blackjack',          39),
  ('2026-07-15', 'casa_apostas', 'Futebol Brasileiro', 23),
  ('2026-07-15', 'casa_apostas', 'Speed Baccarat',     42),
  ('2026-07-15', 'casa_apostas', 'Roleta',            110),
  ('2026-07-15', 'blaze',        'Blackjack',         219),
  ('2026-07-15', 'blaze',        'Speed Baccarat',    313),
  ('2026-07-15', 'blaze',        'Roleta',            332)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  1009),
  ('2026-07-01', 'blaze',         6367)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
