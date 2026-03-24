-- ─── Operadoras: colunas de Brandguide estendidas ─────────────────────────────
-- Adiciona Background, Textos, Ícones e 4 cores adicionais.
-- Todas as colunas são nullable; operadoras existentes continuam sem alteração.

ALTER TABLE operadoras
  ADD COLUMN IF NOT EXISTS cor_background   text,
  ADD COLUMN IF NOT EXISTS cor_textos       text,
  ADD COLUMN IF NOT EXISTS cor_icones       text,
  ADD COLUMN IF NOT EXISTS cor_adicional_1  text,
  ADD COLUMN IF NOT EXISTS cor_adicional_2  text,
  ADD COLUMN IF NOT EXISTS cor_adicional_3  text,
  ADD COLUMN IF NOT EXISTS cor_adicional_4  text;

COMMENT ON COLUMN operadoras.cor_background  IS 'Cor de fundo do brand';
COMMENT ON COLUMN operadoras.cor_textos      IS 'Cor principal dos textos';
COMMENT ON COLUMN operadoras.cor_icones      IS 'Cor dos ícones';
COMMENT ON COLUMN operadoras.cor_adicional_1 IS 'Cor adicional 1 (uso livre)';
COMMENT ON COLUMN operadoras.cor_adicional_2 IS 'Cor adicional 2 (uso livre)';
COMMENT ON COLUMN operadoras.cor_adicional_3 IS 'Cor adicional 3 (uso livre)';
COMMENT ON COLUMN operadoras.cor_adicional_4 IS 'Cor adicional 4 (uso livre)';
