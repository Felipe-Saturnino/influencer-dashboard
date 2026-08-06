-- Mesas Spin — 05/08/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1 / turnover −1; Blaze GGR +1; apostas = OK.
-- Correção confirmada: Blaze Blackjack 1 turnover 254003 → 251003 (fecha daily 2743409).
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-05', 'casa_apostas',  296157, -14385,  39843, 162),
  ('2026-08-05', 'blaze',        2743409, 255325, 130546, 835)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',          1423,   34023,  1733),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        -19855,   60160,  2429),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'Roleta',              -4651,   95068, 32459),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',       7164,   24770,  1749),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     -1153,   37325,   585),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   2688,   44812,   888),
  ('2026-08-05', 'Blaze',           'blaze',        'Blackjack 1',          6785,  251003, 11533),
  ('2026-08-05', 'Blaze',           'blaze',        'Blackjack 2',         10823,  199868, 10817),
  ('2026-08-05', 'Blaze',           'blaze',        'Roleta',             132889, 1021349, 98677),
  ('2026-08-05', 'Blaze',           'blaze',        'Speed Baccarat',      82916, 1170665,  9017),
  ('2026-08-05', 'Blaze',           'blaze',        'Blackjack VIP',       21913,  100525,   502)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-05', 'casa_apostas', 'Blackjack',          30),
  ('2026-08-05', 'casa_apostas', 'Futebol Brasileiro', 25),
  ('2026-08-05', 'casa_apostas', 'Speed Baccarat',     38),
  ('2026-08-05', 'casa_apostas', 'Roleta',             94),
  ('2026-08-05', 'blaze',        'Blackjack',         257),
  ('2026-08-05', 'blaze',        'Speed Baccarat',    322),
  ('2026-08-05', 'blaze',        'Roleta',            326)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  396),
  ('2026-08-01', 'blaze',        2413)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
