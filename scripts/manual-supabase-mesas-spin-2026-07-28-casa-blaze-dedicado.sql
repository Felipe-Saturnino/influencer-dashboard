-- Mesas Spin — 28/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1 / turnover −1; Blaze GGR, turnover e apostas = OK.
-- Correção confirmada: Blaze Blackjack 2 turnover 198271 → 198733 (fecha o daily 1447934).
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-28', 'casa_apostas',  342694,  12478,  49053, 156),
  ('2026-07-28', 'blaze',        1447934, -15989, 109510, 702)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        16680,   66290,  2804),
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',         -583,   84468,  4601),
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'Roleta',              4225,  104388, 39489),
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      -500,   12568,  1393),
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -10048,   55378,   478),
  ('2026-07-28', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  2703,   19603,   288),
  ('2026-07-28', 'Blaze',           'blaze',        'Blackjack 1',        15775,  226800, 10914),
  ('2026-07-28', 'Blaze',           'blaze',        'Blackjack 2',         3040,  198733,  8248),
  ('2026-07-28', 'Blaze',           'blaze',        'Roleta',            -20523,  607271, 83802),
  ('2026-07-28', 'Blaze',           'blaze',        'Speed Baccarat',     -7106,  233430,  5774),
  ('2026-07-28', 'Blaze',           'blaze',        'Blackjack VIP',      -7175,  181700,   772)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-28', 'casa_apostas', 'Blackjack',          53),
  ('2026-07-28', 'casa_apostas', 'Futebol Brasileiro', 12),
  ('2026-07-28', 'casa_apostas', 'Speed Baccarat',     26),
  ('2026-07-28', 'casa_apostas', 'Roleta',             94),
  ('2026-07-28', 'blaze',        'Blackjack',         197),
  ('2026-07-28', 'blaze',        'Speed Baccarat',    264),
  ('2026-07-28', 'blaze',        'Roleta',            278)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  1410),
  ('2026-07-01', 'blaze',         9575)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
