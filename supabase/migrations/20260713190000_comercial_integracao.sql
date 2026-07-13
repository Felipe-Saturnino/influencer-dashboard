-- Comercial — Integração (pós Contrato Assinado no Pipeline B2B).

BEGIN;

CREATE OR REPLACE FUNCTION public._comercial_integracao_perm(p_need text)
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
      OR public._gestor_page_perm('comercial_integracao', p_need)
      OR public._prestador_page_perm('comercial_integracao', p_need)
      OR public._staff_spin_page_perm('comercial_integracao', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role::text <> ALL (public._gestor_departamento_roles())
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'comercial_integracao'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._comercial_integracao_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._comercial_integracao_perm(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.comercial_integracoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id        uuid NOT NULL REFERENCES public.comercial_marcas (id) ON DELETE CASCADE,
  operador_nome   text NOT NULL,
  prioridade      text NOT NULL DEFAULT 'baixo'
    CHECK (prioridade IN ('baixo', 'medio', 'alta')),
  tipo            text NOT NULL
    CHECK (tipo IN ('mesa_dedicada', 'mesa_network')),
  caminho         text,
  pam             text,
  agregadora      text,
  status          text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido')),
  comentario      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comercial_integracoes_marca_tipo_unique UNIQUE (marca_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_comercial_integracoes_status
  ON public.comercial_integracoes (status);
CREATE INDEX IF NOT EXISTS idx_comercial_integracoes_prioridade
  ON public.comercial_integracoes (prioridade);
CREATE INDEX IF NOT EXISTS idx_comercial_integracoes_marca
  ON public.comercial_integracoes (marca_id);

CREATE TABLE IF NOT EXISTS public.comercial_integracao_historico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integracao_id   uuid NOT NULL REFERENCES public.comercial_integracoes (id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  campo           text NOT NULL,
  valor_anterior  text,
  valor_novo      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comercial_integracao_hist
  ON public.comercial_integracao_historico (integracao_id);

DROP TRIGGER IF EXISTS trg_comercial_integracoes_updated ON public.comercial_integracoes;
CREATE TRIGGER trg_comercial_integracoes_updated
  BEFORE UPDATE ON public.comercial_integracoes
  FOR EACH ROW EXECUTE PROCEDURE public.comercial_set_updated_at();

-- Cria linha de integração ao marcar Dedicada/Network como Contrato Assinado.
CREATE OR REPLACE FUNCTION public.comercial_integracao_from_assinado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_agregadora text;
BEGIN
  IF NEW.status_produto IS DISTINCT FROM 'contrato_assinado' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.status_produto IS NOT DISTINCT FROM 'contrato_assinado' THEN
    RETURN NEW;
  END IF;

  SELECT m.nome, m.agregadora
    INTO v_nome, v_agregadora
  FROM public.comercial_marcas m
  WHERE m.id = NEW.marca_id;

  IF v_nome IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.comercial_integracoes (
    marca_id,
    operador_nome,
    prioridade,
    tipo,
    caminho,
    pam,
    agregadora,
    status,
    comentario
  ) VALUES (
    NEW.marca_id,
    v_nome,
    'baixo',
    NEW.produto,
    NULL,
    NULL,
    NULLIF(trim(COALESCE(v_agregadora, '')), ''),
    'nao_iniciado',
    NULL
  )
  ON CONFLICT (marca_id, tipo) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.comercial_integracao_from_assinado() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_comercial_integracao_from_assinado ON public.comercial_marca_produtos;
CREATE TRIGGER trg_comercial_integracao_from_assinado
  AFTER INSERT OR UPDATE OF status_produto ON public.comercial_marca_produtos
  FOR EACH ROW
  EXECUTE PROCEDURE public.comercial_integracao_from_assinado();

ALTER TABLE public.comercial_integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comercial_integracao_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercial_integracoes_select ON public.comercial_integracoes;
DROP POLICY IF EXISTS comercial_integracoes_insert ON public.comercial_integracoes;
DROP POLICY IF EXISTS comercial_integracoes_update ON public.comercial_integracoes;
DROP POLICY IF EXISTS comercial_integracoes_delete ON public.comercial_integracoes;
DROP POLICY IF EXISTS comercial_integracao_hist_select ON public.comercial_integracao_historico;
DROP POLICY IF EXISTS comercial_integracao_hist_insert ON public.comercial_integracao_historico;

CREATE POLICY comercial_integracoes_select ON public.comercial_integracoes FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));
CREATE POLICY comercial_integracoes_insert ON public.comercial_integracoes FOR INSERT TO authenticated
  WITH CHECK (public._comercial_integracao_perm('create'));
CREATE POLICY comercial_integracoes_update ON public.comercial_integracoes FOR UPDATE TO authenticated
  USING (public._comercial_integracao_perm('edit'))
  WITH CHECK (public._comercial_integracao_perm('edit'));
CREATE POLICY comercial_integracoes_delete ON public.comercial_integracoes FOR DELETE TO authenticated
  USING (public._comercial_integracao_perm('delete'));

CREATE POLICY comercial_integracao_hist_select ON public.comercial_integracao_historico FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));
CREATE POLICY comercial_integracao_hist_insert ON public.comercial_integracao_historico FOR INSERT TO authenticated
  WITH CHECK (
    public._comercial_integracao_perm('edit')
    OR public._comercial_integracao_perm('create')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comercial_integracoes TO authenticated;
GRANT SELECT, INSERT ON public.comercial_integracao_historico TO authenticated;

-- Quem vê Integração lê nomes do catálogo de agregadoras.
DROP POLICY IF EXISTS comercial_agregadoras_select_integracao ON public.comercial_agregadoras;
CREATE POLICY comercial_agregadoras_select_integracao ON public.comercial_agregadoras
  FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));

