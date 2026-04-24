-- Mesas Spin — 16/04/2026: Casa de Apostas + Blaze (UPSERT).
-- Casa: coluna `mesa` VIP = VIP Blackjack 1 (convénio histórico; no print costuma ler-se "Blackjack VIP").
--
-- Arredondamento: GGR Casa (soma mesas 1670 vs daily 1669) e turnover Blaze (soma 762477 vs 762476) — 1 unidade.
-- UAP: `relatorio_daily_summary.uap` = jogadores únicos que jogaram em ≥1 mesa Spin; `relatorio_uap_por_jogo`
--       = jogadores únicos naquele jogo/mesa agregado — a soma por jogo não tem de bater com o diário.
--
-- Correr no SQL Editor do Supabase.

BEGIN;

INSERT INTO public.relatorio_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-04-16', 'casa_apostas', 166668, 1669, 51073, 105),
  ('2026-04-16', 'blaze',        762476, 38177, 138863, 865)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-04-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 1',      1588,  65790,  2177),
  ('2026-04-16', 'Casa de Apostas', 'casa_apostas', 'Roleta',            120,  54884, 43557),
  ('2026-04-16', 'Casa de Apostas', 'casa_apostas', 'Blackjack 2',       263,   5918,   574),
  ('2026-04-16', 'Casa de Apostas', 'casa_apostas', 'VIP Blackjack 1', -4113,  13985,   328),
  ('2026-04-16', 'Casa de Apostas', 'casa_apostas', 'Speed Baccarat',   3812,  26091,  4437),
  ('2026-04-16', 'Blaze',           'blaze',        'Blackjack 1',     -2795,  74308,  3966),
  ('2026-04-16', 'Blaze',           'blaze',        'Roleta',          23996, 242093, 119538),
  ('2026-04-16', 'Blaze',           'blaze',        'Blackjack 2',     10785, 181260,  8662),
  ('2026-04-16', 'Blaze',           'blaze',        'Blackjack VIP',    -963,  52975,   262),
  ('2026-04-16', 'Blaze',           'blaze',        'Speed Baccarat',   7154, 211841,  6435)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

-- UAP por jogo — 16/04/2026.
INSERT INTO public.relatorio_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-04-16', 'casa_apostas', 'Blackjack',       50),
  ('2026-04-16', 'casa_apostas', 'Speed Baccarat',  65),
  ('2026-04-16', 'casa_apostas', 'Roleta',          84),
  ('2026-04-16', 'blaze',        'Blackjack',      196),
  ('2026-04-16', 'blaze',        'Speed Baccarat', 280),
  ('2026-04-16', 'blaze',        'Roleta',         476)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
