-- Tabelas de teste PLS (sem HubSpot): âncora manual por CDA no Supabase;
-- processo futuro (ex.: Edge Function) preenche colunas a partir do backoffice / JSON.
--
-- Mapeamento conceitual:
--   pls_jogador_dados      ≈ Excel "General" (perfil + totais do jogador)
--   pls_jogador_historico_dia ≈ Excel "Game totals by date"

CREATE TABLE public.pls_jogador_dados (
  cda_id text NOT NULL PRIMARY KEY,
  registration_date_utc timestamptz,
  last_login_date_utc timestamptz,
  balance numeric,
  -- GGR no sentido do Excel: "Player total net" (pode ser negativo)
  ggr numeric,
  -- Turnover no sentido do Excel: "Player total bet"
  turnover numeric,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pls_jogador_dados IS
  'Dados gerais do jogador PLS (Excel General; âncora manual por cda_id). RLS ativo: sem políticas públicas; sync via service_role.';
COMMENT ON COLUMN public.pls_jogador_dados.cda_id IS 'ID CDA âncora (ex.: externalName / número que você cadastra no SQL).';
COMMENT ON COLUMN public.pls_jogador_dados.registration_date_utc IS 'Data de registo (UTC), ex.: registrationDate do JSON em ms.';
COMMENT ON COLUMN public.pls_jogador_dados.last_login_date_utc IS 'Último login (UTC), ex.: lastLoginDate do JSON em ms.';
COMMENT ON COLUMN public.pls_jogador_dados.balance IS 'Saldo (balance).';
COMMENT ON COLUMN public.pls_jogador_dados.ggr IS 'Player total net (GGR / resultado líquido agregado do jogador).';
COMMENT ON COLUMN public.pls_jogador_dados.turnover IS 'Player total bet (turnover agregado do jogador).';
COMMENT ON COLUMN public.pls_jogador_dados.synced_at IS 'Última vez que o processo de sync atualizou esta linha.';

CREATE TABLE public.pls_jogador_historico_dia (
  cda_id text NOT NULL REFERENCES public.pls_jogador_dados (cda_id) ON DELETE CASCADE,
  game_date date NOT NULL,
  game_count integer NOT NULL DEFAULT 0,
  turnover numeric,
  payout numeric,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cda_id, game_date)
);

COMMENT ON TABLE public.pls_jogador_historico_dia IS
  'Totais por dia (Excel Game totals by date; ex.: days[] do JSON PLS). RLS ativo: sem políticas públicas; sync via service_role.';
COMMENT ON COLUMN public.pls_jogador_historico_dia.cda_id IS 'ID CDA (FK para pls_jogador_dados).';
COMMENT ON COLUMN public.pls_jogador_historico_dia.game_date IS 'Dia civil UTC (derivado do campo day em ms ou coluna Date do Excel).';
COMMENT ON COLUMN public.pls_jogador_historico_dia.game_count IS 'Quantidade de jogos / rodadas no dia (gameCount).';
COMMENT ON COLUMN public.pls_jogador_historico_dia.turnover IS 'Turnover do dia (ex.: totalBet / amount em moeda da conta).';
COMMENT ON COLUMN public.pls_jogador_historico_dia.payout IS 'Payout do dia (ex.: totalPayout).';

CREATE INDEX pls_jogador_historico_dia_cda_id_idx ON public.pls_jogador_historico_dia (cda_id);

ALTER TABLE public.pls_jogador_dados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pls_jogador_historico_dia ENABLE ROW LEVEL SECURITY;
