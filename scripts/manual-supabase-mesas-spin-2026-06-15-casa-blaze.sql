-- Mesas Spin — 15/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa e Blaze — GGR/turnover ±1; apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-15', 'casa_apostas', 393977,  3664, 69043, 203),
  ('2026-06-15', 'blaze',       1411111,  4454,115551,1043)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -4885,  92090,  2247),
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',            1926, 147327, 60543),
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       3385,  58755,  3264),
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    700,   1150,    15),
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    3991,  86568,  2552),
  ('2026-06-15', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',-1454,   8086,   422),
  ('2026-06-15', 'Blaze',           'blaze',        'Blackjack 1',       3475, 204188,  9346),
  ('2026-06-15', 'Blaze',           'blaze',        'Roleta',            8694, 350945, 86879),
  ('2026-06-15', 'Blaze',           'blaze',        'Blackjack 2',       1158, 200720,  8841),
  ('2026-06-15', 'Blaze',           'blaze',        'Blackjack VIP',    -2775, 174500,   986),
  ('2026-06-15', 'Blaze',           'blaze',        'Speed Baccarat',  -6097, 480759,  9499)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-15', 'casa_apostas', 'Blackjack',          45),
  ('2026-06-15', 'casa_apostas', 'Futebol Brasileiro', 22),
  ('2026-06-15', 'casa_apostas', 'Speed Baccarat',     46),
  ('2026-06-15', 'casa_apostas', 'Roleta',            121),
  ('2026-06-15', 'blaze',        'Blackjack',         216),
  ('2026-06-15', 'blaze',        'Speed Baccarat',    442),
  ('2026-06-15', 'blaze',        'Roleta',            450)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 1231),
  ('2026-06-01', 'blaze',        6753)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
