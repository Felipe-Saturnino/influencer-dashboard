-- Tech Ops — Ordem de Saída (page_key tech_ops_ordem_saida).
-- Ordens internas, externas e de manutenção + itens (vínculo ao estoque) + histórico.
-- Sem dados seed. Permissões iniciais: Não para todos os perfis exceto admin.

BEGIN;

-- ─── Helper de permissão ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._tech_ops_ordem_saida_perm(p_need text)
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
      OR public._gestor_page_perm('tech_ops_ordem_saida', p_need)
      OR public._prestador_page_perm('tech_ops_ordem_saida', p_need)
      OR public._staff_spin_page_perm('tech_ops_ordem_saida', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'tech_ops_ordem_saida'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._tech_ops_ordem_saida_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_ordem_saida_perm(text) TO authenticated;

COMMENT ON FUNCTION public._tech_ops_ordem_saida_perm(text) IS
  'Permissão Tech Ops → Ordem de Saída (view|create|edit|delete) via role_permissions / gestores / prestadores / staff Spin.';

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─── Contador de código por tipo + competência (MMAA) ────────────────────────

CREATE TABLE public.tech_ops_ordem_saida_codigo_counters (
  tipo         text NOT NULL CHECK (tipo IN ('interna', 'externa', 'manutencao')),
  competencia  date NOT NULL, -- 1º dia do mês
  ultimo_num   int  NOT NULL DEFAULT 0,
  PRIMARY KEY (tipo, competencia)
);

COMMENT ON TABLE public.tech_ops_ordem_saida_codigo_counters IS
  'Sequencial de código OS por tipo e mês de abertura (OS/{INT|EXT|MAN}-MMAA-####).';

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_proximo_codigo(
  p_tipo text,
  p_competencia date DEFAULT NULL
)
RETURNS TABLE (codigo_num int, competencia date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comp date;
  v_num int;
BEGIN
  IF p_tipo NOT IN ('interna', 'externa', 'manutencao') THEN
    RAISE EXCEPTION 'tipo inválido';
  END IF;
  IF NOT public._tech_ops_ordem_saida_perm('create') THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  v_comp := date_trunc('month', COALESCE(p_competencia, CURRENT_DATE))::date;

  INSERT INTO public.tech_ops_ordem_saida_codigo_counters (tipo, competencia, ultimo_num)
  VALUES (p_tipo, v_comp, 1)
  ON CONFLICT (tipo, competencia) DO UPDATE
    SET ultimo_num = public.tech_ops_ordem_saida_codigo_counters.ultimo_num + 1
  RETURNING public.tech_ops_ordem_saida_codigo_counters.ultimo_num
  INTO v_num;

  codigo_num := v_num;
  competencia := v_comp;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.tech_ops_ordem_saida_proximo_codigo(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tech_ops_ordem_saida_proximo_codigo(text, date) TO authenticated;

-- ─── Cabeçalho da OS ─────────────────────────────────────────────────────────

CREATE TABLE public.tech_ops_ordem_saida (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                 text NOT NULL CHECK (tipo IN ('interna', 'externa', 'manutencao')),
  competencia          date NOT NULL, -- 1º dia do mês de abertura
  codigo_num           int  NOT NULL,
  status               text NOT NULL DEFAULT 'solicitada'
                         CHECK (status IN ('solicitada', 'aberta', 'concluida', 'cancelada')),

  -- Interna: chaves de local (estudio:<slug> | estoque | shuffler_room | ocr | academy)
  origem_chave         text,
  destino_chave        text,
  -- Externa: destino livre
  destino_texto        text,
  -- Manutenção
  fornecedor_id        uuid REFERENCES public.tech_ops_estoque_fornecedores(id) ON DELETE SET NULL,

  data_saida           date,
  data_retorno         date,
  sem_retorno          boolean NOT NULL DEFAULT false,
  data_saida_realizada date,
  data_retorno_realizada date,

  observacao           text NOT NULL DEFAULT '',

  solicitante_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  solicitante_nome     text NOT NULL DEFAULT '',
  solicitante_time     text NOT NULL DEFAULT '',
  responsavel_nome     text NOT NULL DEFAULT '',

  ativo                boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tipo, competencia, codigo_num),
  CONSTRAINT tech_ops_os_retorno_ok CHECK (
    data_retorno IS NULL OR data_saida IS NULL OR data_retorno > data_saida
  )
);

COMMENT ON TABLE public.tech_ops_ordem_saida IS
  'Tech Ops → Ordem de Saída. Código UI = OS/{INT|EXT|MAN}-MMAA-####. OS abertas (solicitada/aberta) aparecem nos meses seguintes até concluída/cancelada.';

CREATE INDEX idx_tech_ops_os_tipo ON public.tech_ops_ordem_saida (tipo);
CREATE INDEX idx_tech_ops_os_status ON public.tech_ops_ordem_saida (status);
CREATE INDEX idx_tech_ops_os_competencia ON public.tech_ops_ordem_saida (competencia);
CREATE INDEX idx_tech_ops_os_fornecedor ON public.tech_ops_ordem_saida (fornecedor_id);

CREATE TRIGGER trg_tech_ops_os_updated_at
  BEFORE UPDATE ON public.tech_ops_ordem_saida
  FOR EACH ROW EXECUTE FUNCTION public.tech_ops_ordem_saida_touch_updated_at();

-- ─── Itens da OS ─────────────────────────────────────────────────────────────

CREATE TABLE public.tech_ops_ordem_saida_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id      uuid NOT NULL REFERENCES public.tech_ops_ordem_saida(id) ON DELETE CASCADE,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('item', 'equipamento', 'jogo')),
  entidade_id   uuid NOT NULL,
  quantidade    int  NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  label_snapshot text NOT NULL DEFAULT '', -- nome/código no momento da solicitação
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ordem_id, entidade_tipo, entidade_id)
);

