-- Mesas Spin — 18/06/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa = OK; Blaze GGR por_tabela 34796 vs daily 34795 (Δ +1); turnover/apostas = OK.
-- Esportiva = OK (zeros). UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-06-18', 'casa_apostas',  395348,  11085,  54911, 195),
  ('2026-06-18', 'blaze',        1139531,  34795, 138744, 817),
  ('2026-06-18', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        1160,  75355,  2647),
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'Roleta',             1803, 109298, 44533),
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2610,  61070,  4360),
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',    1055,   5430,   156),
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     2089, 137318,  2814),
  ('2026-06-18', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 2368,   6877,   401),
  ('2026-06-18', 'Blaze',           'blaze',        'Blackjack 1',       12780, 143470,  8751),
  ('2026-06-18', 'Blaze',           'blaze',        'Roleta',             8987, 399949,111929),
  ('2026-06-18', 'Blaze',           'blaze',        'Blackjack 2',          18,  82863,  6301),
  ('2026-06-18', 'Blaze',           'blaze',        'Blackjack VIP',      7863, 172875,   743),
  ('2026-06-18', 'Blaze',           'blaze',        'Speed Baccarat',     5148, 340374, 11020),
  ('2026-06-18', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-06-18', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-06-18', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-06-18', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-06-18', 'casa_apostas',  'Blackjack',          39),
  ('2026-06-18', 'casa_apostas',  'Futebol Brasileiro', 23),
  ('2026-06-18', 'casa_apostas',  'Speed Baccarat',     48),
  ('2026-06-18', 'casa_apostas',  'Roleta',            106),
  ('2026-06-18', 'blaze',         'Blackjack',         203),
  ('2026-06-18', 'blaze',         'Speed Baccarat',    302),
  ('2026-06-18', 'blaze',         'Roleta',            375),
  ('2026-06-18', 'esportiva_bet', 'Blackjack',           0),
  ('2026-06-18', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-06-18', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-06-18', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-06-01', 'casa_apostas',  1357),
  ('2026-06-01', 'blaze',         7655),
  ('2026-06-01', 'esportiva_bet',    9)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
