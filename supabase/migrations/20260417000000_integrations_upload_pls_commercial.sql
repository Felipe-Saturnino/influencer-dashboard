-- Integração para sync_logs / Status Técnico — upload OCR (PLS / Daily Commercial Report).
-- A linha na UI é construída manualmente; o registo em integrations é necessário por causa da FK em sync_logs.

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'upload_pls_daily_commercial',
  'Upload de PLS / Daily Commercial Report',
  'Importação via OCR (browser) para relatorio_daily_summary, relatorio_monthly_summary, relatorio_por_tabela',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;
