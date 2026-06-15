-- Pipeline B2B — integração cron import SPA/MF + meta de hash + índice único marca/empresa.

BEGIN;

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'comercial_spa_lista',
  'Pipeline B2B — Lista SPA/MF',
  'Importação diária do CSV oficial de empresas autorizadas (Edge sync-comercial-spa-lista).',
  true
)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.comercial_spa_sync_meta (
  id                   int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content_hash         text,
  csv_url              text,
  lista_atualizada_em  text,
  blocos_parseados     int,
  marcas_parseadas     int,
  synced_at            timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comercial_spa_sync_meta IS
  'Último sync da lista SPA/MF (hash do CSV). Singleton id=1; escrita via service role.';

ALTER TABLE public.comercial_spa_sync_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_spa_sync_meta_select ON public.comercial_spa_sync_meta;
CREATE POLICY comercial_spa_sync_meta_select ON public.comercial_spa_sync_meta
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));

GRANT SELECT ON public.comercial_spa_sync_meta TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS comercial_marcas_empresa_nome_lower_unique
  ON public.comercial_marcas (empresa_id, lower(trim(nome)));

COMMIT;
