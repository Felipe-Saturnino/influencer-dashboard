-- Mesas Spin — 08–09/07/2026: Casa de Apostas + Blaze + Esportiva Bet (UPSERT).
--
-- Reconciliação: GGR/turnover ±1 em alguns dias; apostas = OK. Esportiva zeros.
-- UAP por jogo ≠ daily (esperado).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

-- ── 08/07/2026 ───────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-08', 'casa_apostas',  408070,   1323,  44380, 223),
  ('2026-07-08', 'blaze',        1133796,  -8428, 137520, 958),
  ('2026-07-08', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -225,  88983,  4011),
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'Roleta',             -499,  98818, 27807),
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        2758, 139323,  8354),
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   -3910,  29545,   485),
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     1245,  26891,  2557),
  ('2026-07-08', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 1955,  24511,  1166),
  ('2026-07-08', 'Blaze',           'blaze',        'Blackjack 1',         885, 222975, 11733),
  ('2026-07-08', 'Blaze',           'blaze',        'Roleta',           -12127, 362072,106359),
  ('2026-07-08', 'Blaze',           'blaze',        'Blackjack 2',        2543, 151673,  9486),
  ('2026-07-08', 'Blaze',           'blaze',        'Blackjack VIP',      3650,  23500,   108),
  ('2026-07-08', 'Blaze',           'blaze',        'Speed Baccarat',    -3379, 373577,  9834),
  ('2026-07-08', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-07-08', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-07-08', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-07-08', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-08', 'casa_apostas',  'Blackjack',          63),
  ('2026-07-08', 'casa_apostas',  'Futebol Brasileiro', 25),
  ('2026-07-08', 'casa_apostas',  'Speed Baccarat',     53),
  ('2026-07-08', 'casa_apostas',  'Roleta',            121),
  ('2026-07-08', 'blaze',         'Blackjack',         238),
  ('2026-07-08', 'blaze',         'Speed Baccarat',    297),
  ('2026-07-08', 'blaze',         'Roleta',            485),
  ('2026-07-08', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-08', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-08', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-08', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── 09/07/2026 ───────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-07-09', 'casa_apostas',  283253,  13771,  35510, 196),
  ('2026-07-09', 'blaze',        1140399,  36780, 133773, 909),
  ('2026-07-09', 'esportiva_bet',      0,      0,      0,   0)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        -873,  31303,  1373),
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'Roleta',            -1055, 111609, 27332),
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',        3478,  44455,  3742),
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   9015,  23770,   467),
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',     2289,  49071,  2251),
  ('2026-07-09', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  917,  23046,   345),
  ('2026-07-09', 'Blaze',           'blaze',        'Blackjack 1',       10155, 266108, 12832),
  ('2026-07-09', 'Blaze',           'blaze',        'Roleta',             3784, 349959,101577),
  ('2026-07-09', 'Blaze',           'blaze',        'Blackjack 2',         983, 220343,  8713),
  ('2026-07-09', 'Blaze',           'blaze',        'Blackjack VIP',      7700,  17900,   119),
  ('2026-07-09', 'Blaze',           'blaze',        'Speed Baccarat',    14159, 286090, 10532),
  ('2026-07-09', 'Esportiva Bet',   'esportiva_bet','Blackjack 1',           0,      0,     0),
  ('2026-07-09', 'Esportiva Bet',   'esportiva_bet','Roleta',                0,      0,     0),
  ('2026-07-09', 'Esportiva Bet',   'esportiva_bet','Futebol Brasileiro',    0,      0,     0),
  ('2026-07-09', 'Esportiva Bet',   'esportiva_bet','Speed Baccarat',        0,      0,     0)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-07-09', 'casa_apostas',  'Blackjack',          60),
  ('2026-07-09', 'casa_apostas',  'Futebol Brasileiro', 20),
  ('2026-07-09', 'casa_apostas',  'Speed Baccarat',     42),
  ('2026-07-09', 'casa_apostas',  'Roleta',            106),
  ('2026-07-09', 'blaze',         'Blackjack',         216),
  ('2026-07-09', 'blaze',         'Speed Baccarat',    318),
  ('2026-07-09', 'blaze',         'Roleta',            424),
  ('2026-07-09', 'esportiva_bet', 'Blackjack',           0),
  ('2026-07-09', 'esportiva_bet', 'Futebol Brasileiro',  0),
  ('2026-07-09', 'esportiva_bet', 'Speed Baccarat',      0),
  ('2026-07-09', 'esportiva_bet', 'Roleta',              0)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Monthly (Jul/2026) ───────────────────────────────────────────────────────

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-07-01', 'casa_apostas',  796),
  ('2026-07-01', 'blaze',        4879),
  ('2026-07-01', 'esportiva_bet',   0)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
