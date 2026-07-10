-- Integração Vagas → WordPress Carreiras (Status Técnico / sync_logs).
-- Edge Function: sync-vagas-carreiras-site

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'vagas_carreiras_wordpress',
  'Vagas Carreiras (WordPress)',
  'Snapshot diário de vagas externas abertas → endpoint WordPress /carreiras/ (Edge sync-vagas-carreiras-site).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