-- Quem vê Integração lista marcas com Contrato Assinado (Nova Integração).
DROP POLICY IF EXISTS comercial_marcas_select_integracao ON public.comercial_marcas;
CREATE POLICY comercial_marcas_select_integracao ON public.comercial_marcas
  FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));

DROP POLICY IF EXISTS comercial_marca_produtos_select_integracao ON public.comercial_marca_produtos;
CREATE POLICY comercial_marca_produtos_select_integracao ON public.comercial_marca_produtos
  FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));

COMMENT ON TABLE public.comercial_integracoes IS
  'Integração comercial — pós Contrato Assinado (Dedicada/Network) no Pipeline B2B.';
COMMENT ON COLUMN public.comercial_integracoes.tipo IS
  'mesa_dedicada | mesa_network — uma linha por marca+tipo.';
COMMENT ON COLUMN public.comercial_integracoes.status IS
  'nao_iniciado | em_andamento | concluido.';

-- Backfill: produtos já em Contrato Assinado.
INSERT INTO public.comercial_integracoes (
  marca_id, operador_nome, prioridade, tipo, caminho, pam, agregadora, status
)
SELECT
  p.marca_id,
  m.nome,
  'baixo',
  p.produto,
  NULL,
  NULL,
  NULLIF(trim(COALESCE(m.agregadora, '')), ''),
  'nao_iniciado'
FROM public.comercial_marca_produtos p
INNER JOIN public.comercial_marcas m ON m.id = p.marca_id
WHERE p.status_produto = 'contrato_assinado'
ON CONFLICT (marca_id, tipo) DO NOTHING;

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT r.role, 'comercial_integracao', 'nao', 'nao', 'nao', 'nao'
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
SELECT DISTINCT op.operadora_slug, 'comercial_integracao'
FROM public.operadora_pages op
WHERE op.page_key = 'comercial_pipeline_b2b'
ON CONFLICT (operadora_slug, page_key) DO NOTHING;

COMMIT;
