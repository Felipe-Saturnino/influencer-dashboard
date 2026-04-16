-- Mesas Spin — 15/04/2026: Casa de Apostas + Blaze (UPSERT).
-- Correr no SQL Editor do Supabase (service_role / postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-04-15', 'casa_apostas', 195028, 1820, 30577, 221),
  ('2026-04-15', 'blaze',      1254759, 209590, 124032, 879)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-04-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',     -3498,  69090,  2730),
  ('2026-04-15', 'Casa de Apostas', 'casa_apostas', 'Roleta',            -737,  70173, 22324),
  ('2026-04-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       1355,  13445,   833),
  ('2026-04-15', 'Casa de Apostas', 'casa_apostas', 'Blackjack VIP',      -10,   3090,    29),
  ('2026-04-15', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    4709,  39231,  4661),
  ('2026-04-15', 'Blaze',           'blaze',        'Blackjack 1',      2448,  42100,  2828),
  ('2026-04-15', 'Blaze',           'blaze',        'Roleta',          179743, 744010, 108796),
  ('2026-04-15', 'Blaze',           'blaze',        'Blackjack 2',      26350, 263750,  7921),
  ('2026-04-15', 'Blaze',           'blaze',        'Blackjack VIP',   -2000,  53500,    99),
  ('2026-04-15', 'Blaze',           'blaze',        'Speed Baccarat',   3050, 151399,  4388)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-04-15', 'casa_apostas', 'Blackjack',       62),
  ('2026-04-15', 'casa_apostas', 'Speed Baccarat',  85),
  ('2026-04-15', 'casa_apostas', 'Roleta',          95),
  ('2026-04-15', 'blaze',        'Blackjack',      205),
  ('2026-04-15', 'blaze',        'Speed Baccarat', 257),
  ('2026-04-15', 'blaze',        'Roleta',         493)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
