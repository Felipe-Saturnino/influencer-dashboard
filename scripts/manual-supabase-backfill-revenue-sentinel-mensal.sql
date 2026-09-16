-- BACKFILL MANUAL — Revenue Sentinel por competência
-- Pré-requisito: publicar sync-revenue-sentinel (index.ts + parser) com bucket mensal.
--
-- 1) Execute primeiro a limpeza abaixo. Ela preserva TAP e limpa apenas métricas Spin.
-- 2) Execute UMA chamada por vez, espere o sync terminar no Status Técnico e só então
--    execute a próxima. As chamadas são assíncronas.
-- 3) Setembro corrente fica por conta do cron D-1 após aplicar a migration
--    20260916130000_cron_revenue_sentinel_competencia.sql.

UPDATE public.jogadores_metricas_diarias
SET
  rodadas_spin = 0,
  apostas_spin = 0,
  ggr_spin = NULL,
  turnover_spin = NULL,
  jogou_spin = NULL,
  rodadas_por_jogo = '{}'::jsonb,
  rodadas_por_mesa = '[]'::jsonb
WHERE operadora_slug = 'casa_apostas'
  AND cda_conta = 'influencers'
  AND data >= DATE '2025-12-01';

-- Execute separadamente, de cima para baixo:
SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2025-12-01","data_fim":"2025-12-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-01-01","data_fim":"2026-01-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-02-01","data_fim":"2026-02-28","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-03-01","data_fim":"2026-03-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-04-01","data_fim":"2026-04-30","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-05-01","data_fim":"2026-05-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-06-01","data_fim":"2026-06-30","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-07-01","data_fim":"2026-07-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-08-01","data_fim":"2026-08-31","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);

-- Competência corrente: a limpeza acima também zerou setembro. Ajuste `data_fim` para D-1
-- (nunca o dia corrente) ou use o botão Sync do Status Técnico, que já manda mês corrente até D-1.
SELECT public._cron_edge_http_post(
  'sync-revenue-sentinel',
  '{"data_inicio":"2026-09-01","data_fim":"2026-09-15","cda_conta":"influencers","atualizar_cadastro":false}'::jsonb
);
