-- Integração CS Atendimento Outlook — Status Técnico e sync_logs (FK integrations.slug).

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'cs_atendimento_outlook',
  'CS Atendimento (Outlook)',
  'Ingestão da Inbox contato@spingaming.com.br via Microsoft Graph (Edge ingest-cs-atendimento-outlook).',
  true
)
ON CONFLICT (slug) DO NOTHING;
