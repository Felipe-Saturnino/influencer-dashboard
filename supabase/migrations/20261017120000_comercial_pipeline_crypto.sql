-- Pipeline Crypto — marcas, contatos, anotações e histórico independentes do B2B.
-- Empresas da Lista SPA continuam em comercial_empresas (somente leitura aqui).

BEGIN;

CREATE OR REPLACE FUNCTION public._comercial_pipeline_crypto_perm(p_need text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR public._gestor_page_perm('comercial_pipeline_crypto', p_need)
      OR public._prestador_page_perm('comercial_pipeline_crypto', p_need)
      OR public._staff_spin_page_perm('comercial_pipeline_crypto', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role::text <> ALL (public._gestor_departamento_roles())
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'comercial_pipeline_crypto'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._comercial_pipeline_crypto_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comercial_pipeline_crypto_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.comercial_crypto_marcas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid REFERENCES public.comercial_empresas (id) ON DELETE SET NULL,
  razao_social         text,
  cnpj                 text,
  nome                 text        NOT NULL,
  dominio              text,
  status_dominio       text        NOT NULL DEFAULT 'inativo'
    CHECK (status_dominio IN ('ok', 'inativo')),
  status_pipeline      text        NOT NULL DEFAULT 'disponiveis'
    CHECK (status_pipeline IN ('disponiveis', 'conexao', 'negociacao', 'fechado')),
  status_folha         text        NOT NULL DEFAULT 'sem_contato',
  comercial_user_id    uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  possui_crypto        text        CHECK (possui_crypto IS NULL OR possui_crypto IN ('sim', 'nao')),
  retorno              text        CHECK (
    retorno IS NULL OR retorno IN (
      'sem_proposta', 'em_negociacao', 'sem_interesse', 'desinteresse_comercial',
      'contrato_enviado', 'contrato_assinado', 'ativo'
    )
  ),
  ultima_comunicacao   date,
  origem               text        NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('spa', 'manual')),
  spa_marca_id         uuid        REFERENCES public.comercial_marcas (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comercial_crypto_marcas_spa_marca_unique
  ON public.comercial_crypto_marcas (spa_marca_id)
  WHERE spa_marca_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_marcas_empresa
  ON public.comercial_crypto_marcas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_marcas_pipeline
  ON public.comercial_crypto_marcas (status_pipeline);

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_marcas_comercial
  ON public.comercial_crypto_marcas (comercial_user_id);

CREATE TABLE IF NOT EXISTS public.comercial_crypto_contatos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id         uuid        NOT NULL REFERENCES public.comercial_crypto_marcas (id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  telefones        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  emails           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  linkedin         text,
  instagram        text,
  data_nascimento  date,
  ordem            integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_contatos_marca
  ON public.comercial_crypto_contatos (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_crypto_anotacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    uuid        NOT NULL REFERENCES public.comercial_crypto_marcas (id) ON DELETE CASCADE,
  texto       text        NOT NULL,
  usuario_id  uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_anotacoes_marca
  ON public.comercial_crypto_anotacoes (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_crypto_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id       uuid        NOT NULL REFERENCES public.comercial_crypto_marcas (id) ON DELETE CASCADE,
  usuario_id     uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  campo          text        NOT NULL,
  valor_anterior text,
  valor_novo     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_crypto_historico_marca
  ON public.comercial_crypto_historico (marca_id);

DROP TRIGGER IF EXISTS trg_comercial_crypto_marcas_updated ON public.comercial_crypto_marcas;
CREATE TRIGGER trg_comercial_crypto_marcas_updated
  BEFORE UPDATE ON public.comercial_crypto_marcas
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

ALTER TABLE public.comercial_crypto_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_crypto_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_crypto_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_crypto_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_crypto_marcas_select ON public.comercial_crypto_marcas;
DROP POLICY IF EXISTS comercial_crypto_marcas_insert ON public.comercial_crypto_marcas;
DROP POLICY IF EXISTS comercial_crypto_marcas_update ON public.comercial_crypto_marcas;
DROP POLICY IF EXISTS comercial_crypto_marcas_delete ON public.comercial_crypto_marcas;
DROP POLICY IF EXISTS comercial_crypto_contatos_select ON public.comercial_crypto_contatos;
DROP POLICY IF EXISTS comercial_crypto_contatos_insert ON public.comercial_crypto_contatos;
DROP POLICY IF EXISTS comercial_crypto_contatos_update ON public.comercial_crypto_contatos;
DROP POLICY IF EXISTS comercial_crypto_contatos_delete ON public.comercial_crypto_contatos;
DROP POLICY IF EXISTS comercial_crypto_anot_select ON public.comercial_crypto_anotacoes;
DROP POLICY IF EXISTS comercial_crypto_anot_insert ON public.comercial_crypto_anotacoes;
DROP POLICY IF EXISTS comercial_crypto_hist_select ON public.comercial_crypto_historico;
DROP POLICY IF EXISTS comercial_crypto_hist_insert ON public.comercial_crypto_historico;
DROP POLICY IF EXISTS comercial_crypto_overview_marcas_select ON public.comercial_crypto_marcas;
DROP POLICY IF EXISTS comercial_crypto_overview_contatos_select ON public.comercial_crypto_contatos;
DROP POLICY IF EXISTS comercial_crypto_overview_hist_select ON public.comercial_crypto_historico;
DROP POLICY IF EXISTS comercial_empresas_select_crypto ON public.comercial_empresas;

CREATE POLICY comercial_crypto_marcas_select ON public.comercial_crypto_marcas
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_crypto_perm('view'));
CREATE POLICY comercial_crypto_marcas_insert ON public.comercial_crypto_marcas
  FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_crypto_perm('create'));
CREATE POLICY comercial_crypto_marcas_update ON public.comercial_crypto_marcas
  FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_crypto_perm('edit'))
  WITH CHECK (public._comercial_pipeline_crypto_perm('edit'));
CREATE POLICY comercial_crypto_marcas_delete ON public.comercial_crypto_marcas
  FOR DELETE TO authenticated
  USING (public._comercial_pipeline_crypto_perm('delete'));

CREATE POLICY comercial_crypto_contatos_select ON public.comercial_crypto_contatos
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_crypto_perm('view'));
CREATE POLICY comercial_crypto_contatos_insert ON public.comercial_crypto_contatos
  FOR INSERT TO authenticated
  WITH CHECK (
    public._comercial_pipeline_crypto_perm('create')
    OR public._comercial_pipeline_crypto_perm('edit')
  );
CREATE POLICY comercial_crypto_contatos_update ON public.comercial_crypto_contatos
  FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_crypto_perm('edit'))
  WITH CHECK (public._comercial_pipeline_crypto_perm('edit'));
