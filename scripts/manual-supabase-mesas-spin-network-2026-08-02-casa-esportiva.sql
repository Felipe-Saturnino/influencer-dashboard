-- Mesas Spin — 02/08/2026: Network — Esportiva Bet + Casa de Apostas (UPSERT).
--
-- Tabelas: relatorio_network_* (não misturar com Dedicado / relatorio_*).
-- Reconciliação: Esportiva e Casa GGR, turnover e apostas = OK.
-- UAP por jogo ≠ daily (esperado).
-- Monthly: não veio no print deste dia — não atualizado aqui (usar script 01/08 ou print novo).
--
-- Correr no SQL Editor do Supabase (postgres).

BEGIN;

INSERT INTO public.relatorio_network_daily_summary (data, operadora_slug, turnover, ggr, apostas, uap)
VALUES
  ('2026-08-02', 'esportiva_bet', 94894, 9458, 2992, 53),
  ('2026-08-02', 'casa_apostas',  12279, 1987, 2194, 11)
ON CONFLICT (data, operadora_slug) DO UPDATE SET
  turnover   = EXCLUDED.turnover,
  ggr        = EXCLUDED.ggr,
  apostas    = EXCLUDED.apostas,
  uap        = EXCLUDED.uap,
  updated_at = now();

INSERT INTO public.relatorio_network_por_tabela (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)
VALUES
  ('2026-08-02', 'Esportiva Bet',   'esportiva_bet', 'Blackjack 1',           20,  3470,  261),
  ('2026-08-02', 'Esportiva Bet',   'esportiva_bet', 'Futebol Brasileiro',     0,     0,    0),
  ('2026-08-02', 'Esportiva Bet',   'esportiva_bet', 'Speed Baccarat',       -19,   507,  325),
  ('2026-08-02', 'Esportiva Bet',   'esportiva_bet', 'Roleta',             9457, 90917, 2406),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas',  'Blackjack 1',         -205,   480,   55),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas',  'Futebol Brasileiro',    45,    45,    4),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas',  'Roleta',                0,    17,   50),
  ('2026-08-02', 'Casa de Apostas', 'casa_apostas',  'Speed Baccarat',      2147, 11737, 2085)
ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET
  operadora  = EXCLUDED.operadora,
  ggr        = EXCLUDED.ggr,
  turnover   = EXCLUDED.turnover,
  apostas    = EXCLUDED.apostas,
  updated_at = now();

INSERT INTO public.relatorio_network_uap_por_jogo (data, operadora_slug, jogo, uap)
VALUES
  ('2026-08-02', 'esportiva_bet', 'Blackjack',          7),
  ('2026-08-02', 'esportiva_bet', 'Futebol Brasileiro', 0),
  ('2026-08-02', 'esportiva_bet', 'Speed Baccarat',    10),
  ('2026-08-02', 'esportiva_bet', 'Roleta',            39),
  ('2026-08-02', 'casa_apostas',  'Blackjack',          2),
  ('2026-08-02', 'casa_apostas',  'Futebol Brasileiro', 2),
  ('2026-08-02', 'casa_apostas',  'Speed Baccarat',     1),
  ('2026-08-02', 'casa_apostas',  'Roleta',             6)
ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET
  uap        = EXCLUDED.uap,
  updated_at = now();

COMMIT;
