-- Comercial — Pipeline B2B (empresas, marcas, contatos, produtos, anotações, histórico).

BEGIN;

CREATE OR REPLACE FUNCTION public._comercial_pipeline_b2b_perm(p_need text)
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
      OR public._gestor_page_perm('comercial_pipeline_b2b', p_need)
      OR public._prestador_page_perm('comercial_pipeline_b2b', p_need)
      OR public._staff_spin_page_perm('comercial_pipeline_b2b', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'comercial_pipeline_b2b'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._comercial_pipeline_b2b_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comercial_pipeline_b2b_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.comercial_empresas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social         text        NOT NULL,
  cnpj                 text        NOT NULL,
  portaria             text,
  portaria_retificacoes jsonb       NOT NULL DEFAULT '[]'::jsonb,
  requerimento_numero  text,
  requerimento_ano     text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comercial_empresas_cnpj_unique UNIQUE (cnpj)
);

CREATE TABLE IF NOT EXISTS public.comercial_marcas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid        NOT NULL REFERENCES public.comercial_empresas (id) ON DELETE CASCADE,
  nome                 text        NOT NULL,
  dominio              text,
  status_dominio       text        NOT NULL DEFAULT 'inativo'
    CHECK (status_dominio IN ('ok', 'inativo')),
  status_pipeline      text        NOT NULL DEFAULT 'disponiveis'
    CHECK (status_pipeline IN ('disponiveis', 'conexao', 'negociacao', 'fechado')),
  status_folha         text        NOT NULL DEFAULT 'sem_contato',
  comercial_user_id    uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  ultima_comunicacao   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_marcas_empresa ON public.comercial_marcas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_comercial_marcas_pipeline ON public.comercial_marcas (status_pipeline);
CREATE INDEX IF NOT EXISTS idx_comercial_marcas_folha ON public.comercial_marcas (status_folha);
CREATE INDEX IF NOT EXISTS idx_comercial_marcas_comercial ON public.comercial_marcas (comercial_user_id);

CREATE TABLE IF NOT EXISTS public.comercial_marca_contatos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id         uuid        NOT NULL REFERENCES public.comercial_marcas (id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  telefones        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  emails           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  linkedin         text,
  instagram        text,
  data_nascimento  date,
  ordem            int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_contatos_marca ON public.comercial_marca_contatos (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_marca_produtos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        uuid NOT NULL REFERENCES public.comercial_marcas (id) ON DELETE CASCADE,
  produto         text NOT NULL CHECK (produto IN ('mesa_dedicada', 'mesa_network')),
  status_produto  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comercial_marca_produtos_unique UNIQUE (marca_id, produto)
);

CREATE INDEX IF NOT EXISTS idx_comercial_produtos_marca ON public.comercial_marca_produtos (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_marca_anotacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id    uuid NOT NULL REFERENCES public.comercial_marcas (id) ON DELETE CASCADE,
  usuario_id  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  texto       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_anot_marca ON public.comercial_marca_anotacoes (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_marca_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id      uuid NOT NULL REFERENCES public.comercial_marcas (id) ON DELETE CASCADE,
  usuario_id    uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  campo         text NOT NULL,
  valor_anterior text,
  valor_novo    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_hist_marca ON public.comercial_marca_historico (marca_id);

CREATE OR REPLACE FUNCTION public.comercial_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comercial_empresas_updated ON public.comercial_empresas;
CREATE TRIGGER trg_comercial_empresas_updated
  BEFORE UPDATE ON public.comercial_empresas
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

DROP TRIGGER IF EXISTS trg_comercial_marcas_updated ON public.comercial_marcas;
CREATE TRIGGER trg_comercial_marcas_updated
  BEFORE UPDATE ON public.comercial_marcas
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

DROP TRIGGER IF EXISTS trg_comercial_contatos_updated ON public.comercial_marca_contatos;
CREATE TRIGGER trg_comercial_contatos_updated
  BEFORE UPDATE ON public.comercial_marca_contatos
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

ALTER TABLE public.comercial_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_marca_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_marca_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_marca_anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_marca_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY comercial_empresas_select ON public.comercial_empresas FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_empresas_insert ON public.comercial_empresas FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('create'));
CREATE POLICY comercial_empresas_update ON public.comercial_empresas FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('edit')) WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_empresas_delete ON public.comercial_empresas FOR DELETE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('delete'));

CREATE POLICY comercial_marcas_select ON public.comercial_marcas FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_marcas_insert ON public.comercial_marcas FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('create'));
CREATE POLICY comercial_marcas_update ON public.comercial_marcas FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('edit')) WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_marcas_delete ON public.comercial_marcas FOR DELETE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('delete'));

CREATE POLICY comercial_contatos_select ON public.comercial_marca_contatos FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_contatos_insert ON public.comercial_marca_contatos FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_contatos_update ON public.comercial_marca_contatos FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('edit')) WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_contatos_delete ON public.comercial_marca_contatos FOR DELETE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('delete'));

CREATE POLICY comercial_produtos_select ON public.comercial_marca_produtos FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_produtos_insert ON public.comercial_marca_produtos FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_produtos_update ON public.comercial_marca_produtos FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('edit')) WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_produtos_delete ON public.comercial_marca_produtos FOR DELETE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('edit'));

CREATE POLICY comercial_anot_select ON public.comercial_marca_anotacoes FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_anot_insert ON public.comercial_marca_anotacoes FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));
CREATE POLICY comercial_anot_delete ON public.comercial_marca_anotacoes FOR DELETE TO authenticated
  USING (public._comercial_pipeline_b2b_perm('delete'));

CREATE POLICY comercial_hist_select ON public.comercial_marca_historico FOR SELECT TO authenticated
  USING (public._comercial_pipeline_b2b_perm('view'));
