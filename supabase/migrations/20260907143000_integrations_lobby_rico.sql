-- Integração Lobby Rico Bet — Status Técnico e sync_logs (Edge monitor-lobby-rico).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_rico',
  'Lobby Rico Bet',
  'Monitor de posicionamento das mesas Spin na grade Todos os jogos da RicoBet (casino-games/filter; Edge monitor-lobby-rico / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
