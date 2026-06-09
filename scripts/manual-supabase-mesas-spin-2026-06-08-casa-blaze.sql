-- Mesas Spin — 08/06/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação: daily Blaze turnover 1143076 (print inicial 1687631 estava errado);
--   soma mesas turnover 1143077 vs daily −1 unidade; demais métricas ±1 ou 0.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-08', 'casa_apostas', 544555, 13850, 71571, 256),
  ('2026-06-08', 'blaze',       1143076, 11861,112222, 814)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        5013,  43890,  1544),
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'Roleta',           6049, 132234, 58568),
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      1105,  48933,  3131),
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -2845,  28200,   311),
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',    645, 206150,  5990),
  ('2026-06-08', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 3884,  85149,  2027),
  ('2026-06-08', 'Blaze',           'blaze',        'Blackjack 1',       785, 125045,  8243),
  ('2026-06-08', 'Blaze',           'blaze',        'Roleta',          -2041, 631753, 89989),
  ('2026-06-08', 'Blaze',           'blaze',        'Blackjack 2',      5310, 104778,  6821),
  ('2026-06-08', 'Blaze',           'blaze',        'Blackjack VIP',   -4800,  22025,    32),
  ('2026-06-08', 'Blaze',           'blaze',        'Speed Baccarat',  12606, 259476,  7137)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-08', 'casa_apostas', 'Blackjack',          53),
  ('2026-06-08', 'casa_apostas', 'Futebol Brasileiro', 55),
  ('2026-06-08', 'casa_apostas', 'Speed Baccarat',     73),
  ('2026-06-08', 'casa_apostas', 'Roleta',            138),
  ('2026-06-08', 'blaze',        'Blackjack',         206),
  ('2026-06-08', 'blaze',        'Speed Baccarat',    316),
  ('2026-06-08', 'blaze',        'Roleta',            342)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas', 863),
  ('2026-06-01', 'blaze',        4171)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
