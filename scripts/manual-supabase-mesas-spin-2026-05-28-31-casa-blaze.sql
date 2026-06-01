-- Mesas Spin — 28–31/05/2026: Casa de Apostas + Blaze (UPSERT).
--
-- Reconciliação (soma mesas vs daily):
--   28/05: Casa GGR +1, turnover ±1; Blaze turnover +1 — OK.
--   29/05: tudo = OK.
--   30/05: Casa GGR −1, turnover +1; Blaze GGR +2, turnover +1 — OK.
--   31/05: Casa turnover +1; Blaze turnover +1 — OK.
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

-- ── Daily summary ────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-05-28', 'casa_apostas', 661438,   985, 36550, 265),
  ('2026-05-28', 'blaze',        815935, 27059, 99860, 698),
  ('2026-05-29', 'casa_apostas', 464885, 12479, 45712, 236),
  ('2026-05-29', 'blaze',        909658, 27582, 96659, 676),
  ('2026-05-30', 'casa_apostas', 266908,  7501, 43917, 229),
  ('2026-05-30', 'blaze',        781825, 24149,103151, 664),
  ('2026-05-31', 'casa_apostas', 289379,  6559, 30242, 202),
  ('2026-05-31', 'blaze',        821515,  6855,102055, 599)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Por mesa ─────────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  -- 28/05 Casa
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        2810,  43290,  1864),
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'Roleta',          -9236,  77375, 21473),
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',     -1538,  76628,  4225),
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   208,  22593,   571),
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   6294, 364399,  5841),
  ('2026-05-28', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 2446, 77154,  2576),
  -- 28/05 Blaze
  ('2026-05-28', 'Blaze', 'blaze', 'Blackjack 1',     16440, 175928,  9364),
  ('2026-05-28', 'Blaze', 'blaze', 'Roleta',           3784, 243279, 78065),
  ('2026-05-28', 'Blaze', 'blaze', 'Blackjack 2',      8780, 136468,  6041),
  ('2026-05-28', 'Blaze', 'blaze', 'Blackjack VIP',    3750,  19600,    94),
  ('2026-05-28', 'Blaze', 'blaze', 'Speed Baccarat',  -5695, 240661,  6296),
  -- 29/05 Casa
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        1710,  34670,  1768),
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'Roleta',          -1058,  60163, 31457),
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      6825,  80490,   439),
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -1710,  20610,  5358),
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   2869, 100988,  4415),
  ('2026-05-29', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 3843, 167964,  2275),
  -- 29/05 Blaze
  ('2026-05-29', 'Blaze', 'blaze', 'Blackjack 1',      9870, 236265, 12371),
  ('2026-05-29', 'Blaze', 'blaze', 'Roleta',          10957, 152637, 68522),
  ('2026-05-29', 'Blaze', 'blaze', 'Blackjack 2',      8753, 125670,  7123),
  ('2026-05-29', 'Blaze', 'blaze', 'Blackjack VIP',  -13750,  86875,   610),
  ('2026-05-29', 'Blaze', 'blaze', 'Speed Baccarat',  11752, 308211,  8033),
  -- 30/05 Casa
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        3050,  19848,  1082),
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'Roleta',           4937,  88399, 34313),
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       405,  40573,  3076),
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',     5,   1605,    37),
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',  -2547,  63652,  3904),
  ('2026-05-30', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 1650,  52832,  1505),
  -- 30/05 Blaze
  ('2026-05-30', 'Blaze', 'blaze', 'Blackjack 1',     13978, 183368, 10888),
  ('2026-05-30', 'Blaze', 'blaze', 'Roleta',           8954, 161843, 78135),
  ('2026-05-30', 'Blaze', 'blaze', 'Blackjack 2',      6058, 146830,  7404),
  ('2026-05-30', 'Blaze', 'blaze', 'Blackjack VIP',   -4050,  84150,   226),
  ('2026-05-30', 'Blaze', 'blaze', 'Speed Baccarat',   -789, 205635,  6498),
  -- 31/05 Casa
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',        1523,  15503,   797),
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'Roleta',           2421,  84080, 20874),
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',      -285,  20863,  2262),
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1',   115,   7180,   170),
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   -273, 128628,  5364),
  ('2026-05-31', 'Casa de Apostas', 'casa_apostas', 'Futebol Brasileiro', 3058,  33126,   775),
  -- 31/05 Blaze
  ('2026-05-31', 'Blaze', 'blaze', 'Blackjack 1',      5253, 144590,  8769),
  ('2026-05-31', 'Blaze', 'blaze', 'Roleta',            -476, 411789, 80081),
  ('2026-05-31', 'Blaze', 'blaze', 'Blackjack 2',      2640,  74753,  5653),
  ('2026-05-31', 'Blaze', 'blaze', 'Blackjack VIP',    1163,  81600,   365),
  ('2026-05-31', 'Blaze', 'blaze', 'Speed Baccarat',  -1725, 108784,  7187)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- ── UAP por jogo ─────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-05-28', 'casa_apostas', 'Blackjack',          66),
  ('2026-05-28', 'casa_apostas', 'Futebol Brasileiro', 110),
  ('2026-05-28', 'casa_apostas', 'Speed Baccarat',     75),
  ('2026-05-28', 'casa_apostas', 'Roleta',             88),
  ('2026-05-28', 'blaze',        'Blackjack',         194),
  ('2026-05-28', 'blaze',        'Speed Baccarat',    241),
  ('2026-05-28', 'blaze',        'Roleta',            319),
  ('2026-05-29', 'casa_apostas', 'Blackjack',          59),
  ('2026-05-29', 'casa_apostas', 'Futebol Brasileiro',  65),
  ('2026-05-29', 'casa_apostas', 'Speed Baccarat',     65),
  ('2026-05-29', 'casa_apostas', 'Roleta',             92),
  ('2026-05-29', 'blaze',        'Blackjack',         207),
  ('2026-05-29', 'blaze',        'Speed Baccarat',    229),
  ('2026-05-29', 'blaze',        'Roleta',            295),
  ('2026-05-30', 'casa_apostas', 'Blackjack',          41),
  ('2026-05-30', 'casa_apostas', 'Futebol Brasileiro',  77),
  ('2026-05-30', 'casa_apostas', 'Speed Baccarat',     51),
  ('2026-05-30', 'casa_apostas', 'Roleta',            101),
  ('2026-05-30', 'blaze',        'Blackjack',         206),
  ('2026-05-30', 'blaze',        'Speed Baccarat',    210),
  ('2026-05-30', 'blaze',        'Roleta',            293),
  ('2026-05-31', 'casa_apostas', 'Blackjack',          41),
  ('2026-05-31', 'casa_apostas', 'Futebol Brasileiro',  52),
  ('2026-05-31', 'casa_apostas', 'Speed Baccarat',     58),
  ('2026-05-31', 'casa_apostas', 'Roleta',             84),
  ('2026-05-31', 'blaze',        'Blackjack',         175),
  ('2026-05-31', 'blaze',        'Speed Baccarat',    191),
  ('2026-05-31', 'blaze',        'Roleta',            279)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── Monthly ──────────────────────────────────────────────────────────────────

INSERT INTO public.relatorio_monthly_summary (mes, operadora_slug, uap)
VALUES
  ('2026-05-01', 'casa_apostas', 1933),
  ('2026-05-01', 'blaze',        12254),
  ('2026-06-01', 'casa_apostas',  125),
  ('2026-06-01', 'blaze',         376)
ON CONFLICT (mes, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