COMMENT ON TABLE public.tech_ops_ordem_saida_itens IS
  'Linhas de item/equipamento/lote de jogo vinculados a uma OS. entidade_id aponta para tech_ops_estoque_*.';

CREATE INDEX idx_tech_ops_os_itens_ordem ON public.tech_ops_ordem_saida_itens (ordem_id);

-- ─── Histórico ───────────────────────────────────────────────────────────────

CREATE TABLE public.tech_ops_ordem_saida_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id       uuid NOT NULL REFERENCES public.tech_ops_ordem_saida(id) ON DELETE CASCADE,
  acao           text NOT NULL,
  detalhe        text,
  autor_user_id  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome     text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_ops_os_hist_ordem ON public.tech_ops_ordem_saida_historico (ordem_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.tech_ops_ordem_saida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_ordem_saida_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_ordem_saida_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_ordem_saida_codigo_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY tech_ops_os_select
  ON public.tech_ops_ordem_saida FOR SELECT TO authenticated
  USING (public._tech_ops_ordem_saida_perm('view'));
CREATE POLICY tech_ops_os_insert
  ON public.tech_ops_ordem_saida FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_ordem_saida_perm('create'));
CREATE POLICY tech_ops_os_update
  ON public.tech_ops_ordem_saida FOR UPDATE TO authenticated
  USING (public._tech_ops_ordem_saida_perm('edit'))
  WITH CHECK (public._tech_ops_ordem_saida_perm('edit'));

CREATE POLICY tech_ops_os_itens_select
  ON public.tech_ops_ordem_saida_itens FOR SELECT TO authenticated
  USING (public._tech_ops_ordem_saida_perm('view'));
CREATE POLICY tech_ops_os_itens_insert
  ON public.tech_ops_ordem_saida_itens FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_ordem_saida_perm('create') OR public._tech_ops_ordem_saida_perm('edit'));
CREATE POLICY tech_ops_os_itens_update
  ON public.tech_ops_ordem_saida_itens FOR UPDATE TO authenticated
  USING (public._tech_ops_ordem_saida_perm('edit'))
  WITH CHECK (public._tech_ops_ordem_saida_perm('edit'));
CREATE POLICY tech_ops_os_itens_delete
  ON public.tech_ops_ordem_saida_itens FOR DELETE TO authenticated
  USING (public._tech_ops_ordem_saida_perm('edit'));

CREATE POLICY tech_ops_os_hist_select
  ON public.tech_ops_ordem_saida_historico FOR SELECT TO authenticated
  USING (public._tech_ops_ordem_saida_perm('view'));
