-- Integração Lobby BRX Bet — Status Técnico e sync_logs (Edge monitor-lobby-brx).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_brx',
  'Lobby BRX Bet',
  'Monitor de posicionamento das mesas Spin na grade Todos os jogos da BrxBet (casino-games/filter; Edge monitor-lobby-brx / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
