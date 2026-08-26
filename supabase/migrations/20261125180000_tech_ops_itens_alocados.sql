-- Tech Ops — Itens Alocados (page_key tech_ops_itens_alocados).
-- Set (itens em OS abertas no local) + status/checklist + limpeza/manutenção.
-- Sem dados seed. Permissões iniciais: Não para todos os perfis exceto admin.
-- Ver = dados + ações Ver/Histórico; Criar = Checklist / Registrar Limpeza / Registrar Manutenção.

BEGIN;

-- ─── Helper de permissão ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._tech_ops_itens_alocados_perm(p_need text)
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
      OR public._gestor_page_perm('tech_ops_itens_alocados', p_need)
      OR public._prestador_page_perm('tech_ops_itens_alocados', p_need)
      OR public._staff_spin_page_perm('tech_ops_itens_alocados', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'tech_ops_itens_alocados'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._tech_ops_itens_alocados_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tech_ops_itens_alocados_perm(text) TO authenticated;

COMMENT ON FUNCTION public._tech_ops_itens_alocados_perm(text) IS
  'Permissão Tech Ops → Itens Alocados (view|create|edit|delete).';

CREATE OR REPLACE FUNCTION public.tech_ops_itens_alocados_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─── Status do item no local (Set) ───────────────────────────────────────────

CREATE TABLE public.tech_ops_itens_alocados_status (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_chave    text NOT NULL,
  entidade_tipo  text NOT NULL CHECK (entidade_tipo IN ('item', 'equipamento', 'jogo')),
  entidade_id    uuid NOT NULL,
  status         text NOT NULL DEFAULT 'em_uso'
                   CHECK (status IN ('em_uso', 'verificar', 'manutencao')),
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_nome text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (local_chave, entidade_tipo, entidade_id)
);

COMMENT ON TABLE public.tech_ops_itens_alocados_status IS
  'Status do item no Set do local (Em Uso / Verificar / Manutenção). local_chave = estudio:<slug> | shuffler_room | ocr | academy.';

CREATE INDEX idx_tech_ops_ia_status_local ON public.tech_ops_itens_alocados_status (local_chave);

CREATE TRIGGER trg_tech_ops_ia_status_upd
  BEFORE UPDATE ON public.tech_ops_itens_alocados_status
  FOR EACH ROW EXECUTE FUNCTION public.tech_ops_itens_alocados_touch_updated_at();

-- ─── Checklist ───────────────────────────────────────────────────────────────

CREATE TABLE public.tech_ops_itens_alocados_checklist (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_chave         text NOT NULL,
  mesa_id             uuid REFERENCES public.mesas_spin_cadastro(id) ON DELETE SET NULL,
  tipo_verificacao    text NOT NULL CHECK (tipo_verificacao IN ('preventiva', 'pontual', 'escalada')),
  observacao          text NOT NULL,
  autor_user_id       uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome          text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_ia_checklist_obs_trim CHECK (btrim(observacao) <> '')
);

CREATE INDEX idx_tech_ops_ia_checklist_local ON public.tech_ops_itens_alocados_checklist (local_chave, created_at DESC);

CREATE TABLE public.tech_ops_itens_alocados_checklist_itens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id    uuid NOT NULL REFERENCES public.tech_ops_itens_alocados_checklist(id) ON DELETE CASCADE,
  entidade_tipo   text NOT NULL CHECK (entidade_tipo IN ('item', 'equipamento', 'jogo')),
  entidade_id     uuid NOT NULL,
  status_anterior text NOT NULL CHECK (status_anterior IN ('em_uso', 'verificar', 'manutencao')),
  status_novo     text NOT NULL CHECK (status_novo IN ('em_uso', 'verificar', 'manutencao')),
  label_snapshot  text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_ops_ia_chk_itens_chk ON public.tech_ops_itens_alocados_checklist_itens (checklist_id);
CREATE INDEX idx_tech_ops_ia_chk_itens_ent ON public.tech_ops_itens_alocados_checklist_itens (entidade_tipo, entidade_id);

-- ─── Histórico (eventos de checklist; manutenção/movimentação na sequência) ──

CREATE TABLE public.tech_ops_itens_alocados_historico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo   text NOT NULL CHECK (entidade_tipo IN ('item', 'equipamento', 'jogo')),
  entidade_id     uuid NOT NULL,
  local_chave     text NOT NULL,
  tipo_evento     text NOT NULL CHECK (tipo_evento IN ('checklist', 'manutencao', 'movimentacao')),
  checklist_id    uuid REFERENCES public.tech_ops_itens_alocados_checklist(id) ON DELETE SET NULL,
  ordem_id        uuid REFERENCES public.tech_ops_ordem_saida(id) ON DELETE SET NULL,
  tipo_verificacao text,
  status_anterior text,
  status_novo     text,
  observacao      text NOT NULL DEFAULT '',
  autor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome      text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_ops_ia_hist_ent ON public.tech_ops_itens_alocados_historico (entidade_tipo, entidade_id, created_at DESC);
CREATE INDEX idx_tech_ops_ia_hist_tipo ON public.tech_ops_itens_alocados_historico (tipo_evento, created_at DESC);

-- ─── Limpeza ─────────────────────────────────────────────────────────────────

CREATE TABLE public.tech_ops_itens_alocados_limpeza (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_chave         text NOT NULL,
  mesa_id             uuid REFERENCES public.mesas_spin_cadastro(id) ON DELETE SET NULL,
  equipamento_id      uuid NOT NULL REFERENCES public.tech_ops_estoque_equipamentos(id) ON DELETE RESTRICT,
  data_hora           timestamptz NOT NULL,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_nome    text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tech_ops_ia_limp_local ON public.tech_ops_itens_alocados_limpeza (local_chave, data_hora DESC);
CREATE INDEX idx_tech_ops_ia_limp_mes ON public.tech_ops_itens_alocados_limpeza (date_trunc('month', data_hora AT TIME ZONE 'America/Sao_Paulo'));

-- ─── Manutenção (registros operacionais da aba) ───────────────────────────────

CREATE TABLE public.tech_ops_itens_alocados_manutencao (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_chave         text NOT NULL,
  mesa_id             uuid REFERENCES public.mesas_spin_cadastro(id) ON DELETE SET NULL,
  equipamento_id      uuid NOT NULL REFERENCES public.tech_ops_estoque_equipamentos(id) ON DELETE RESTRICT,
  tipo                text NOT NULL,
  data_hora           timestamptz NOT NULL,
  responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_nome    text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tech_ops_ia_manut_tipo_trim CHECK (btrim(tipo) <> '')
);

CREATE INDEX idx_tech_ops_ia_manut_local ON public.tech_ops_itens_alocados_manutencao (local_chave, data_hora DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.tech_ops_itens_alocados_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_itens_alocados_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_itens_alocados_checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_itens_alocados_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_itens_alocados_limpeza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_ops_itens_alocados_manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY tech_ops_ia_status_select
  ON public.tech_ops_itens_alocados_status FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_status_insert
  ON public.tech_ops_itens_alocados_status FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));
CREATE POLICY tech_ops_ia_status_update
  ON public.tech_ops_itens_alocados_status FOR UPDATE TO authenticated
  USING (public._tech_ops_itens_alocados_perm('create'))
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));

