-- Mesas Spin — 16/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa GGR por_tabela 50591 vs daily 50589 (Δ +2); turnover ±1; apostas = OK.
-- Blaze GGR ±1; Esportiva = OK. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).
-- Confirmar slug esportiva_bet em public.operadoras antes de executar.

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-16', 'casa_apostas',  364500,  50589,  93181, 232),
  ('2026-06-16', 'blaze',        1914631, 627806, 106483, 904),
  ('2026-06-16', 'esportiva_bet',      33,     -3,     33,   2)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        4848,  60078,  2000),
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'Roleta',              975, 130339, 83580),
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',          28,  64565,  3261),
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    2548,  19345,   291),
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',      502,  31908,  2451),
  ('2026-06-16', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',41690,  58266,  1598),
  ('2026-06-16', 'Blaze',           'blaze',        'Blackjack 1',        5098, 187230,  8506),
  ('2026-06-16', 'Blaze',           'blaze',        'Roleta',            11577, 338113, 82644),
  ('2026-06-16', 'Blaze',           'blaze',        'Blackjack 2',        6620, 129850,  6694),
  ('2026-06-16', 'Blaze',           'blaze',        'Blackjack VIP',     -3088,  37375,   134),
  ('2026-06-16', 'Blaze',           'blaze',        'Speed Baccarat',   607600,1222063,  8505),
  ('2026-06-16', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-16', 'Esportiva Bet',   'esportiva_bet','Roleta',               -3,     33,    33),
  ('2026-06-16', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-16', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-16', 'casa_apostas',  'Blackjack',          52),
  ('2026-06-16', 'casa_apostas',  'Futebol Brasileiro', 37),
  ('2026-06-16', 'casa_apostas',  'Speed Baccarat',     54),
  ('2026-06-16', 'casa_apostas',  'Roleta',            120),
  ('2026-06-16', 'blaze',         'Blackjack',         217),
  ('2026-06-16', 'blaze',         'Speed Baccarat',    350),
  ('2026-06-16', 'blaze',         'Roleta',            396),
  ('2026-06-16', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-16', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-16', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-16', 'esportiva_bet', 'Roleta',              2)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1278),
  ('2026-06-01', 'blaze',         7068),
  ('2026-06-01', 'esportiva_bet',    2)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
