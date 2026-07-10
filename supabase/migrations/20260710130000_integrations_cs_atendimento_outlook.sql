-- Integração CS Atendimento Outlook — Status Técnico e sync_logs (FK integrations.slug).
-- Idempotente: se o slug já existir, atualiza nome/descrição/ativo.

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'cs_atendimento_outlook',
  'CS - Caixa de Contato (Outlook)',
  'Ingestão da Inbox contato@spingaming.com.br via Microsoft Graph (Edge ingest-cs-atendimento-outlook).',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
