-- CS Atendimento Outlook — cron a cada 5 min (pg_cron + pg_net).
-- Agendamento PRINCIPAL (confiável). GitHub Actions é só backup/manual.
--
-- PRÉ-REQUISITO (uma vez no SQL Editor — ver scripts/setup-cs-atendimento-outlook-cron.sql):
--   vault.create_secret → supabase_project_url
--   vault.create_secret → supabase_service_role_key
--   (opcional) vault.create_secret → cs_atendimento_outlook_ingest_secret

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'ingest-cs-atendimento-outlook-5min' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'ingest-cs-atendimento-outlook-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1
    ) || '/functions/v1/ingest-cs-atendimento-outlook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1
      )
    ),
    body := jsonb_strip_nulls(
      jsonb_build_object(
        'ingest_secret', (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'cs_atendimento_outlook_ingest_secret'
          LIMIT 1
        )
      )
    )
  )
  WHERE EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_project_url'
  )
  AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'
  );
  $$
);
