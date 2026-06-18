-- Mesas Spin — 17/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa = OK; Blaze turnover por_tabela 951650 vs daily 951649 (Δ −1); GGR/apostas = OK.
-- Esportiva = OK. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).
-- Confirmar slug esportiva_bet em public.operadoras antes de executar.

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-17', 'casa_apostas',  347775,  18161,  67193, 211),
  ('2026-06-17', 'blaze',         951649,  -1049, 120193, 830),
  ('2026-06-17', 'esportiva_bet',     266,     -7,    143,   7)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        6180,  77910,  2837),
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'Roleta',             8938, 150921, 58613),
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2013,  42795,  2962),
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    -558,   5475,   121),
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     1477,  53319,  1880),
  ('2026-06-17', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  111,  17355,   780),
  ('2026-06-17', 'Blaze',           'blaze',        'Blackjack 1',        9230, 166030,  9937),
  ('2026-06-17', 'Blaze',           'blaze',        'Roleta',           -12409, 347549, 94130),
  ('2026-06-17', 'Blaze',           'blaze',        'Blackjack 2',        1853, 114130,  6854),
  ('2026-06-17', 'Blaze',           'blaze',        'Blackjack VIP',     -3775,  22550,   110),
  ('2026-06-17', 'Blaze',           'blaze',        'Speed Baccarat',     4052, 301391,  9162),
  ('2026-06-17', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',         -55,    120,    14),
  ('2026-06-17', 'Esportiva Bet',   'esportiva_bet','Roleta',               34,     90,    77),
  ('2026-06-17', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',  -13,     18,    18),
  ('2026-06-17', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',       27,     38,    34)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-17', 'casa_apostas',  'Blackjack',          37),
  ('2026-06-17', 'casa_apostas',  'Futebol Brasileiro', 30),
  ('2026-06-17', 'casa_apostas',  'Speed Baccarat',     46),
  ('2026-06-17', 'casa_apostas',  'Roleta',            129),
  ('2026-06-17', 'blaze',         'Blackjack',         198),
  ('2026-06-17', 'blaze',         'Speed Baccarat',    325),
  ('2026-06-17', 'blaze',         'Roleta',            370),
  ('2026-06-17', 'esportiva_bet', 'Blackjack',           2),
  ('2026-06-17', 'esportiva_bet', 'Futebol Brasileiro',  1),
  ('2026-06-17', 'esportiva_bet', 'Speed Baccarat',      3),
  ('2026-06-17', 'esportiva_bet', 'Roleta',              3)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1328),
  ('2026-06-01', 'blaze',         7399),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
