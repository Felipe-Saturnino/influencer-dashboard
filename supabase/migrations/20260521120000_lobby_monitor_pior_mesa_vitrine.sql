-- Jogos de concorrentes (qualquer tipo) à frente da mesa Spin com pior posição no lobby.
-- Preenchido pela Edge monitor-lobby-blaze; script Telecom inalterado.

ALTER TABLE public.lobby_monitor_execucao
  ADD COLUMN IF NOT EXISTS pior_mesa_nome text,
  ADD COLUMN IF NOT EXISTS pior_mesa_identificacao text,
  ADD COLUMN IF NOT EXISTS pior_mesa_posicao int,
  ADD COLUMN IF NOT EXISTS jogos_a_frente_pior_mesa jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.lobby_monitor_execucao.pior_mesa_posicao IS
  'Posição P no lobby da mesa Spin mais atrás (maior número) na execução.';
COMMENT ON COLUMN public.lobby_monitor_execucao.jogos_a_frente_pior_mesa IS
  'Todos os jogos não-Spin com posicao < pior_mesa_posicao: [{ posicao, game_id, name, slug, provider_name, provider_slug }, ...].';

ALTER TABLE public.lobby_monitor_execucao
  DROP CONSTRAINT IF EXISTS lobby_monitor_execucao_jogos_a_frente_array;

ALTER TABLE public.lobby_monitor_execucao
  ADD CONSTRAINT lobby_monitor_execucao_jogos_a_frente_array CHECK (
    jsonb_typeof(jogos_a_frente_pior_mesa) = 'array'
  );