CREATE POLICY tech_ops_os_hist_insert
  ON public.tech_ops_ordem_saida_historico FOR INSERT TO authenticated
  WITH CHECK (
    (public._tech_ops_ordem_saida_perm('create') OR public._tech_ops_ordem_saida_perm('edit'))
    AND (autor_user_id IS NULL OR autor_user_id = auth.uid())
  );

-- Counters: só via RPC SECURITY DEFINER; sem policy de cliente
CREATE POLICY tech_ops_os_counters_deny
  ON public.tech_ops_ordem_saida_codigo_counters FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE ON public.tech_ops_ordem_saida TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_ops_ordem_saida_itens TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_ordem_saida_historico TO authenticated;

-- ─── Leitura de estoque para quem tem Ordem de Saída (sem precisar da página Estoque) ─

DROP POLICY IF EXISTS tech_ops_estoque_itens_select ON public.tech_ops_estoque_itens;
CREATE POLICY tech_ops_estoque_itens_select
  ON public.tech_ops_estoque_itens FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view') OR public._tech_ops_ordem_saida_perm('view'));

DROP POLICY IF EXISTS tech_ops_estoque_equip_select ON public.tech_ops_estoque_equipamentos;
CREATE POLICY tech_ops_estoque_equip_select
  ON public.tech_ops_estoque_equipamentos FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view') OR public._tech_ops_ordem_saida_perm('view'));

DROP POLICY IF EXISTS tech_ops_estoque_jogo_select ON public.tech_ops_estoque_jogo_lotes;
CREATE POLICY tech_ops_estoque_jogo_select
  ON public.tech_ops_estoque_jogo_lotes FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view') OR public._tech_ops_ordem_saida_perm('view'));

DROP POLICY IF EXISTS tech_ops_estoque_fornecedores_select ON public.tech_ops_estoque_fornecedores;
CREATE POLICY tech_ops_estoque_fornecedores_select
  ON public.tech_ops_estoque_fornecedores FOR SELECT TO authenticated
  USING (public._tech_ops_estoque_perm('view') OR public._tech_ops_ordem_saida_perm('view'));

-- ─── Estúdios: leitura também com permissão de Ordem de Saída ────────────────

CREATE OR REPLACE FUNCTION public._estudios_spin_leitura_perm(p_need text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public._mesas_spin_cadastro_perm(p_need)
      OR public._rh_staff_perm(p_need)
      OR public._gestor_page_perm('rh_gestao_escala', p_need)
      OR public._prestador_page_perm('rh_gestao_escala', p_need)
      OR public._staff_spin_page_perm('rh_gestao_escala', p_need)
      OR public._executivo_role_permissions_can_view('rh_gestao_escala')
      OR public._gestor_page_perm('gestao_dealers', p_need)
      OR public._prestador_page_perm('gestao_dealers', p_need)
      OR public._staff_spin_page_perm('gestao_dealers', p_need)
      OR public._executivo_role_permissions_can_view('gestao_dealers')
      OR public._gestor_page_perm('rh_figurinos', p_need)
      OR public._prestador_page_perm('rh_figurinos', p_need)
      OR public._staff_spin_page_perm('rh_figurinos', p_need)
      OR public._executivo_role_permissions_can_view('rh_figurinos')
      OR public._gestor_page_perm('roteiro_mesa', p_need)
      OR public._prestador_page_perm('roteiro_mesa', p_need)
      OR public._staff_spin_page_perm('roteiro_mesa', p_need)
      OR public._executivo_role_permissions_can_view('roteiro_mesa')
      OR public._gestor_page_perm('central_notificacoes', p_need)
      OR public._prestador_page_perm('central_notificacoes', p_need)
      OR public._staff_spin_page_perm('central_notificacoes', p_need)
      OR public._executivo_role_permissions_can_view('central_notificacoes')
      OR public._tech_ops_estoque_perm(p_need)
      OR public._academy_performance_hub_perm(p_need)
      OR public._tech_ops_ordem_saida_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas ou páginas operacionais (Staff, Escala, Dealers, Figurinos, Roteiro, Central, Gestão de Estoque, Performance Hub, Ordem de Saída).';

-- ─── Seed de permissões ──────────────────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'tech_ops_ordem_saida', 'nao', 'nao', 'nao', NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
