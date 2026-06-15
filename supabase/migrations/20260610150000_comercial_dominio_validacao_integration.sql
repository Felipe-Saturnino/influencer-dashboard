-- Pipeline B2B — integração cron validação HTTP de domínios das marcas.

BEGIN;

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'comercial_dominio_validacao',
  'Pipeline B2B — Validação de domínios',
  'Verificação diária HTTP dos domínios das marcas (Edge validate-comercial-dominios).',
  true
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
