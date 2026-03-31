-- Limpa todos os dados das tabelas que alimentam a página Mesas Spin
-- (upload OCR / PLS Commercial e leituras do dashboard).
-- Não remove operadoras, permissões nem outras integrações.
-- Execute via: supabase db push / migrações, ou copie para o SQL Editor do Supabase.

TRUNCATE TABLE
  relatorio_por_tabela,
  relatorio_daily_por_mesa,
  relatorio_daily_summary,
  relatorio_monthly_summary;
