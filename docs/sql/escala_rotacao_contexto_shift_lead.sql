-- =============================================================================
-- DEPRECATED — NÃO APLICAR
-- =============================================================================
-- Este ficheiro redefinia `escala_rotacao_contexto_dia` numa forma antiga
-- (só gps + shift_leads, sem gps_outros / liderancas / alocação).
-- Reaplicá-lo depois de `escala_rotacao_cockpit.sql` fazia downgrade silencioso
-- da RPC em produção (CREATE OR REPLACE).
--
-- Pool Shift Lead + contexto canónico:
--   1) docs/sql/escala_rotacao_cockpit.sql
--   2) docs/sql/escala_rotacao_incluir_lideranca.sql
--
-- Mantido no repositório só como histórico / aviso. Não colar no SQL Editor.
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE
    'escala_rotacao_contexto_shift_lead.sql está deprecated — use escala_rotacao_cockpit.sql + escala_rotacao_incluir_lideranca.sql';
END $$;
