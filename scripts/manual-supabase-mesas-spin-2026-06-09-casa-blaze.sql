-- Mesas Spin — 09/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa GGR +1; Blaze GGR/turnover ±1; apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-09', 'casa_apostas', 667120, 32260,101240, 299),
  ('2026-06-09', 'blaze',       1198203,-21434,114349, 734)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        8558,  87220,  3053),
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'Roleta',          -5088, 258741, 85874),
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      2718,  87138,  3539),
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  2270,  15275,   310),
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   1996, 106324,  5463),
  ('2026-06-09', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',21807, 112422,  3001),
  ('2026-06-09', 'Blaze',           'blaze',        'Blackjack 1',      5993, 161698,  8538),
  ('2026-06-09', 'Blaze',           'blaze',        'Roleta',         -16967, 542293, 92152),
  ('2026-06-09', 'Blaze',           'blaze',        'Blackjack 2',      3340,  91148,  4803),
  ('2026-06-09', 'Blaze',           'blaze',        'Blackjack VIP',     250,   1100,     6),
  ('2026-06-09', 'Blaze',           'blaze',        'Speed Baccarat', -14049, 401965,  8850)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-09', 'casa_apostas', 'Blackjack',          71),
  ('2026-06-09', 'casa_apostas', 'Futebol Brasileiro', 76),
  ('2026-06-09', 'casa_apostas', 'Speed Baccarat',     67),
  ('2026-06-09', 'casa_apostas', 'Roleta',            145),
  ('2026-06-09', 'blaze',        'Blackjack',         181),
  ('2026-06-09', 'blaze',        'Speed Baccarat',    262),
  ('2026-06-09', 'blaze',        'Roleta',            348)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 934),
  ('2026-06-01', 'blaze',        4490)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
