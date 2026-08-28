-- Jobs diários da manhã via pg_cron + pg_net (fonte PRINCIPAL — confiável).
-- GitHub Actions schedule nestes Edge jobs fica só backup/manual (evita fila do GH).
--
-- PRÉ-REQUISITO (já usado pelo cron CS Outlook):
--   vault → supabase_project_url
--   vault → supabase_service_role_key
-- Cole também: scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: POST em Edge Function com secrets do Vault
CREATE OR REPLACE FUNCTION public._cron_edge_http_post(p_function_path text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_base text;
  v_key text;
  v_req_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_base
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_base IS NULL OR btrim(v_base) = '' OR v_key IS NULL OR btrim(v_key) = '' THEN
    RAISE WARNING '[_cron_edge_http_post] vault sem supabase_project_url / supabase_service_role_key — job % ignorado', p_function_path;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(v_base, '/') || '/functions/v1/' || ltrim(p_function_path, '/'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := coalesce(p_body, '{}'::jsonb)
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public._cron_edge_http_post(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._cron_edge_http_post(text, jsonb) TO postgres;

COMMENT ON FUNCTION public._cron_edge_http_post(text, jsonb) IS
  'pg_cron: invoca Edge Function com URL/service_role do Vault (jobs diários manhã).';

-- Remonta jobs (idempotente)
DO $$
DECLARE
  nome text;
  jid bigint;
  nomes text[] := ARRAY[
    'daily-sync-metricas-cda-influencers',
    'daily-sync-metricas-cda-afiliados',
    'daily-relatorio-diario-diretoria',
    'daily-email-agenda-diaria',
    'daily-sync-spin-na-rede-rss',
    'daily-sync-comercial-spa-lista',
    'daily-validate-comercial-dominios',
    'daily-enrich-comercial-cnpj'
  ];
BEGIN
  FOREACH nome IN ARRAY nomes
  LOOP
    SELECT jobid INTO jid FROM cron.job WHERE jobname = nome LIMIT 1;
    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;
  END LOOP;
END $$;

-- ~4h BRT = 07:00 UTC — CDA Influencers
SELECT cron.schedule(
  'daily-sync-metricas-cda-influencers',
  '0 7 * * *',
  $$
  SELECT public._cron_edge_http_post(
    'sync-metricas-cda',
    jsonb_build_object(
      'data_inicio', '2025-12-01',
      'data_fim', ((timezone('America/Sao_Paulo', now()))::date - 1)::text,
      'skip_orfaos', false,
      'conta', 'influencers'
    )
  );
  $$
);

-- ~4h05 BRT — CDA Afiliados (escalonado)
SELECT cron.schedule(
  'daily-sync-metricas-cda-afiliados',
  '5 7 * * *',
  $$
  SELECT public._cron_edge_http_post(
    'sync-metricas-cda',
    jsonb_build_object(
      'data_inicio', '2025-12-01',
      'data_fim', ((timezone('America/Sao_Paulo', now()))::date - 1)::text,
      'skip_orfaos', false,
      'conta', 'afiliados'
    )
  );
  $$
);

-- ~6h BRT = 09:00 UTC — Relatório Diretoria
SELECT cron.schedule(
  'daily-relatorio-diario-diretoria',
  '0 9 * * *',
  $$
  SELECT public._cron_edge_http_post('relatorio-diario-diretoria', '{}'::jsonb);
  $$
);

-- ~6h10 BRT = 09:10 UTC — E-mail Agenda
SELECT cron.schedule(
  'daily-email-agenda-diaria',
  '10 9 * * *',
  $$
  SELECT public._cron_edge_http_post('email-agenda-diaria', '{}'::jsonb);
  $$
);

-- ~6h20 BRT = 09:20 UTC — Spin na Rede RSS
SELECT cron.schedule(
  'daily-sync-spin-na-rede-rss',
  '20 9 * * *',
  $$
  SELECT public._cron_edge_http_post('sync-spin-na-rede-rss', '{}'::jsonb);
  $$
);

-- ~7h30 BRT = 10:30 UTC — Comercial SPA
SELECT cron.schedule(
  'daily-sync-comercial-spa-lista',
  '30 10 * * *',
  $$
  SELECT public._cron_edge_http_post('sync-comercial-spa-lista', '{}'::jsonb);
  $$
);

-- ~8h BRT = 11:00 UTC — Validação domínios
SELECT cron.schedule(
  'daily-validate-comercial-dominios',
  '0 11 * * *',
  $$
  SELECT public._cron_edge_http_post('validate-comercial-dominios', '{}'::jsonb);
  $$
);

-- ~8h30 BRT = 11:30 UTC — Enrich CNPJ
SELECT cron.schedule(
  'daily-enrich-comercial-cnpj',
  '30 11 * * *',
  $$
  SELECT public._cron_edge_http_post('enrich-comercial-cnpj', '{}'::jsonb);
  $$
);
