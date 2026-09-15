-- Job diário Revenue Sentinel (~4h20 BRT = 07:20 UTC), depois do TAP Influencers.
-- Não desmonta os demais jobs. Pré-requisito: vault supabase_project_url + supabase_service_role_key
-- e a função public._cron_edge_http_post (migration daily_edge_jobs_pg_cron).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'daily-sync-revenue-sentinel' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'daily-sync-revenue-sentinel',
  '20 7 * * *',
  $$
  SELECT public._cron_edge_http_post(
    'sync-revenue-sentinel',
    jsonb_build_object(
      'data_inicio', '2025-12-01',
      'data_fim', ((timezone('America/Sao_Paulo', now()))::date - 1)::text,
      'cda_conta', 'influencers'
    )
  );
  $$
);
