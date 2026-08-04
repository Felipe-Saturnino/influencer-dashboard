-- Mesas Spin — 03/08/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR −1; Blaze GGR +1 / turnover −1; apostas = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-03', 'casa_apostas',  207762,   2763,  23950, 123),
  ('2026-08-03', 'blaze',        1485018, -22095, 134044, 764)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         11765,   38125,  1586),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',           680,   15170,  1112),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'Roleta',                397,   58812, 18591),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',       2164,   11356,  1265),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    -12833,   53198,   339),
  ('2026-08-03', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    589,   31101,  1057),
  ('2026-08-03', 'Blaze',           'blaze',        'Blackjack 1',         13510,  200123, 11095),
  ('2026-08-03', 'Blaze',           'blaze',        'Blackjack 2',          9878,  133910,  8412),
  ('2026-08-03', 'Blaze',           'blaze',        'Roleta',             -11800,  513666,109143),
  ('2026-08-03', 'Blaze',           'blaze',        'Speed Baccarat',     -39032,  515195,  5109),
  ('2026-08-03', 'Blaze',           'blaze',        'Blackjack VIP',        5350,  122125,   285)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-03', 'casa_apostas', 'Blackjack',          25),
  ('2026-08-03', 'casa_apostas', 'Futebol Brasileiro', 14),
  ('2026-08-03', 'casa_apostas', 'Speed Baccarat',     27),
  ('2026-08-03', 'casa_apostas', 'Roleta',             76),
  ('2026-08-03', 'blaze',        'Blackjack',         253),
  ('2026-08-03', 'blaze',        'Speed Baccarat',    266),
  ('2026-08-03', 'blaze',        'Roleta',            304)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  286),
  ('2026-08-01', 'blaze',        1729)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
