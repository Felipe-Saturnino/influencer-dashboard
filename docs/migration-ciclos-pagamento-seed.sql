-- =============================================================================
-- MIGRAÇÃO: Inserir ciclos de pagamento (quinta a quarta)
--
-- Ciclos semanais: de quinta-feira a quarta-feira. Gera ciclos desde a primeira
-- quinta de dezembro/2025 até a semana atual.
--
-- Use após limpeza da base (DELETE FROM ciclos_pagamento). O frontend também
-- cria ciclos automaticamente a partir das lives realizadas.
--
-- Execute no Supabase SQL Editor.
-- =============================================================================

-- Encontra a primeira quinta-feira em ou após 2025-12-01
WITH primeira_quinta AS (
  SELECT ('2025-12-01'::date + ((4 - extract(dow FROM '2025-12-01'::date)::int + 7) % 7) * interval '1 day')::date AS d
),
-- Gera sequência de quintas-feiras até esta semana
quintas AS (
  SELECT (SELECT d FROM primeira_quinta) + (n * 7) * interval '1 day' AS quinta
  FROM generate_series(0, greatest(0, ((current_date - (SELECT d FROM primeira_quinta)) / 7)::int + 1)) AS n
)
INSERT INTO ciclos_pagamento (data_inicio, data_fim)
SELECT
  quinta::date AS data_inicio,
  (quinta + interval '6 days')::date AS data_fim
FROM quintas
WHERE NOT EXISTS (
  SELECT 1 FROM ciclos_pagamento c
  WHERE c.data_inicio = quinta::date
);
