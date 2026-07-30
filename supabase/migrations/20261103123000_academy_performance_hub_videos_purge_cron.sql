-- Performance Hub — retenção de vídeos: cron semanal (pg_cron + pg_net).
-- Chama a Edge Function purge-academy-performance-hub-videos aos domingos, 04:20 UTC (01:20 BRT).
--
-- PRÉ-REQUISITO (uma vez no SQL Editor — mesmos secrets do cron de CS Atendimento):
--   vault.create_secret → supabase_project_url
--   vault.create_secret → supabase_service_role_key

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid
  FROM cron.job
  WHERE jobname = 'purge-academy-performance-hub-videos-semanal'
  LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'purge-academy-performance-hub-videos-semanal',
  '20 4 * * 0',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1
    ) || '/functions/v1/purge-academy-performance-hub-videos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_project_url'
  )
  AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'
  );
  $$
);
