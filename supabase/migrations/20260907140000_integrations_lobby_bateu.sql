-- Integração Lobby Bateu Bet — Status Técnico e sync_logs (Edge monitor-lobby-bateu).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_bateu',
  'Lobby Bateu Bet',
  'Monitor de posicionamento das mesas Spin na grade Todos os jogos da Bateu.bet (casino-games/list; Edge monitor-lobby-bateu / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