CREATE POLICY tech_ops_ia_chk_select
  ON public.tech_ops_itens_alocados_checklist FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_chk_insert
  ON public.tech_ops_itens_alocados_checklist FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));

CREATE POLICY tech_ops_ia_chk_itens_select
  ON public.tech_ops_itens_alocados_checklist_itens FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_chk_itens_insert
  ON public.tech_ops_itens_alocados_checklist_itens FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));

CREATE POLICY tech_ops_ia_hist_select
  ON public.tech_ops_itens_alocados_historico FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_hist_insert
  ON public.tech_ops_itens_alocados_historico FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create') OR public._tech_ops_itens_alocados_perm('view'));

CREATE POLICY tech_ops_ia_limp_select
  ON public.tech_ops_itens_alocados_limpeza FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_limp_insert
  ON public.tech_ops_itens_alocados_limpeza FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));

CREATE POLICY tech_ops_ia_manut_select
  ON public.tech_ops_itens_alocados_manutencao FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));
CREATE POLICY tech_ops_ia_manut_insert
  ON public.tech_ops_itens_alocados_manutencao FOR INSERT TO authenticated
  WITH CHECK (public._tech_ops_itens_alocados_perm('create'));

GRANT SELECT, INSERT, UPDATE ON public.tech_ops_itens_alocados_status TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_itens_alocados_checklist TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_itens_alocados_checklist_itens TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_itens_alocados_historico TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_itens_alocados_limpeza TO authenticated;
GRANT SELECT, INSERT ON public.tech_ops_itens_alocados_manutencao TO authenticated;