CREATE POLICY comercial_crypto_contatos_delete ON public.comercial_crypto_contatos
  FOR DELETE TO authenticated
  USING (public._comercial_pipeline_crypto_perm('edit'));

CREATE POLICY comercial_crypto_anot_select ON public.comercial_crypto_anotacoes
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_crypto_perm('view'));
CREATE POLICY comercial_crypto_anot_insert ON public.comercial_crypto_anotacoes
  FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_crypto_perm('edit'));

CREATE POLICY comercial_crypto_hist_select ON public.comercial_crypto_historico
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_crypto_perm('view'));
CREATE POLICY comercial_crypto_hist_insert ON public.comercial_crypto_historico
  FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_crypto_perm('edit'));

-- Overview Comercial lê o funil crypto sem permissão da página Pipeline Crypto.
CREATE POLICY comercial_crypto_overview_marcas_select ON public.comercial_crypto_marcas
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));
CREATE POLICY comercial_crypto_overview_contatos_select ON public.comercial_crypto_contatos
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));
CREATE POLICY comercial_crypto_overview_hist_select ON public.comercial_crypto_historico
  FOR SELECT TO authenticated
  USING (public._comercial_overview_perm('view'));

-- Quem vê o Pipeline Crypto lê a lista SPA de empresas (sem escrita).
CREATE POLICY comercial_empresas_select_crypto ON public.comercial_empresas
  FOR SELECT TO authenticated
  USING (public._comercial_pipeline_crypto_perm('view'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_crypto_marcas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_crypto_contatos TO authenticated;
GRANT SELECT, INSERT ON public.comercial_crypto_anotacoes TO authenticated;
GRANT SELECT, INSERT ON public.comercial_crypto_historico TO authenticated;

COMMENT ON TABLE public.comercial_crypto_marcas IS
  'Pipeline Crypto. Cópia de identidade das marcas SPA (origem=spa) e marcas manuais (origem=manual). Funil, comercial e datas não espelham o Pipeline B2B.';
COMMENT ON COLUMN public.comercial_crypto_marcas.possui_crypto IS 'sim | nao | null (em branco). Não altera o Status.';
COMMENT ON COLUMN public.comercial_crypto_marcas.retorno IS 'Mesmos status de produto do Network. Só esta coluna dispara a cascata de Status.';
COMMENT ON COLUMN public.comercial_crypto_marcas.origem IS 'spa = espelhada da Lista SPA; manual = Nova Marca, exclusiva do Crypto.';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'comercial_pipeline_crypto', 'nao', 'nao', 'nao', 'nao'
FROM public.role_permissions rp
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'comercial_pipeline_crypto'
FROM public.operadora_pages op
WHERE op.page_key = 'comercial_pipeline_b2b'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

-- Cópia única de identidade das marcas já existentes no B2B. Não copia funil nem comercial.
INSERT INTO public.comercial_crypto_marcas (
  empresa_id,
  spa_marca_id,
  nome,
  dominio,
  status_dominio,
  origem,
  status_pipeline,
  status_folha,
  created_at
)
SELECT
  m.empresa_id,
  m.id,
  m.nome,
  m.dominio,
  m.status_dominio,
  'spa',
  'disponiveis',
  'sem_contato',
  m.created_at
FROM public.comercial_marcas m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.comercial_crypto_marcas c
  WHERE c.spa_marca_id = m.id
);

COMMIT;
