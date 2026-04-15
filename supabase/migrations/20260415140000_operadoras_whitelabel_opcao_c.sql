-- Whitelabel Opção C: colunas de brand renomeadas e accent/ícone removidos do cadastro.
-- Ordem: contrast ← secundária; preencher a partir de accent se vazio; remover accent; renomear demais.

ALTER TABLE public.operadoras RENAME COLUMN cor_secundaria TO brand_contrast;

UPDATE public.operadoras
SET brand_contrast = cor_accent
WHERE (brand_contrast IS NULL OR btrim(brand_contrast) = '')
  AND cor_accent IS NOT NULL
  AND btrim(cor_accent) <> '';

ALTER TABLE public.operadoras DROP COLUMN IF EXISTS cor_accent;

ALTER TABLE public.operadoras RENAME COLUMN cor_primaria TO brand_action;
ALTER TABLE public.operadoras RENAME COLUMN cor_background TO brand_bg;
ALTER TABLE public.operadoras RENAME COLUMN cor_textos TO brand_text;

ALTER TABLE public.operadoras DROP COLUMN IF EXISTS cor_icones;

COMMENT ON COLUMN public.operadoras.brand_action IS 'Cor de ação (CTAs, títulos, destaque principal)';
COMMENT ON COLUMN public.operadoras.brand_contrast IS 'Cor de contraste (comparativos, suporte visual vs ação)';
COMMENT ON COLUMN public.operadoras.brand_bg IS 'Fundo da aplicação (modo operador)';
COMMENT ON COLUMN public.operadoras.brand_text IS 'Texto principal sobre o fundo';