-- ─── Leitura cruzada (estoque / OS / mesas / estúdios) ────────────────────────

DROP POLICY IF EXISTS tech_ops_estoque_itens_select ON public.tech_ops_estoque_itens;
CREATE POLICY tech_ops_estoque_itens_select
  ON public.tech_ops_estoque_itens FOR SELECT TO authenticated
  USING (
    public._tech_ops_estoque_perm('view')
    OR public._tech_ops_ordem_saida_perm('view')
    OR public._tech_ops_itens_alocados_perm('view')
  );

DROP POLICY IF EXISTS tech_ops_estoque_equip_select ON public.tech_ops_estoque_equipamentos;
CREATE POLICY tech_ops_estoque_equip_select
  ON public.tech_ops_estoque_equipamentos FOR SELECT TO authenticated
  USING (
    public._tech_ops_estoque_perm('view')
    OR public._tech_ops_ordem_saida_perm('view')
    OR public._tech_ops_itens_alocados_perm('view')
  );

DROP POLICY IF EXISTS tech_ops_estoque_jogo_select ON public.tech_ops_estoque_jogo_lotes;
CREATE POLICY tech_ops_estoque_jogo_select
  ON public.tech_ops_estoque_jogo_lotes FOR SELECT TO authenticated
  USING (
    public._tech_ops_estoque_perm('view')
    OR public._tech_ops_ordem_saida_perm('view')
    OR public._tech_ops_itens_alocados_perm('view')
  );

DROP POLICY IF EXISTS tech_ops_os_select ON public.tech_ops_ordem_saida;
CREATE POLICY tech_ops_os_select
  ON public.tech_ops_ordem_saida FOR SELECT TO authenticated
  USING (
    public._tech_ops_ordem_saida_perm('view')
    OR public._tech_ops_itens_alocados_perm('view')
  );

DROP POLICY IF EXISTS tech_ops_os_itens_select ON public.tech_ops_ordem_saida_itens;
CREATE POLICY tech_ops_os_itens_select
  ON public.tech_ops_ordem_saida_itens FOR SELECT TO authenticated
  USING (
    public._tech_ops_ordem_saida_perm('view')
    OR public._tech_ops_itens_alocados_perm('view')
  );

DROP POLICY IF EXISTS mesas_spin_cadastro_select_itens_alocados ON public.mesas_spin_cadastro;
CREATE POLICY mesas_spin_cadastro_select_itens_alocados
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (public._tech_ops_itens_alocados_perm('view'));

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
      OR public._mesas_spin_overview_perm(p_need)
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
      OR public._escala_relatorio_turno_perm(p_need)
      OR public._escala_rotacao_perm(p_need)
      OR public._tech_ops_itens_alocados_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestão de Mesas, Overview Spin ou páginas operacionais (incl. Tech Ops Itens Alocados).';

-- ─── Seed de permissões ──────────────────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'tech_ops_itens_alocados', 'nao', 'nao', NULL, NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
