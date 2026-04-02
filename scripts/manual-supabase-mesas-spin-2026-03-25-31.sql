-- Importação manual — Mesas Spin (março 2026, teste 7 dias)
-- Diário + por mesa (um snapshot por dia 25–31). NÃO inclui relatorio_monthly_summary
-- (UAP/ARPU do consolidado devem ser atualizados à parte ou via outro processo).
-- Correr no SQL Editor (role com bypass RLS ou como postgres).

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, turnover, ggr, apostas, uap)
VALUES
  ('2026-03-25', 235655,  37365, 40324, 137),
  ('2026-03-26', 284264,  14112, 39673, 243),
  ('2026-03-27', 114317,   3960, 22354, 151),
  ('2026-03-28', 207595,   3770, 26756, 144),
  ('2026-03-29', 138514,  -3746, 40009, 138),
  ('2026-03-30', 129231,   1239, 20183, 120),
  ('2026-03-31', 217730,  14271, 28365, 127)
ON CONFLICT (data) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas)
VALUES
  ('2026-03-25', 'Casa de Apostas', 'Roleta',          17080, 104939, 29327),
  ('2026-03-25', 'Casa de Apostas', 'Blackjack 2',     10303,  46870,  2735),
  ('2026-03-25', 'Casa de Apostas', 'Blackjack VIP',    6250,  13790,   140),
  ('2026-03-25', 'Casa de Apostas', 'Speed Baccarat',   2553,  31299,  5049),
  ('2026-03-25', 'Casa de Apostas', 'Blackjack 1',      1180,  38758,  3073),

  ('2026-03-26', 'Casa de Apostas', 'Speed Baccarat',   9019, 125664, 11330),
  ('2026-03-26', 'Casa de Apostas', 'Roleta',           4443,  77837, 22298),
  ('2026-03-26', 'Casa de Apostas', 'Blackjack 2',      3053,  21023,  1804),
  ('2026-03-26', 'Casa de Apostas', 'Blackjack VIP',     -25,   2975,    92),
  ('2026-03-26', 'Casa de Apostas', 'Blackjack 1',     -2378,  56765,  4149),

  ('2026-03-27', 'Casa de Apostas', 'Roleta',           1321,  41596, 14411),
  ('2026-03-27', 'Casa de Apostas', 'Speed Baccarat',   1124,  17548,  3561),
  ('2026-03-27', 'Casa de Apostas', 'Blackjack 1',       850,  39638,  2969),
  ('2026-03-27', 'Casa de Apostas', 'Blackjack 2',       565,  15435,  1411),
  ('2026-03-27', 'Casa de Apostas', 'Blackjack VIP',     100,    100,     2),

  ('2026-03-28', 'Casa de Apostas', 'Blackjack 2',      2055,  23918,   988),
  ('2026-03-28', 'Casa de Apostas', 'Speed Baccarat',   1449,  29913,  2605),
  ('2026-03-28', 'Casa de Apostas', 'Blackjack 1',      1420,  85610,  2987),
  ('2026-03-28', 'Casa de Apostas', 'Blackjack VIP',      53,  26255,   321),
  ('2026-03-28', 'Casa de Apostas', 'Roleta',          -1207,  41899, 19855),

  ('2026-03-29', 'Casa de Apostas', 'Blackjack 1',      1053,  21753,  1628),
  ('2026-03-29', 'Casa de Apostas', 'Speed Baccarat',    594,   9457,  3728),
  ('2026-03-29', 'Casa de Apostas', 'Blackjack VIP',     275,   2805,    81),
  ('2026-03-29', 'Casa de Apostas', 'Blackjack 2',      -388,   7908,   597),
  ('2026-03-29', 'Casa de Apostas', 'Roleta',          -5280,  96593, 33975),

  ('2026-03-30', 'Casa de Apostas', 'Roleta',           1974,  76578, 15866),
  ('2026-03-30', 'Casa de Apostas', 'Blackjack 1',       898,  17455,   957),
  ('2026-03-30', 'Casa de Apostas', 'Blackjack VIP',     770,   9380,   172),
  ('2026-03-30', 'Casa de Apostas', 'Blackjack 2',       713,   8605,   628),
  ('2026-03-30', 'Casa de Apostas', 'Speed Baccarat',  -3115,  17214,  2560),

  ('2026-03-31', 'Casa de Apostas', 'Roleta',           9017, 115399, 23241),
  ('2026-03-31', 'Casa de Apostas', 'Blackjack VIP',    4745,  26270,   295),
  ('2026-03-31', 'Casa de Apostas', 'Speed Baccarat',   1189,  12324,  1694),
  ('2026-03-31', 'Casa de Apostas', 'Blackjack 1',       483,  39198,  2393),
  ('2026-03-31', 'Casa de Apostas', 'Blackjack 2',     -1163,  24540,   742)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

COMMIT;
