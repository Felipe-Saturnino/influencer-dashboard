-- Mesas Spin — 31/07/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1 / turnover −1; apostas = OK.
-- Correção confirmada: Casa VIP Blackjack 1 GGR/TO invertidos (10530/2408 → 2408/10530).
-- Blaze GGR e apostas = OK; turnover −1.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-31', 'casa_apostas',  124470,  7366,  35413, 142),
  ('2026-07-31', 'blaze',        1555760, 33632, 151578, 728)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',           625,   10115,   919),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',           768,   38328,  2869),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'Roleta',               3631,   58153, 29367),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',       -367,    5618,  2062),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',      2408,   10530,    41),
  ('2026-07-31', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    302,    1727,   155),
  ('2026-07-31', 'Blaze',           'blaze',        'Blackjack 1',          3688,  176240,  8172),
  ('2026-07-31', 'Blaze',           'blaze',        'Blackjack 2',         -4578,  197643,  5343),
  ('2026-07-31', 'Blaze',           'blaze',        'Roleta',              12867,  558088,131726),
  ('2026-07-31', 'Blaze',           'blaze',        'Speed Baccarat',      15330,  313615,  5710),
  ('2026-07-31', 'Blaze',           'blaze',        'Blackjack VIP',        6325,  310175,   627)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-31', 'casa_apostas', 'Blackjack',          32),
  ('2026-07-31', 'casa_apostas', 'Futebol Brasileiro', 18),
  ('2026-07-31', 'casa_apostas', 'Speed Baccarat',     28),
  ('2026-07-31', 'casa_apostas', 'Roleta',             80),
  ('2026-07-31', 'blaze',        'Blackjack',         215),
  ('2026-07-31', 'blaze',        'Speed Baccarat',    278),
  ('2026-07-31', 'blaze',        'Roleta',            293)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  1445),
  ('2026-07-01', 'blaze',        10000)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
