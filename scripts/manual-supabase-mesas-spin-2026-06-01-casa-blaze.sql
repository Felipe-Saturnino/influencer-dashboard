-- Mesas Spin — 01/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: Casa turnover +1; Blaze GGR +1 — arredondamento; apostas = OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 235368,  6388, 41332, 226),
  ('2026-06-01', 'blaze',        979083, 52145,122683, 761)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -205,  29298,   907),
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'Roleta',           3584,  48725, 29448),
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      3010,  22960,  1949),
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   348,   6865,   153),
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -297,  63378,  6217),
  ('2026-06-01', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  -52,  64143,  2658),
  ('2026-06-01', 'Blaze',           'blaze',        'Blackjack 1',      -505, 231245,  8133),
  ('2026-06-01', 'Blaze',           'blaze',        'Roleta',          26296, 344632, 99167),
  ('2026-06-01', 'Blaze',           'blaze',        'Blackjack 2',      9073, 144635,  5991),
  ('2026-06-01', 'Blaze',           'blaze',        'Blackjack VIP',    5275,  80675,   274),
  ('2026-06-01', 'Blaze',           'blaze',        'Speed Baccarat',  12007, 177896,  9118)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 'Blackjack',          41),
  ('2026-06-01', 'casa_apostas', 'Futebol Brasileiro', 66),
  ('2026-06-01', 'casa_apostas', 'Speed Baccarat',     70),
  ('2026-06-01', 'casa_apostas', 'Roleta',             88),
  ('2026-06-01', 'blaze',        'Blackjack',         196),
  ('2026-06-01', 'blaze',        'Speed Baccarat',    285),
  ('2026-06-01', 'blaze',        'Roleta',            330)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 293),
  ('2026-06-01', 'blaze',        1088)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
