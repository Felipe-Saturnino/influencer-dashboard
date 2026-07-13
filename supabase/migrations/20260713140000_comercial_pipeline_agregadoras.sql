-- Comercial — Pipeline Agregadoras (catálogo + histórico + permissões).

BEGIN;

CREATE OR REPLACE FUNCTION public._comercial_pipeline_agregadoras_perm(p_need text)
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
      OR public._gestor_page_perm('comercial_pipeline_agregadoras', p_need)
      OR public._prestador_page_perm('comercial_pipeline_agregadoras', p_need)
      OR public._staff_spin_page_perm('comercial_pipeline_agregadoras', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role::text <> ALL (public._gestor_departamento_roles())
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'comercial_pipeline_agregadoras'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._comercial_pipeline_agregadoras_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comercial_pipeline_agregadoras_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.comercial_agregadoras (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text        NOT NULL,
  site               text        NOT NULL,
  jogos              integer     CHECK (jogos IS NULL OR jogos >= 0),
  status_pipeline    text        NOT NULL DEFAULT 'conexao'
    CHECK (status_pipeline IN ('disponiveis', 'conexao', 'negociacao', 'fechado')),
  comercial_user_id  uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  ultimo_contato     date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comercial_agregadoras_nome_unique
  ON public.comercial_agregadoras (lower(trim(nome)));

CREATE INDEX IF NOT EXISTS idx_comercial_agregadoras_pipeline
  ON public.comercial_agregadoras (status_pipeline);

CREATE INDEX IF NOT EXISTS idx_comercial_agregadoras_comercial
  ON public.comercial_agregadoras (comercial_user_id);

CREATE TABLE IF NOT EXISTS public.comercial_agregadora_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agregadora_id  uuid NOT NULL REFERENCES public.comercial_agregadoras (id) ON DELETE CASCADE,
  usuario_id     uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  campo          text NOT NULL,
  valor_anterior text,
  valor_novo     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_agregadora_hist
  ON public.comercial_agregadora_historico (agregadora_id);

DROP TRIGGER IF EXISTS trg_comercial_agregadoras_updated ON public.comercial_agregadoras;
CREATE TRIGGER trg_comercial_agregadoras_updated
  BEFORE UPDATE ON public.comercial_agregadoras
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

ALTER TABLE public.comercial_agregadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_agregadora_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_agregadoras_select ON public.comercial_agregadoras;
DROP POLICY IF EXISTS comercial_agregadoras_insert ON public.comercial_agregadoras;
DROP POLICY IF EXISTS comercial_agregadoras_update ON public.comercial_agregadoras;
DROP POLICY IF EXISTS comercial_agregadoras_delete ON public.comercial_agregadoras;
DROP POLICY IF EXISTS comercial_agregadora_hist_select ON public.comercial_agregadora_historico;
DROP POLICY IF EXISTS comercial_agregadora_hist_insert ON public.comercial_agregadora_historico;

CREATE POLICY comercial_agregadoras_select ON public.comercial_agregadoras FOR SELECT TO authenticated
  USING (public._comercial_pipeline_agregadoras_perm('view'));
CREATE POLICY comercial_agregadoras_insert ON public.comercial_agregadoras FOR INSERT TO authenticated
  WITH CHECK (public._comercial_pipeline_agregadoras_perm('create'));
CREATE POLICY comercial_agregadoras_update ON public.comercial_agregadoras FOR UPDATE TO authenticated
  USING (public._comercial_pipeline_agregadoras_perm('edit'))
  WITH CHECK (public._comercial_pipeline_agregadoras_perm('edit'));
CREATE POLICY comercial_agregadoras_delete ON public.comercial_agregadoras FOR DELETE TO authenticated
  USING (public._comercial_pipeline_agregadoras_perm('delete'));

CREATE POLICY comercial_agregadora_hist_select ON public.comercial_agregadora_historico FOR SELECT TO authenticated
  USING (public._comercial_pipeline_agregadoras_perm('view'));
CREATE POLICY comercial_agregadora_hist_insert ON public.comercial_agregadora_historico FOR INSERT TO authenticated
  WITH CHECK (
    public._comercial_pipeline_agregadoras_perm('edit')
    OR public._comercial_pipeline_agregadoras_perm('create')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_agregadoras TO authenticated;
GRANT SELECT, INSERT ON public.comercial_agregadora_historico TO authenticated;

COMMENT ON TABLE public.comercial_agregadoras IS
  'Pipeline Agregadoras — catálogo de prospecção B2B de agregadoras de jogos.';
COMMENT ON COLUMN public.comercial_agregadoras.status_pipeline IS
  'Funil: disponiveis | conexao | negociacao | fechado. Cadastro novo entra em conexao.';

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'comercial_pipeline_agregadoras', 'nao', 'nao', 'nao', 'nao'
FROM (
  SELECT unnest(ARRAY[
    'gestor_aquisicao',
    'gestor_marketing',
    'gestor_operacoes',
    'gestor_academy',
    'gestor_rh',
    'prestador',
    'executivo',
    'influencer',
    'afiliado',
    'operador',
    'agencia',
    'investidor',
    'shift_leader',
    'service_manager',
    'customer_service',
    'game_presenter',
    'shuffler',
    'tech_ops',
    'figurino',
    'comunicacao',
    'performance_coach',
    'rh'
  ]::text[]) AS role
) r
ON CONFLICT (role, page_key) DO NOTHING;

INSERT INTO public.operadora_pages (operadora_slug, page_key)
SELECT DISTINCT op.operadora_slug, 'comercial_pipeline_agregadoras'
FROM public.operadora_pages op
WHERE op.page_key = 'comercial_pipeline_b2b'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
