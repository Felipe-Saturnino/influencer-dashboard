-- Remove linhas de Baccarat em jan/2026 com GGR, turnover e apostas todos 0
-- (ex.: placeholders "Bet Nacional / Speed Baccarat" do ingest). Mantém "Casa de Apostas / Speed Baccarat" com movimento.
-- Correr no SQL Editor (postgres ou service_role). Opcional: rever o SELECT antes do DELETE.

-- Pré-visualização (descomentar e correr primeiro)
-- SELECT dia, operadora, mesa, ggr, turnover, apostas
-- FROM public.relatorio_por_tabela
-- WHERE dia >= '2026-01-01' AND dia < '2026-02-01'
--   AND mesa ILIKE '%baccarat%'
--   AND COALESCE(ggr, 0) = 0
--   AND COALESCE(turnover, 0) = 0
--   AND COALESCE(apostas, 0) = 0;

BEGIN;

DELETE FROM public.relatorio_por_tabela
WHERE dia >= '2026-01-01' AND dia < '2026-02-01'
  AND mesa ILIKE '%baccarat%'
  AND COALESCE(ggr, 0) = 0
  AND COALESCE(turnover, 0) = 0
  AND COALESCE(apostas, 0) = 0;

COMMIT;
