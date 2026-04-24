-- Cadastro de mesas ao vivo (Overview Spin / relatório): catálogo reutilizável na carga manual e integrações.
-- App: Plataforma → Gestão de Mesas (page_key gestao_mesas).

CREATE TABLE public.mesas_spin_cadastro (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_slug        text        NOT NULL REFERENCES public.operadoras (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  nome_mesa             text        NOT NULL,
  tipo_jogo             text        NOT NULL,
  numero_mesa           text,
  mesa_identificacao    text        NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mesas_spin_cadastro_nome_trim CHECK (btrim(nome_mesa) <> ''),
  CONSTRAINT mesas_spin_cadastro_tipo_trim CHECK (btrim(tipo_jogo) <> ''),
  CONSTRAINT mesas_spin_cadastro_ident_trim CHECK (btrim(mesa_identificacao) <> '')
);

CREATE UNIQUE INDEX ux_mesas_spin_cadastro_op_table_id
  ON public.mesas_spin_cadastro (operadora_slug, lower(btrim(mesa_identificacao)));

COMMENT ON TABLE public.mesas_spin_cadastro IS
  'Catálogo de mesas por operadora — nome, tipo de jogo, número e ID estável do fornecedor; usado na Gestão de Mesas e alinhado a relatorio_por_tabela.';
COMMENT ON COLUMN public.mesas_spin_cadastro.mesa_identificacao IS
  'Table ID / identificador canónico no fornecedor (único por operadora_slug, case-insensitive).';

CREATE INDEX idx_mesas_spin_cadastro_op_slug ON public.mesas_spin_cadastro (operadora_slug);
CREATE INDEX idx_mesas_spin_cadastro_tipo ON public.mesas_spin_cadastro (lower(tipo_jogo));

CREATE OR REPLACE FUNCTION public.mesas_spin_cadastro_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mesas_spin_cadastro_upd ON public.mesas_spin_cadastro;
CREATE TRIGGER trg_mesas_spin_cadastro_upd
  BEFORE UPDATE ON public.mesas_spin_cadastro
  FOR EACH ROW EXECUTE PROCEDURE public.mesas_spin_cadastro_touch_updated_at();

-- Escopo por operadora: admin/gestor vê tudo; executivo/operador só slugs em user_scopes.
CREATE OR REPLACE FUNCTION public._mesas_spin_cadastro_scope_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'gestor'))
      OR (
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role IN ('executivo', 'operador'))
        AND EXISTS (
          SELECT 1
          FROM public.user_scopes s
          WHERE s.user_id = auth.uid()
            AND s.scope_type = 'operadora'
            AND s.scope_ref = p_slug
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._mesas_spin_cadastro_scope_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._mesas_spin_cadastro_scope_slug(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._mesas_spin_cadastro_perm(p_need text)
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'gestao_mesas'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._mesas_spin_cadastro_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._mesas_spin_cadastro_perm(text) TO authenticated;

ALTER TABLE public.mesas_spin_cadastro ENABLE ROW LEVEL SECURITY;

CREATE POLICY mesas_spin_cadastro_select
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('view')
  );

CREATE POLICY mesas_spin_cadastro_insert
  ON public.mesas_spin_cadastro FOR INSERT TO authenticated
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('create')
  );

CREATE POLICY mesas_spin_cadastro_update
  ON public.mesas_spin_cadastro FOR UPDATE TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('edit')
  )
  WITH CHECK (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('edit')
  );

CREATE POLICY mesas_spin_cadastro_delete
  ON public.mesas_spin_cadastro FOR DELETE TO authenticated
  USING (
    public._mesas_spin_cadastro_scope_slug(operadora_slug)
    AND public._mesas_spin_cadastro_perm('delete')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesas_spin_cadastro TO authenticated;

-- Permissões de menu e escopo gestor/operadora (espelha Gestão de Operadoras quando existir).
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'gestao_mesas', can_view, can_criar, can_editar,
  CASE
    WHEN can_excluir IN ('sim', 'proprios') THEN can_excluir
    WHEN can_editar IN ('sim', 'proprios') THEN can_editar
    ELSE can_excluir
  END
FROM public.role_permissions
WHERE page_key = 'gestao_operadoras'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
SELECT gtp.gestor_tipo_slug, 'gestao_mesas'
FROM public.gestor_tipo_pages gtp
WHERE gtp.page_key = 'gestao_operadoras'
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('operacoes', 'gestao_mesas')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT op.operadora_slug, 'gestao_mesas'
FROM public.operadora_pages op
WHERE op.page_key = 'gestao_operadoras'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

-- Garante admin com acesso total mesmo se não houver linhas espelhadas.
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
VALUES ('admin', 'gestao_mesas', 'sim', 'sim', 'sim', 'sim')
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = 'sim',
  can_criar   = 'sim',
  can_editar  = 'sim',
  can_excluir = 'sim';
