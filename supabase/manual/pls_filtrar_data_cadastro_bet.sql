-- ═══════════════════════════════════════════════════════════════════════════
-- Listar cda_id com data_cadastro_bet num intervalo de dias (UTC, dias civis).
-- Uso: SQL Editor no TEST → ajuste params abaixo → corra as queries que precisar.
--
-- Sync via Edge Function sync-pls-jogador (enriquecimento manual):
--   • Opção 1 — sem copiar IDs: POST com body JSON (dezembro/2025 inteiro, UTC):
--     {
--       "created_at_year": 2025,
--       "created_at_month": 12,
--       "date_field": "data_cadastro_bet"
--     }
--     ou equivalente explícito:
--     {
--       "created_at_gte": "2025-12-01T00:00:00.000Z",
--       "created_at_lt": "2026-01-01T00:00:00.000Z",
--       "date_field": "data_cadastro_bet"
--     }
--
--   • Opção 2 — colar cda_ids: rode o bloco "Body JSON" e use só o objeto
--     { "cda_ids": [...] } no body do POST (respeite PLS_SYNC_MAX_BATCH).
-- ═══════════════════════════════════════════════════════════════════════════

-- Parâmetros: dia inicial e final INCLUSIVOS (calendário UTC) — aqui dezembro/2025 inteiro
WITH params AS (
  SELECT
    date '2025-12-01' AS data_inicio_utc,
    date '2025-12-31' AS data_fim_utc
),
alvo AS (
  SELECT j.cda_id
  FROM public.pls_jogador_dados j
  CROSS JOIN params p
  WHERE j.data_cadastro_bet IS NOT NULL
    AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date >= p.data_inicio_utc
    AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date <= p.data_fim_utc
)
SELECT cda_id FROM alvo ORDER BY cda_id;

-- Resumo (contagem)
WITH params AS (
  SELECT
    date '2025-12-01' AS data_inicio_utc,
    date '2025-12-31' AS data_fim_utc
)
SELECT
  p.data_inicio_utc,
  p.data_fim_utc,
  count(j.cda_id) AS qtd
FROM params p
LEFT JOIN public.pls_jogador_dados j
  ON j.data_cadastro_bet IS NOT NULL
  AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date >= p.data_inicio_utc
  AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date <= p.data_fim_utc
GROUP BY p.data_inicio_utc, p.data_fim_utc;

-- Body JSON (colar no POST: só o valor de "body", com chave cda_ids no root)
WITH params AS (
  SELECT
    date '2025-12-01' AS data_inicio_utc,
    date '2025-12-31' AS data_fim_utc
),
alvo AS (
  SELECT j.cda_id
  FROM public.pls_jogador_dados j
  CROSS JOIN params p
  WHERE j.data_cadastro_bet IS NOT NULL
    AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date >= p.data_inicio_utc
    AND (j.data_cadastro_bet AT TIME ZONE 'UTC')::date <= p.data_fim_utc
)
SELECT json_build_object(
  'cda_ids',
  coalesce((SELECT json_agg(cda_id ORDER BY cda_id) FROM alvo), '[]'::json)
) AS body;
