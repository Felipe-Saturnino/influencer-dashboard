-- Mesas Spin — 2026-08-28 a 2026-08-30: Estúdio Dedicado (blaze, casa_apostas) — UPSERT via Superset.
-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.
-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-28', 'blaze',  2089375,  13934, 131276, 882),
  ('2026-08-28', 'casa_apostas',   376128,  22363,  25093, 109),
  ('2026-08-29', 'blaze',  2216805, 171960, 155777, 852),
  ('2026-08-29', 'casa_apostas',   280659,  -6066,  33160, 181),
  ('2026-08-30', 'blaze',  1046359,  52467, 142958, 735),
  ('2026-08-30', 'casa_apostas',   154838,  -2475,  31410, 107)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-28', 'Blaze', 'blaze', 'Blackjack 1',   7885,   263103,  11203),
  ('2026-08-28', 'Blaze', 'blaze', 'Blackjack 2',   6190,   225560,   9619),
  ('2026-08-28', 'Blaze', 'blaze', 'Roleta',   6454,   804535, 100035),
  ('2026-08-28', 'Blaze', 'blaze', 'Speed Baccarat',  19630,   255802,   9941),
  ('2026-08-28', 'Blaze', 'blaze', 'Blackjack VIP', -26225,   540375,    478),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    583,     3410,    130),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    318,     6458,    839),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Roleta',  17845,    73431,  22544),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  19679,   212188,   1145),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -9950,     7950,     15),
  ('2026-08-28', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',  -6112,    72691,    420),
  ('2026-08-29', 'Blaze', 'blaze', 'Blackjack 1',  32253,   283610,  11245),
  ('2026-08-29', 'Blaze', 'blaze', 'Blackjack 2',   4045,   345940,   8474),
  ('2026-08-29', 'Blaze', 'blaze', 'Roleta',  28113,   685061, 123530),
  ('2026-08-29', 'Blaze', 'blaze', 'Speed Baccarat', 109099,   632569,  11326),
  ('2026-08-29', 'Blaze', 'blaze', 'Blackjack VIP',  -1550,   269625,   1202),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',   1035,    11920,    697),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',   -257,    18708,   1765),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Roleta',   2182,    87013,  28605),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -1695,    47988,    616),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',  -8470,    78180,     70),
  ('2026-08-29', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',   1139,    36850,   1407),
  ('2026-08-30', 'Blaze', 'blaze', 'Blackjack 1',   4860,   132085,   8286),
  ('2026-08-30', 'Blaze', 'blaze', 'Blackjack 2',   3930,    92125,   6217),
  ('2026-08-30', 'Blaze', 'blaze', 'Roleta',  31031,   282618, 117979),
  ('2026-08-30', 'Blaze', 'blaze', 'Speed Baccarat',  16796,   402381,  10395),
  ('2026-08-30', 'Blaze', 'blaze', 'Blackjack VIP',  -4150,   137150,     81),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',    -37,    21160,   1497),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',    -65,    14928,   1356),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Roleta',   2376,    41500,  27129),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -6904,    69233,   1267),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   1950,     3650,     25),
  ('2026-08-30', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro',    205,     4367,    136)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-28', 'blaze', 'Blackjack', 261),
  ('2026-08-28', 'blaze', 'Speed Baccarat', 368),
  ('2026-08-28', 'blaze', 'Roleta', 328),
  ('2026-08-28', 'casa_apostas', 'Blackjack',  28),
  ('2026-08-28', 'casa_apostas', 'Futebol Brasileiro',   8),
  ('2026-08-28', 'casa_apostas', 'Speed Baccarat',  14),
  ('2026-08-28', 'casa_apostas', 'Roleta',  67),
  ('2026-08-29', 'blaze', 'Blackjack', 251),
  ('2026-08-29', 'blaze', 'Speed Baccarat', 354),
  ('2026-08-29', 'blaze', 'Roleta', 316),
  ('2026-08-29', 'casa_apostas', 'Blackjack',  36),
  ('2026-08-29', 'casa_apostas', 'Futebol Brasileiro',  61),
  ('2026-08-29', 'casa_apostas', 'Speed Baccarat',  21),
  ('2026-08-29', 'casa_apostas', 'Roleta',  86),
  ('2026-08-30', 'blaze', 'Blackjack', 230),
  ('2026-08-30', 'blaze', 'Speed Baccarat', 307),
  ('2026-08-30', 'blaze', 'Roleta', 257),
  ('2026-08-30', 'casa_apostas', 'Blackjack',  24),
  ('2026-08-30', 'casa_apostas', 'Futebol Brasileiro',  12),
  ('2026-08-30', 'casa_apostas', 'Speed Baccarat',  16),
  ('2026-08-30', 'casa_apostas', 'Roleta',  69)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-08-01', 'casa_apostas', 1136),
  ('2026-08-01', 'blaze', 8514)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
