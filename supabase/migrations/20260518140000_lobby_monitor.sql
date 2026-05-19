-- Monitor de posicionamento no lobby (Cassino Ao Vivo) por operadora.
-- MVP: Edge Function monitor-lobby-blaze (operadora blaze). Outras operadoras: novas funções + mesmo schema.

CREATE TABLE public.lobby_monitor_execucao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_slug      text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  executado_em        timestamptz NOT NULL DEFAULT now(),
  status              text        NOT NULL,
  paginas_lidas       int         NOT NULL DEFAULT 0,
  jogos_escaneados    int         NOT NULL DEFAULT 0,
  mesas_esperadas     int         NOT NULL DEFAULT 0,
  mesas_encontradas   int         NOT NULL DEFAULT 0,
  duracao_ms          int,
  erro                text,
  CONSTRAINT lobby_monitor_execucao_status_chk CHECK (
    status IN ('ok', 'parcial', 'erro_api', 'erro_config')
  )
);

COMMENT ON TABLE public.lobby_monitor_execucao IS
  'Execuções do monitor de lobby (posição das mesas Spin). Uma linha por rodada do job.';
COMMENT ON COLUMN public.lobby_monitor_execucao.status IS
  'ok = todas as mesas do cadastro encontradas; parcial = faltou mesa no lobby; erro_api = falha HTTP; erro_config = sem mesas no cadastro.';

CREATE INDEX idx_lobby_monitor_execucao_op_em
  ON public.lobby_monitor_execucao (operadora_slug, executado_em DESC);

CREATE TABLE public.lobby_monitor_posicao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id           uuid        NOT NULL REFERENCES public.lobby_monitor_execucao (id) ON DELETE CASCADE,
  operadora_slug        text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  mesa_identificacao    text        NOT NULL,
  nome_mesa             text        NOT NULL,
  tipo_jogo             text        NOT NULL,
  posicao               int,
  qtd_concorrentes_a_frente int     NOT NULL DEFAULT 0,
  concorrentes_a_frente jsonb       NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT lobby_monitor_posicao_concorrentes_array CHECK (jsonb_typeof(concorrentes_a_frente) = 'array')
);

COMMENT ON TABLE public.lobby_monitor_posicao IS
  'Snapshot por mesa em cada execução: posição P no lobby e concorrentes do mesmo tipo à frente.';
COMMENT ON COLUMN public.lobby_monitor_posicao.concorrentes_a_frente IS
  'Array JSON: [{ posicao, game_id, name, slug, provider_name, provider_slug }, ...].';

CREATE INDEX idx_lobby_monitor_posicao_execucao
  ON public.lobby_monitor_posicao (execucao_id);

CREATE INDEX idx_lobby_monitor_posicao_op_mesa
  ON public.lobby_monitor_posicao (operadora_slug, mesa_identificacao, execucao_id);

ALTER TABLE public.lobby_monitor_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_monitor_posicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY lobby_monitor_execucao_select
  ON public.lobby_monitor_execucao FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('view')
  );

CREATE POLICY lobby_monitor_posicao_select
  ON public.lobby_monitor_posicao FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('view')
  );

GRANT SELECT ON public.lobby_monitor_execucao TO authenticated;
GRANT SELECT ON public.lobby_monitor_posicao TO authenticated;
