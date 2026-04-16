-- ─── RH — Cadastro de funcionários (base para folha/benefícios futuros) ───────
-- CPF armazenado somente com dígitos (único). Soft delete: status + data_desligamento.
-- RLS: admin ou role_permissions(rh_funcionarios). SELECT/INSERT/UPDATE; sem DELETE.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_funcionarios (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                 text        NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo')),
  nome                   text        NOT NULL,
  rg                     text        NOT NULL,
  cpf                    text        NOT NULL,
  telefone               text        NOT NULL,
  email                  text        NOT NULL,
  endereco_residencial   text        NOT NULL,
  contato_emergencia     text        NOT NULL,
  setor                  text        NOT NULL,
  cargo                  text        NOT NULL,
  nivel                  text        NOT NULL,
  salario                numeric(14, 2) NOT NULL,
  data_inicio            date        NOT NULL,
  data_desligamento      date,
  escala                 text        NOT NULL,
  tipo_contrato          text        NOT NULL
    CHECK (tipo_contrato IN ('CLT', 'PJ', 'Estagio', 'Temporario')),
  nome_empresa           text        NOT NULL,
  cnpj                   text        NOT NULL,
  endereco_empresa       text        NOT NULL,
  banco                  text        NOT NULL,
  agencia                text        NOT NULL,
  conta_corrente         text        NOT NULL,
  pix                    text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid,
  updated_by             uuid,
  CONSTRAINT rh_funcionarios_cpf_digits CHECK (char_length(cpf) = 11 AND cpf ~ '^[0-9]+$'),
  CONSTRAINT rh_funcionarios_cnpj_digits CHECK (char_length(cnpj) = 14 AND cnpj ~ '^[0-9]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS rh_funcionarios_cpf_unique ON public.rh_funcionarios (cpf);

CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_status ON public.rh_funcionarios (status);
CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_nome ON public.rh_funcionarios (lower(nome));
CREATE INDEX IF NOT EXISTS idx_rh_funcionarios_setor ON public.rh_funcionarios (lower(setor));

CREATE OR REPLACE FUNCTION public.rh_funcionarios_audit_ins()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at := coalesce(NEW.created_at, now());
  NEW.updated_at := now();
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_funcionarios_audit_upd()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionarios_ins ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_funcionarios_ins
  BEFORE INSERT ON public.rh_funcionarios
  FOR EACH ROW EXECUTE PROCEDURE public.rh_funcionarios_audit_ins();

DROP TRIGGER IF EXISTS trg_rh_funcionarios_upd ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_funcionarios_upd
  BEFORE UPDATE ON public.rh_funcionarios
  FOR EACH ROW EXECUTE PROCEDURE public.rh_funcionarios_audit_upd();

CREATE OR REPLACE FUNCTION public._rh_funcionario_perm(p_need text)
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
          AND rp.page_key = 'rh_funcionarios'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_funcionario_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_funcionario_perm(text) TO authenticated;

ALTER TABLE public.rh_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_funcionarios_select
  ON public.rh_funcionarios FOR SELECT TO authenticated
  USING (public._rh_funcionario_perm('view'));

CREATE POLICY rh_funcionarios_insert
  ON public.rh_funcionarios FOR INSERT TO authenticated
  WITH CHECK (public._rh_funcionario_perm('create'));

CREATE POLICY rh_funcionarios_update
  ON public.rh_funcionarios FOR UPDATE TO authenticated
  USING (public._rh_funcionario_perm('edit'))
  WITH CHECK (public._rh_funcionario_perm('edit'));

REVOKE DELETE ON TABLE public.rh_funcionarios FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.rh_funcionarios TO authenticated;

COMMENT ON TABLE public.rh_funcionarios IS 'RH — cadastro de funcionários; CPF 11 dígitos único; sem DELETE físico (soft delete).';

-- Permissões de menu: espelha Figurinos (RH)
INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_funcionarios', can_view, can_criar, can_editar, can_excluir
FROM public.role_permissions
WHERE page_key = 'rh_figurinos'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

-- Gestores com tipo Recursos Humanos enxergam a página (aba Gestores pode refinar N:N)
INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_funcionarios')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

-- Operadores não recebem em operadora_pages (dado interno de RH; só admin/gestor com escopo)

COMMIT;
