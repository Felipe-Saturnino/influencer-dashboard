-- Remove dados e schema do relatório Mesas Spin / importação OCR (PLS Daily Commercial).
-- A funcionalidade será reconstruída do zero na aplicação.

DELETE FROM public.sync_logs
WHERE integracao_slug = 'upload_pls_daily_commercial';

DELETE FROM public.tech_logs
WHERE tipo = 'upload_pls_daily_commercial';

DELETE FROM public.integrations
WHERE slug = 'upload_pls_daily_commercial';

DROP TABLE IF EXISTS public.relatorio_daily_por_mesa CASCADE;
DROP TABLE IF EXISTS public.relatorio_por_tabela CASCADE;
DROP TABLE IF EXISTS public.relatorio_monthly_summary CASCADE;
DROP TABLE IF EXISTS public.relatorio_daily_summary CASCADE;
