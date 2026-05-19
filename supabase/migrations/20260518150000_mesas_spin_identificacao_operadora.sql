-- Separa ID interno Spin (mesa_identificacao) do ID no catálogo da operadora (mesa_identificacao_operadora).
-- Usado pelo monitor de lobby (ex.: game id na API Blaze).

ALTER TABLE public.mesas_spin_cadastro
  ADD COLUMN IF NOT EXISTS mesa_identificacao_operadora text;

COMMENT ON COLUMN public.mesas_spin_cadastro.mesa_identificacao IS
  'Identificador interno Spin (estúdio / fornecedor). Único por operadora_slug (case-insensitive).';
COMMENT ON COLUMN public.mesas_spin_cadastro.mesa_identificacao_operadora IS
  'Identificador da mesa/jogo no catálogo da operadora (ex.: id numérico na API Blaze live-casino).';

CREATE UNIQUE INDEX IF NOT EXISTS ux_mesas_spin_cadastro_op_operadora_id
  ON public.mesas_spin_cadastro (operadora_slug, lower(btrim(mesa_identificacao_operadora)))
  WHERE mesa_identificacao_operadora IS NOT NULL AND btrim(mesa_identificacao_operadora) <> '';

-- Snapshot do monitor: guardar ambos os IDs por linha.
ALTER TABLE public.lobby_monitor_posicao
  ADD COLUMN IF NOT EXISTS mesa_identificacao_operadora text;

COMMENT ON COLUMN public.lobby_monitor_posicao.mesa_identificacao IS
  'Cópia do ID interno Spin (mesas_spin_cadastro.mesa_identificacao) no momento da execução.';
COMMENT ON COLUMN public.lobby_monitor_posicao.mesa_identificacao_operadora IS
  'ID usado na busca no lobby da operadora (mesas_spin_cadastro.mesa_identificacao_operadora).';

CREATE INDEX IF NOT EXISTS idx_lobby_monitor_posicao_op_operadora_id
  ON public.lobby_monitor_posicao (operadora_slug, mesa_identificacao_operadora, execucao_id);
