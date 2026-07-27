-- Mesas Spin — 26/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR ±1; demais = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-26', 'casa_apostas',  597840,  -3282,  36067, 153),
  ('2026-07-26', 'blaze',        1736310,  64508, 124453, 623)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         4390,  21460,  1483),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',          763, 126328,  1672),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'Roleta',              4888, 195350, 31329),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      3369,  85083,  1073),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -17213, 164945,   143),
  ('2026-07-26', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   522,   4674,   367),
  ('2026-07-26', 'Blaze',           'blaze',        'Blackjack 1',         -933, 186712,  9396),
  ('2026-07-26', 'Blaze',           'blaze',        'Blackjack 2',         6400, 110685,  6659),
  ('2026-07-26', 'Blaze',           'blaze',        'Roleta',             26311, 603841,100226),
  ('2026-07-26', 'Blaze',           'blaze',        'Speed Baccarat',     28917, 711172,  7590),
  ('2026-07-26', 'Blaze',           'blaze',        'Blackjack VIP',       3813, 123900,   582)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-26', 'casa_apostas', 'Blackjack',          28),
  ('2026-07-26', 'casa_apostas', 'Futebol Brasileiro',  9),
  ('2026-07-26', 'casa_apostas', 'Speed Baccarat',     43),
  ('2026-07-26', 'casa_apostas', 'Roleta',             90),
  ('2026-07-26', 'blaze',        'Blackjack',         196),
  ('2026-07-26', 'blaze',        'Speed Baccarat',    235),
  ('2026-07-26', 'blaze',        'Roleta',            246)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  1369),
  ('2026-07-01', 'blaze',         9234)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
