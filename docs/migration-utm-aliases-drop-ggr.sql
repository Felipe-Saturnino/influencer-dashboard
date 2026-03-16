-- =============================================================================
-- MIGRAÇÃO: utm_aliases — remover coluna ggr
-- Execute APÓS refatorar a integração para não enviar ggr no payload.
-- GGR será calculado no app: total_deposit - total_withdrawal.
-- =============================================================================

ALTER TABLE utm_aliases DROP COLUMN IF EXISTS ggr;
