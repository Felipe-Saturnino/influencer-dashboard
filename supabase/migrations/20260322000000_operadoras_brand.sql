-- ─── Operadoras: colunas de Brandguide (Fase 1) ───────────────────────────────
-- Permite que cada operadora tenha cores/logo próprios para operadores.
-- Todas as colunas são nullable; operadoras existentes continuam sem brand.

ALTER TABLE operadoras
  ADD COLUMN IF NOT EXISTS cor_primaria    text,
  ADD COLUMN IF NOT EXISTS cor_secundaria  text,
  ADD COLUMN IF NOT EXISTS cor_accent      text,
  ADD COLUMN IF NOT EXISTS logo_url        text;

COMMENT ON COLUMN operadoras.cor_primaria   IS 'Cor principal do brand (ex: #7c3aed)';
COMMENT ON COLUMN operadoras.cor_secundaria IS 'Cor secundária (ex: #4a2082)';
COMMENT ON COLUMN operadoras.cor_accent     IS 'Cor de destaque/accent (ex: #1e36f8)';
COMMENT ON COLUMN operadoras.logo_url       IS 'URL do logo da operadora';
