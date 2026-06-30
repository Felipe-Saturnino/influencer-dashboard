-- RH — Solicitações (atestado, vagas) + permissões page_key rh_solicitacoes

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_solicitacoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rh_funcionario_id     uuid        NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  tipo                  text        NOT NULL
    CHECK (tipo IN ('atestado', 'vagas')),
  status                text        NOT NULL DEFAULT 'em_analise'
    CHECK (status IN ('em_analise', 'aprovado', 'rejeitado')),
  descricao             text        NOT NULL DEFAULT '',
  observacao_rh         text,
  motivo_rejeicao       text,
  atestado_inicio       date,
  atestado_fim          date,
  atestado_storage_path text,
  atestado_file_name    text,
  rh_vaga_id            uuid        REFERENCES public.rh_vagas (id) ON DELETE SET NULL,
  atendido_em           timestamptz,
  atendido_por          uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rh_solicitacoes_status ON public.rh_solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_rh_solicitacoes_tipo ON public.rh_solicitacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_rh_solicitacoes_created_at ON public.rh_solicitacoes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rh_solicitacoes_funcionario ON public.rh_solicitacoes (rh_funcionario_id);

DROP TRIGGER IF EXISTS trg_rh_solicitacoes_upd ON public.rh_solicitacoes;
CREATE TRIGGER trg_rh_solicitacoes_upd
  BEFORE UPDATE ON public.rh_solicitacoes
  FOR EACH ROW EXECUTE PROCEDURE public.rh_org_set_updated_at();

CREATE OR REPLACE FUNCTION public._rh_solicitacoes_perm(p_need text)
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
          AND rp.page_key = 'rh_solicitacoes'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_solicitacoes_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_solicitacoes_perm(text) TO authenticated;

CREATE OR REPLACE FUNCTION public._rh_solicitacoes_view_row(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public._rh_solicitacoes_perm('view')
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_view = 'sim'
      )
      OR public._rh_funcionario_vinculado_ao_login(p_funcionario_id)
    );
$$;

REVOKE ALL ON FUNCTION public._rh_solicitacoes_view_row(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_solicitacoes_view_row(uuid) TO authenticated;

ALTER TABLE public.rh_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_solicitacoes_select ON public.rh_solicitacoes FOR SELECT TO authenticated
  USING (public._rh_solicitacoes_view_row(rh_funcionario_id));

CREATE POLICY rh_solicitacoes_insert ON public.rh_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    public._rh_solicitacoes_perm('create')
    AND public._rh_funcionario_vinculado_ao_login(rh_funcionario_id)
  );

CREATE POLICY rh_solicitacoes_update ON public.rh_solicitacoes FOR UPDATE TO authenticated
  USING (public._rh_solicitacoes_perm('edit'))
  WITH CHECK (public._rh_solicitacoes_perm('edit'));

REVOKE DELETE ON TABLE public.rh_solicitacoes FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rh_solicitacoes TO authenticated;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT role, 'rh_solicitacoes', 'nao', NULL, NULL, NULL
FROM public.role_permissions
WHERE page_key = 'rh_organograma'
ON CONFLICT (role, page_key) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_criar   = EXCLUDED.can_criar,
  can_editar  = EXCLUDED.can_editar,
  can_excluir = EXCLUDED.can_excluir;

INSERT INTO public.gestor_tipo_pages (gestor_tipo_slug, page_key)
VALUES ('recursos_humanos', 'rh_solicitacoes')
ON CONFLICT (gestor_tipo_slug, page_key) DO NOTHING;

COMMENT ON TABLE public.rh_solicitacoes IS
  'RH — solicitações de prestadores (atestado médico, vagas internas). Gestão em rh_solicitacoes.';

COMMIT;
