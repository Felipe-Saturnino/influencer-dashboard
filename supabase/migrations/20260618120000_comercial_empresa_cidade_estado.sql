-- Pipeline B2B — cidade/UF da sede (enriquecimento por CNPJ em comercial_empresas).
-- Marcas herdam via empresa_id; sem alteração de UI nesta fase.

BEGIN;

ALTER TABLE public.comercial_empresas
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cnpj_enriquecido_em timestamptz;

COMMENT ON COLUMN public.comercial_empresas.cidade IS
  'Município da sede (Receita / enriquecimento CNPJ). Compartilhado por todas as marcas do CNPJ.';
COMMENT ON COLUMN public.comercial_empresas.estado IS
  'UF da sede (2 letras). Compartilhado por todas as marcas do CNPJ.';
COMMENT ON COLUMN public.comercial_empresas.cnpj_enriquecido_em IS
  'Última consulta de enriquecimento cadastral (Edge enrich-comercial-cnpj).';

CREATE INDEX IF NOT EXISTS idx_comercial_empresas_cnpj_enriquecimento_pendente
  ON public.comercial_empresas (created_at)
  WHERE cnpj_enriquecido_em IS NULL;

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'comercial_cnpj_enriquecimento',
  'Pipeline B2B — Enriquecimento CNPJ',
  'Consulta cadastral (cidade/UF da sede) por CNPJ das empresas do pipeline (Edge enrich-comercial-cnpj).',
  true
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
