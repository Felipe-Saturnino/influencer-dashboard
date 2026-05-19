-- Integração Lobby Blaze — Status Técnico e sync_logs (Edge monitor-lobby-blaze).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'lobby_blaze',
  'Lobby Blaze',
  'Monitor de posicionamento das mesas Spin no Cassino Ao Vivo da Blaze (Edge monitor-lobby-blaze / job agendado).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
