-- Integração Spin na Rede (RSS) — Status Técnico, sync_logs e tech_logs (FK integrations.slug).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'spin_na_rede_rss',
  'Spin na Rede (RSS)',
  'Ingestão automática de feeds RSS/Atom para public.spin_na_rede_mencao (Edge sync-spin-na-rede-rss).',
  true
)
ON CONFLICT (slug) DO NOTHING;
