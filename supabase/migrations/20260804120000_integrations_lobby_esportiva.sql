-- Integração Lobby Esportiva Bet — Status Técnico e sync_logs (Edge monitor-lobby-esportiva).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_esportiva',
  'Lobby Esportiva Bet',
  'Monitor de posicionamento das mesas Spin no Cassino ao Vivo da Esportiva Bet (API BS2Bet / GG Labs; Edge monitor-lobby-esportiva / job Telecom).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