CREATE POLICY comercial_hist_insert ON public.comercial_marca_historico FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_b2b_perm('edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_marcas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_marca_contatos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_marca_produtos TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.comercial_marca_anotacoes TO authenticated;
GRANT SELECT, INSERT ON public.comercial_marca_historico TO authenticated;

-- Permissões iniciais: Não para todos os perfis (admin ignora matriz no app)
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'comercial_pipeline_b2b', 'nao', 'nao', 'nao', 'nao'
FROM (SELECT unnest(ARRAY['gestor', 'operador', 'agencia', 'influencer', 'afiliado', 'investidor', 'executivo', 'prestador']::text[]) AS role) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT DISTINCT gt.gestor_tipo_slug, 'comercial_pipeline_b2b'
FROM public.gestor_tipo_pages gt
WHERE gt.page_key = 'campanhas'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'comercial_pipeline_b2b'
FROM public.operadora_pages op
WHERE op.page_key = 'campanhas'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

-- Seed demo (idempotente por CNPJ + nome marca)
DO $$
DECLARE
  v_emp_verde uuid;
  v_emp_blaze uuid;
  v_emp_royal uuid;
  v_m_verde uuid;
  v_m_sorte uuid;
BEGIN
  INSERT INTO public.comercial_empresas (razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano)
  VALUES (
    'Grupo Aposta Verde LTDA', '12.345.678/0001-90',
    'Portaria SPA/MF nº 1.234, de 15 de março de 2024',
    '["Retificação nº 56, de 10 de janeiro de 2025", "Retificação nº 89, de 22 de abril de 2026"]'::jsonb,
    '789456', '2023'
  )
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social
  RETURNING id INTO v_emp_verde;

  IF v_emp_verde IS NULL THEN
    SELECT id INTO v_emp_verde FROM public.comercial_empresas WHERE cnpj = '12.345.678/0001-90';
  END IF;

  INSERT INTO public.comercial_marcas (empresa_id, nome, dominio, status_dominio, status_pipeline, status_folha, ultima_comunicacao)
  SELECT v_emp_verde, 'Verde Cassino', 'https://verdecassino.bet', 'ok', 'negociacao', 'neg_interessado', '2026-06-08'::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM public.comercial_marcas WHERE empresa_id = v_emp_verde AND nome = 'Verde Cassino');

  SELECT id INTO v_m_verde FROM public.comercial_marcas m
  WHERE m.empresa_id = v_emp_verde AND m.nome = 'Verde Cassino';

  INSERT INTO public.comercial_marcas (empresa_id, nome, dominio, status_dominio, status_pipeline, status_folha)
  SELECT v_emp_verde, 'Sorte Grande', NULL, 'inativo', 'disponiveis', 'sem_contato'
  WHERE NOT EXISTS (SELECT 1 FROM public.comercial_marcas WHERE empresa_id = v_emp_verde AND nome = 'Sorte Grande');

  SELECT id INTO v_m_sorte FROM public.comercial_marcas m
  WHERE m.empresa_id = v_emp_verde AND m.nome = 'Sorte Grande';

  IF v_m_verde IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.comercial_marca_contatos WHERE marca_id = v_m_verde) THEN
    INSERT INTO public.comercial_marca_contatos (marca_id, nome, telefones, emails, linkedin, instagram, data_nascimento, ordem)
    VALUES
      (v_m_verde, 'Marcos Oliveira', '[{"iso":"BR","ddi":"+55","numero":"(11) 98765-4321"}]'::jsonb, '["marcos@verdecassino.bet"]'::jsonb, 'https://linkedin.com/in/marcos-oliveira', '@marcos.verde', '1988-03-15', 0),
      (v_m_verde, 'Julia Comercial', '[{"iso":"BR","ddi":"+55","numero":"(11) 91234-5678"}]'::jsonb, '["julia@verdecassino.bet"]'::jsonb, NULL, NULL, NULL, 1);
    INSERT INTO public.comercial_marca_produtos (marca_id, produto, status_produto) VALUES
      (v_m_verde, 'mesa_dedicada', 'em_negociacao'),
      (v_m_verde, 'mesa_network', 'sem_proposta');
  END IF;

  INSERT INTO public.comercial_empresas (razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano)
  VALUES ('Blaze Gaming Brasil SA', '98.765.432/0001-11', 'Portaria SPA/MF nº 567, de 8 de junho de 2022', '[]'::jsonb, '334455', '2021')
  ON CONFLICT (cnpj) DO UPDATE SET razao_social = EXCLUDED.razao_social
  RETURNING id INTO v_emp_blaze;

  IF v_emp_blaze IS NULL THEN
    SELECT id INTO v_emp_blaze FROM public.comercial_empresas WHERE cnpj = '98.765.432/0001-11';
  END IF;

  INSERT INTO public.comercial_marcas (empresa_id, nome, dominio, status_dominio, status_pipeline, status_folha, ultima_comunicacao)
  SELECT v_emp_blaze, 'Blaze Bet', 'https://blaze.bet.br', 'ok', 'conexao', 'conexao_realizada', '2026-06-05'::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM public.comercial_marcas WHERE empresa_id = v_emp_blaze AND nome = 'Blaze Bet');

  INSERT INTO public.comercial_empresas (razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano)
  VALUES ('Royal Entertainment LTDA', '45.678.901/0001-22', 'Portaria SPA/MF nº 890, de 3 de novembro de 2023', '["Retificação nº 12, de 5 de fevereiro de 2025"]'::jsonb, '112233', '2022')
  ON CONFLICT (cnpj) DO NOTHING;
END $$;

COMMIT;
