-- =============================================================================
-- Setup cron CS Outlook (pg_cron) — rode no SQL Editor do projeto
-- Projeto: https://dzyuqibobeujzedomlsc.supabase.co
-- =============================================================================
-- 1) Preencha SERVICE_ROLE e (opcional) INGEST_SECRET abaixo
-- 2) Rode o bloco inteiro
-- 3) Após ~5 min: Edge Functions → Invocations ou sync_logs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- --- Ajuste estes valores ---
-- URL do projeto (já preenchida)
-- Service role: Project Settings → API → service_role (Reveal)
-- Ingest secret: mesmo valor de CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET na Edge Function

DO $$
DECLARE
  v_url text := 'https://dzyuqibobeujzedomlsc.supabase.co';
  v_service_role text := 'COLE_AQUI_A_SERVICE_ROLE_KEY';
  v_ingest text := 'teste'; -- troque depois por secret forte; deve bater com a Edge Function
  v_id uuid;
BEGIN
  IF v_service_role IS NULL OR v_service_role = '' OR v_service_role LIKE 'COLE_AQUI%' THEN
    RAISE EXCEPTION 'Substitua v_service_role pela service_role key do projeto.';
  END IF;

  -- supabase_project_url
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'supabase_project_url' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_url, 'supabase_project_url', 'URL base — cron CS Outlook');
  ELSE
    PERFORM vault.update_secret(v_id, v_url);
  END IF;

  -- supabase_service_role_key
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'supabase_service_role_key' LIMIT 1;
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(v_service_role, 'supabase_service_role_key', 'Service role — cron CS Outlook');
  ELSE
    PERFORM vault.update_secret(v_id, v_service_role);
  END IF;

  -- cs_atendimento_outlook_ingest_secret (opcional mas recomendado)
  IF v_ingest IS NOT NULL AND btrim(v_ingest) <> '' THEN
    SELECT id INTO v_id FROM vault.secrets WHERE name = 'cs_atendimento_outlook_ingest_secret' LIMIT 1;
    IF v_id IS NULL THEN
      PERFORM vault.create_secret(v_ingest, 'cs_atendimento_outlook_ingest_secret', 'Body ingest_secret — cron CS Outlook');
    ELSE
      PERFORM vault.update_secret(v_id, v_ingest);
    END IF;
  END IF;
END $$;

-- Reagenda o job (mesmo SQL da migration)
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

-- Validar
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'ingest-cs-atendimento-outlook-5min';

SELECT name
FROM vault.secrets
WHERE name IN (
  'supabase_project_url',
  'supabase_service_role_key',
  'cs_atendimento_outlook_ingest_secret'
)
ORDER BY name;
