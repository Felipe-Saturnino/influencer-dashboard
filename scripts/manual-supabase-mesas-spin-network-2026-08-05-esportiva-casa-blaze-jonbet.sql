-- Mesas Spin — 05/08/2026: Network — Esportiva + Casa + Blaze + Jon Bet (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva TO −1; Casa = OK; Jon Bet GGR +1; demais = OK.
-- Blaze: daily GGR alinhado à soma das mesas (4238; print daily 4869 divergia —
--         confirmação do usuário 05/08). TO/apostas/UAP do print.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-05', 'esportiva_bet', 1600867, 55597, 113031, 287),
  ('2026-08-05', 'casa_apostas',     7243, -1726,   2575,  10),
  ('2026-08-05', 'blaze',           50384,  4238,   5161,  93),
  ('2026-08-05', 'jonbet',          46146,    21,   2055,  32)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-05', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',           2175,   12483,    478),
  ('2026-08-05', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',    5855,  373096,  10765),
  ('2026-08-05', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',        -922,    7143,    873),
  ('2026-08-05', 'Esportiva Bet',   'esportiva_bet', 'Roleta',               48489, 1208146, 100915),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',           -435,    3115,    220),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',      -5,      45,      6),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',       -1182,    1650,     21),
  ('2026-08-05', 'Casa de Apostas', 'casa_apostas',  'Roleta',                -104,    2433,   2328),
  ('2026-08-05', 'Blaze',           'blaze',         'Blackjack 1',           1255,   36053,   2384),
  ('2026-08-05', 'Blaze',           'blaze',         'Futebol Brasileiro',     130,     476,    368),
  ('2026-08-05', 'Blaze',           'blaze',         'Speed Baccarat',        2900,   11867,    735),
  ('2026-08-05', 'Blaze',           'blaze',         'Roleta',                 -47,    1988,   1674),
  ('2026-08-05', 'Jon Bet',         'jonbet',        'Blackjack 1',           -415,   41530,   1935),
  ('2026-08-05', 'Jon Bet',         'jonbet',        'Futebol Brasileiro',       6,       6,      5),
  ('2026-08-05', 'Jon Bet',         'jonbet',        'Speed Baccarat',        -215,    3514,     96),
  ('2026-08-05', 'Jon Bet',         'jonbet',        'Roleta',                 646,    1096,     19)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-05', 'esportiva_bet', 'Blackjack',         22),
  ('2026-08-05', 'esportiva_bet', 'Futebol Brasileiro',132),
  ('2026-08-05', 'esportiva_bet', 'Speed Baccarat',    34),
  ('2026-08-05', 'esportiva_bet', 'Roleta',           153),
  ('2026-08-05', 'casa_apostas',  'Blackjack',          4),
  ('2026-08-05', 'casa_apostas',  'Futebol Brasileiro', 1),
  ('2026-08-05', 'casa_apostas',  'Speed Baccarat',     2),
  ('2026-08-05', 'casa_apostas',  'Roleta',             3),
  ('2026-08-05', 'blaze',         'Blackjack',         35),
  ('2026-08-05', 'blaze',         'Futebol Brasileiro',12),
  ('2026-08-05', 'blaze',         'Speed Baccarat',    39),
  ('2026-08-05', 'blaze',         'Roleta',            20),
  ('2026-08-05', 'jonbet',        'Blackjack',         23),
  ('2026-08-05', 'jonbet',        'Futebol Brasileiro', 3),
  ('2026-08-05', 'jonbet',        'Speed Baccarat',     6),
  ('2026-08-05', 'jonbet',        'Roleta',             3)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'esportiva_bet', 1644),
  ('2026-08-01', 'casa_apostas',    46),
  ('2026-08-01', 'blaze',          175),
  ('2026-08-01', 'jonbet',          32)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
