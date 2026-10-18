-- Revenue Sentinel: cada chamada cobre uma única competência para limitar o volume
-- paginado de operator-player-rounds. D-1 sempre; nunca envia o dia corrente incompleto.

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid
  FROM cron.job
  WHERE jobname = 'daily-sync-revenue-sentinel'
  LIMIT 1;

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
      'data_inicio',
      date_trunc(
        'month',
        (timezone('America/Sao_Paulo', now()))::date - 1
      )::date::text,
      'data_fim',
      ((timezone('America/Sao_Paulo', now()))::date - 1)::text,
      'cda_conta',
      'influencers',
      'atualizar_cadastro',
      false
    )
  );
  $$
);
