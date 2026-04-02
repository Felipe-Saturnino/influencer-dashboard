-- Importação manual — Mesas Spin (histórico jan/2026 extraído de prints nesta sessão)
-- Cobre daily + monthly (UAP/ARPU) + por_tabela onde a tabela “Per table BRL” estava legível por completo.
-- Lacunas: dias de jan/2026 sem linha abaixo (ex.: 01–04, 19–24, 31) e fev/mar dos 76 ficheiros — rever imagens ou reenviar lote.
-- Mensal jan/2026 UAP/ARPU: valores do print com daily até 30/01/2026 (bloco Date / UAP / ARPU).
-- Correr no SQL Editor Supabase (role com bypass RLS).

BEGIN;

-- ── relatorio_daily_summary (consolidado diário)
INSERT INTO public.relatorio_daily_summary (data, turnover, ggr, apostas, uap)
VALUES
  -- daily 2026-01-05 .. 2026-01-18
  ('2026-01-05', 114573,  27466, 11835,  57),
  ('2026-01-06',  34784,  -1135, 10474,  55),
  ('2026-01-07', 219950,  -7155, 21199,  75),
  ('2026-01-08', 167409,   2903, 14758, 110),
  ('2026-01-09', 206715,  -1726, 16919,  76),
  ('2026-01-10',  59463,   2055, 18249, 105),
  ('2026-01-11',  64534,   1450, 21340,  86),
  ('2026-01-12',  54453,     92, 17116, 110),
  ('2026-01-13',  96456,   4649, 18481, 103),
  ('2026-01-14', 150798,  23876, 13400, 117),
  ('2026-01-15', 145941,   1991, 17659, 108),
  ('2026-01-16', 315553,    988, 13337, 103),
  ('2026-01-17', 224999,   6303, 17503, 109),
  ('2026-01-18', 208942,   6668, 10782,  92),
  -- daily 2026-01-25 .. 2026-01-30
  ('2026-01-25', 143269,  -2701, 18279, 108),
  ('2026-01-26', 190677,  29496, 23308, 129),
  ('2026-01-27', 226687,   2789, 24391, 127),
  ('2026-01-28', 246488,  15329, 16001, 135),
  ('2026-01-29', 257563,   4192, 20468, 121),
  ('2026-01-30', 173674,   8169, 18920, 131)
ON CONFLICT (data) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

-- ── relatorio_monthly_summary (UAP / ARPU do print — tabela à direita)
INSERT INTO public.relatorio_monthly_summary (mes, uap, arpu)
VALUES
  ('2025-11-01',   60, 441.07),  -- monthly nov/2025 UAP/ARPU do relatório
  ('2025-12-01',  869, 228.01),  -- monthly dez/2025 UAP/ARPU do relatório
  ('2026-01-01', 1284, 149.07)   -- monthly jan/2026 — snapshot com daily até 30/01 no mesmo print
ON CONFLICT (mes) DO UPDATE SET
  uap        = EXCLUDED.uap,
  arpu       = EXCLUDED.arpu,
  updated_at = now();

-- ── relatorio_por_tabela — métricas d-1; dia = data do bloco d-1 (= dia mais recente do daily na mesma leitura)
-- 2026-01-08 (print com daily 06–08/01; totais d-1 batem com 08/01)
INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas)
VALUES
  ('2026-01-08', 'Casa de Apostas', 'Blackjack 2',       5343,  45293,  3181),
  ('2026-01-08', 'Casa de Apostas', 'Blackjack 1',       1885,  87560,  3205),
  ('2026-01-08', 'Casa de Apostas', 'VIP Blackjack 1',    448,  18155,   339),
  ('2026-01-08', 'Casa de Apostas', 'Speed Baccarat',    -378,   1822,   383),
  ('2026-01-08', 'Casa de Apostas', 'Roulette',         -4393,  16580,  7668),
  ('2026-01-08', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-08', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0),
  ('2026-01-08', 'Bet Nacional',    'Speed Baccarat',       0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- 2026-01-11 (print com daily 09–11/01; summary d-1 = 11/01)
INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas)
VALUES
  ('2026-01-11', 'Casa de Apostas', 'Blackjack 2',       1116,  19900,  1607),
  ('2026-01-11', 'Casa de Apostas', 'Roulette',          1103,  15365, 17616),
  ('2026-01-11', 'Casa de Apostas', 'Speed Baccarat',      97,   4404,   634),
  ('2026-01-11', 'Casa de Apostas', 'VIP Blackjack 1',     75,   1850,    28),
  ('2026-01-11', 'Casa de Apostas', 'Blackjack 1',       -943,  23015,  1455),
  ('2026-01-11', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-11', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0),
  ('2026-01-11', 'Bet Nacional',    'Speed Baccarat',       0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- 2026-01-29 (print com daily 27–29/01; summary d-1 = 29/01)
INSERT INTO public.relatorio_por_tabela (dia, operadora, mesa, ggr, turnover, apostas)
VALUES
  ('2026-01-29', 'Casa de Apostas', 'Blackjack 1',       4900,  50895,  2087),
  ('2026-01-29', 'Casa de Apostas', 'Blackjack 2',       2635,  65688,  2076),
  ('2026-01-29', 'Casa de Apostas', 'Roulette',          1834,  49600, 15292),
  ('2026-01-29', 'Casa de Apostas', 'VIP Blackjack 1',    -53,  72245,   736),
  ('2026-01-29', 'Casa de Apostas', 'Speed Baccarat',   -5125,  19136,   277),
  ('2026-01-29', 'Bet Nacional',    'Blackjack 2',          0,      0,     0),
  ('2026-01-29', 'Bet Nacional',    'VIP Blackjack 1',      0,      0,     0),
  ('2026-01-29', 'Bet Nacional',    'Speed Baccarat',       0,      0,     0)
ON CONFLICT (dia, operadora, mesa) DO UPDATE SET
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

COMMIT;
