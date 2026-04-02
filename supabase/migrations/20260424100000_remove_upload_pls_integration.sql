-- Remove integração "Upload de PLS / Daily Commercial Report" (Status Técnico / sync_logs).
-- Dados de relatório Mesas Spin passam a ser carregados manualmente (SQL / processos internos).
DELETE FROM public.integrations WHERE slug = 'upload_pls_daily_commercial';
