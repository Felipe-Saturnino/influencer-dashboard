-- Mesas Spin — 13/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR/turnover ±1; Blaze turnover ±1; demais = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-13', 'casa_apostas', 249044, 19434, 53202, 181),
  ('2026-07-13', 'blaze',        897357, 36971, 97020, 742)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        3235,  18020,   960),
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'Roleta',            12695, 158361, 46811),
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2708,  40928,  2452),
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     920,   3235,    65),
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     -493,  15271,  2635),
  ('2026-07-13', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  370,  13230,   279),
  ('2026-07-13', 'Blaze',           'blaze',        'Blackjack 1',        9090, 189440,  9642),
  ('2026-07-13', 'Blaze',           'blaze',        'Roleta',            26158, 289351, 71094),
  ('2026-07-13', 'Blaze',           'blaze',        'Blackjack 2',        1240, 139200,  7324),
  ('2026-07-13', 'Blaze',           'blaze',        'Blackjack VIP',     -2325,  20400,   146),
  ('2026-07-13', 'Blaze',           'blaze',        'Speed Baccarat',     2808, 258967,  8814)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-13', 'casa_apostas', 'Blackjack',          40),
  ('2026-07-13', 'casa_apostas', 'Futebol Brasileiro', 17),
  ('2026-07-13', 'casa_apostas', 'Speed Baccarat',     32),
  ('2026-07-13', 'casa_apostas', 'Roleta',            114),
  ('2026-07-13', 'blaze',        'Blackjack',         193),
  ('2026-07-13', 'blaze',        'Speed Baccarat',    298),
  ('2026-07-13', 'blaze',        'Roleta',            300)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  961),
  ('2026-07-01', 'blaze',        5938)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
