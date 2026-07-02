-- Mesas Spin — 01/07/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: Casa GGR ±1; demais = OK. Esportiva zeros. UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  517417,   4757,  65296, 230),
  ('2026-07-01', 'blaze',        1358466,  84688, 127148, 1008),
  ('2026-07-01', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -803,  56280,  2826),
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'Roleta',            10740, 172681, 50440),
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',         783,  42715,  3509),
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   1188,  41363,  1082),
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     2175,  62539,  6264),
  ('2026-07-01', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',-9325, 141839,  1175),
  ('2026-07-01', 'Blaze',           'blaze',        'Blackjack 1',        5065, 171390,  9695),
  ('2026-07-01', 'Blaze',           'blaze',        'Roleta',              232, 471075,100644),
  ('2026-07-01', 'Blaze',           'blaze',        'Blackjack 2',       16785, 123633,  6458),
  ('2026-07-01', 'Blaze',           'blaze',        'Blackjack VIP',      1463, 132275,   369),
  ('2026-07-01', 'Blaze',           'blaze',        'Speed Baccarat',    61143, 460093,  9982),
  ('2026-07-01', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-07-01', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-07-01', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-07-01', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  'Blackjack',          59),
  ('2026-07-01', 'casa_apostas',  'Futebol Brasileiro', 31),
  ('2026-07-01', 'casa_apostas',  'Speed Baccarat',     49),
  ('2026-07-01', 'casa_apostas',  'Roleta',            123),
  ('2026-07-01', 'blaze',         'Blackjack',         209),
  ('2026-07-01', 'blaze',         'Speed Baccarat',    358),
  ('2026-07-01', 'blaze',         'Roleta',            508),
  ('2026-07-01', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-01', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-01', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-01', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  289),
  ('2026-07-01', 'blaze',        1412),
  ('2026-07-01', 'esportiva_bet',   0)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
