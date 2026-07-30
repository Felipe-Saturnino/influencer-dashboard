-- Mesas Spin — 29/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa turnover −1; Blaze turnover −2; GGR e apostas = OK.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-29', 'casa_apostas',  747561, -12964,  29226, 134),
  ('2026-07-29', 'blaze',        1289672,   7600, 149557, 507)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         10498, 146755,  1120),
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        -18920, 220388,  2408),
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'Roleta',              -1320,  64660, 23081),
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',        -61,   7370,  1731),
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     -4715, 296560,   683),
  ('2026-07-29', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   1554,  11829,   203),
  ('2026-07-29', 'Blaze',           'blaze',        'Blackjack 1',         12085, 188213, 11265),
  ('2026-07-29', 'Blaze',           'blaze',        'Blackjack 2',         18443, 172773,  7645),
  ('2026-07-29', 'Blaze',           'blaze',        'Roleta',             -17003, 597811,125507),
  ('2026-07-29', 'Blaze',           'blaze',        'Speed Baccarat',      -4800, 279302,  4909),
  ('2026-07-29', 'Blaze',           'blaze',        'Blackjack VIP',       -1125,  51575,   231)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-29', 'casa_apostas', 'Blackjack',          36),
  ('2026-07-29', 'casa_apostas', 'Futebol Brasileiro', 14),
  ('2026-07-29', 'casa_apostas', 'Speed Baccarat',     24),
  ('2026-07-29', 'casa_apostas', 'Roleta',             84),
  ('2026-07-29', 'blaze',        'Blackjack',         201),
  ('2026-07-29', 'blaze',        'Speed Baccarat',    264),
  ('2026-07-29', 'blaze',        'Roleta',            286)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas', 1428),
  ('2026-07-01', 'blaze',        9743)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
