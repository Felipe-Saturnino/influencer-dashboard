-- Mesas Spin — 04/08/2026: Casa de Apostas + Blaze — canal Dedicado (UPSERT).
--
-- Reconciliação: Casa GGR +1; turnover e apostas = OK.
-- Blaze: daily GGR/TO/apostas alinhados à soma das mesas (print daily divergia;
--         confirmação do usuário 04/08). UAP mantido do daily (684).
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-04', 'casa_apostas',  341443,  7253,  41439, 130),
  ('2026-08-04', 'blaze',        2416875, 54906, 113032, 684)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',         -8753,  100245,  1377),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',          8348,   28290,  1393),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'Roleta',              -1200,  115582, 35289),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',        -57,   18373,  1730),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',      4990,   20150,   206),
  ('2026-08-04', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   3926,   58803,  1444),
  ('2026-08-04', 'Blaze',           'blaze',        'Blackjack 1',         10060,  171575,  9733),
  ('2026-08-04', 'Blaze',           'blaze',        'Blackjack 2',         15305,  148763,  8799),
  ('2026-08-04', 'Blaze',           'blaze',        'Roleta',             -15654,  536305, 87027),
  ('2026-08-04', 'Blaze',           'blaze',        'Speed Baccarat',      43282, 1493057,  7270),
  ('2026-08-04', 'Blaze',           'blaze',        'Blackjack VIP',        1913,   67175,   203)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-04', 'casa_apostas', 'Blackjack',          31),
  ('2026-08-04', 'casa_apostas', 'Futebol Brasileiro', 17),
  ('2026-08-04', 'casa_apostas', 'Speed Baccarat',     28),
  ('2026-08-04', 'casa_apostas', 'Roleta',             78),
  ('2026-08-04', 'blaze',        'Blackjack',         215),
  ('2026-08-04', 'blaze',        'Speed Baccarat',    254),
  ('2026-08-04', 'blaze',        'Roleta',            264)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas',  308),
  ('2026-08-01', 'blaze',        1908)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
