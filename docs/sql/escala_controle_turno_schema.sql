-- =============================================================================
-- COPIAR E COLAR NO SUPABASE SQL EDITOR
-- Página oficial: Escala → Controle de Turno (page_key escala_controle_turno)
--
-- Reutiliza: escala_rotacao*, escala_relatorio_* (acesso também via perm CT),
--            estudios_spin, mesas_spin_cadastro, rh_funcionarios, ponto,
--            rh_gestao_escala_grade (escalados do dia/turno).
-- Novo: notificações CT + relatório CT (formato mockup SOS/Figurino/…)
--       + registro de presença da aba Escala do Turno.
--
-- Idempotente. Espelho Git: supabase/migrations/20261129140000_escala_controle_turno_schema.sql
-- =============================================================================

BEGIN;

-- ─── 1) Permissão Controle de Turno ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._escala_controle_turno_perm(p_need text)
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
      OR public._gestor_page_perm('escala_controle_turno', p_need)
      OR public._prestador_page_perm('escala_controle_turno', p_need)
      OR public._staff_spin_page_perm('escala_controle_turno', p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'escala_controle_turno'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public._escala_controle_turno_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._escala_controle_turno_perm(text) TO authenticated;

COMMENT ON FUNCTION public._escala_controle_turno_perm(text) IS
  'Permissão Escala → Controle de Turno (view|create|edit|delete). Página oficial.';

-- ─── 2) Rotação / Relatório legado: aceitar também perm do Controle de Turno ──

CREATE OR REPLACE FUNCTION public._escala_rotacao_perm(p_need text)
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
      OR public._gestor_page_perm('escala_rotacao', p_need)
      OR public._prestador_page_perm('escala_rotacao', p_need)
      OR public._staff_spin_page_perm('escala_rotacao', p_need)
      OR public._escala_controle_turno_perm(p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'escala_rotacao'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public._escala_relatorio_turno_perm(p_need text)
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
      OR public._gestor_page_perm('escala_relatorio_turno', p_need)
      OR public._prestador_page_perm('escala_relatorio_turno', p_need)
      OR public._staff_spin_page_perm('escala_relatorio_turno', p_need)
      OR public._escala_controle_turno_perm(p_need)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND p.role IS DISTINCT FROM 'gestor'
          AND p.role IS DISTINCT FROM 'prestador'
          AND rp.page_key = 'escala_relatorio_turno'
          AND (
            (p_need = 'view' AND rp.can_view IN ('sim', 'proprios'))
            OR (p_need = 'create' AND rp.can_criar IN ('sim', 'proprios'))
            OR (p_need = 'edit' AND rp.can_editar IN ('sim', 'proprios'))
            OR (p_need = 'delete' AND rp.can_excluir IN ('sim', 'proprios'))
          )
      )
    );
$$;

COMMENT ON FUNCTION public._escala_rotacao_perm(text) IS
  'Permissão Rotação OU Controle de Turno (página oficial).';
COMMENT ON FUNCTION public._escala_relatorio_turno_perm(text) IS
  'Permissão Relatório de Turno legado OU Controle de Turno (página oficial).';

-- ─── 3) Leitura de estúdios/mesas inclui Controle de Turno ────────────────────

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
      OR public._escala_relatorio_turno_perm(p_need)
      OR public._escala_rotacao_perm(p_need)
      OR public._escala_controle_turno_perm(p_need)
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: inclui Controle de Turno / Rotação / Relatório.';

-- ─── 4) Fechamento de Mesa ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_fechamento_mesa (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_registro               date NOT NULL,
  mesa_id                     uuid NOT NULL REFERENCES public.mesas_spin_cadastro (id) ON DELETE RESTRICT,
  hora_fechamento             time NOT NULL,
  hora_reabertura             time,
  nao_reaberta                boolean NOT NULL DEFAULT true,
  observacao                  text NOT NULL,
  lideranca_fechamento_user_id uuid REFERENCES auth.users (id),
  lideranca_fechamento_nome   text NOT NULL DEFAULT '',
  lideranca_reabertura_user_id uuid REFERENCES auth.users (id),
  lideranca_reabertura_nome   text NOT NULL DEFAULT '',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_fechamento_obs_chk CHECK (btrim(observacao) <> ''),
  CONSTRAINT escala_ct_fechamento_reab_chk CHECK (
    (nao_reaberta = true AND hora_reabertura IS NULL)
    OR (nao_reaberta = false AND hora_reabertura IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS escala_ct_fechamento_data_idx
  ON public.escala_ct_fechamento_mesa (data_registro DESC);
CREATE INDEX IF NOT EXISTS escala_ct_fechamento_mesa_idx
  ON public.escala_ct_fechamento_mesa (mesa_id);
CREATE INDEX IF NOT EXISTS escala_ct_fechamento_abertos_idx
  ON public.escala_ct_fechamento_mesa (data_registro)
  WHERE nao_reaberta = true;

COMMENT ON TABLE public.escala_ct_fechamento_mesa IS
  'Controle de Turno → Notificações: fechamento/reabertura de mesa. Persiste nos dias seguintes enquanto nao_reaberta.';

-- ─── 5) Ausências ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_ausencia (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador_id        uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE RESTRICT,
  motivo              text NOT NULL CHECK (motivo IN ('medico', 'pessoal')),
  inicio              date NOT NULL,
  fim                 date,
  fim_nao_informado   boolean NOT NULL DEFAULT false,
  observacao          text NOT NULL,
  lideranca_user_id   uuid REFERENCES auth.users (id),
  lideranca_nome      text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_ausencia_obs_chk CHECK (btrim(observacao) <> ''),
  CONSTRAINT escala_ct_ausencia_fim_chk CHECK (
    (fim_nao_informado = true AND fim IS NULL)
    OR (fim_nao_informado = false AND fim IS NOT NULL AND fim >= inicio)
  )
);

CREATE INDEX IF NOT EXISTS escala_ct_ausencia_inicio_idx
  ON public.escala_ct_ausencia (inicio DESC);
CREATE INDEX IF NOT EXISTS escala_ct_ausencia_prestador_idx
  ON public.escala_ct_ausencia (prestador_id);

COMMENT ON TABLE public.escala_ct_ausencia IS
  'Controle de Turno → Notificações: ausências operacionais (GP/Shuffler). Visível enquanto fim não informado ou fim >= dia.';

-- ─── 6) Feedbacks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_registro         date NOT NULL,
  prestador_id          uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE RESTRICT,
  recomendacao          text NOT NULL CHECK (recomendacao IN (
                          'orientacao',
                          'alinhamento',
                          'notif_descumprimento',
                          'notif_suspensao',
                          'persistencia'
                        )),
  status                text NOT NULL CHECK (status IN ('aplicado', 'revisar')),
  observacao            text NOT NULL,
  lideranca_user_id     uuid REFERENCES auth.users (id),
  lideranca_nome        text NOT NULL DEFAULT '',
  aplicado_por_user_id  uuid REFERENCES auth.users (id),
  aplicado_por_nome     text NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_feedback_obs_chk CHECK (btrim(observacao) <> '')
);

CREATE INDEX IF NOT EXISTS escala_ct_feedback_data_idx
  ON public.escala_ct_feedback (data_registro DESC);
CREATE INDEX IF NOT EXISTS escala_ct_feedback_status_idx
  ON public.escala_ct_feedback (status);
CREATE INDEX IF NOT EXISTS escala_ct_feedback_prestador_idx
  ON public.escala_ct_feedback (prestador_id);

COMMENT ON TABLE public.escala_ct_feedback IS
  'Controle de Turno → Notificações: feedbacks. Orientação → aplicado; demais → revisar. Persiste enquanto status = revisar.';

-- ─── 7) Solicitação de Manutenção ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_manutencao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abertura               date NOT NULL,
  solicitante_user_id   uuid REFERENCES auth.users (id),
  solicitante_nome      text NOT NULL DEFAULT '',
  tipo                  text NOT NULL CHECK (tipo IN ('ti', 'limpeza', 'tech_ops')),
  local_key             text NOT NULL,
  -- local_key: 'estudio:<slug>' | 'shuffler_room' | 'ocr'
  mesa_ref              text,
  -- mesa_ref: uuid de mesas_spin_cadastro::text | 'estudio_geral' | NULL (locais especiais)
  observacao            text NOT NULL,
  status                text NOT NULL DEFAULT 'aberto'
                          CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'cancelado')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_manutencao_obs_chk CHECK (btrim(observacao) <> ''),
  CONSTRAINT escala_ct_manutencao_local_chk CHECK (
    local_key IN ('shuffler_room', 'ocr')
    OR local_key LIKE 'estudio:%'
  ),
  CONSTRAINT escala_ct_manutencao_mesa_chk CHECK (
    (local_key IN ('shuffler_room', 'ocr') AND mesa_ref IS NULL)
    OR (local_key LIKE 'estudio:%' AND mesa_ref IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS escala_ct_manutencao_abertura_idx
  ON public.escala_ct_manutencao (abertura DESC);
CREATE INDEX IF NOT EXISTS escala_ct_manutencao_status_idx
  ON public.escala_ct_manutencao (status);

COMMENT ON TABLE public.escala_ct_manutencao IS
  'Controle de Turno → Notificações: tickets de manutenção. Persiste enquanto status ∉ (cancelado, concluido).';

-- ─── 8) Relatório do turno (formato Controle de Turno / mockup) ───────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_relatorio_turno (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data                date NOT NULL,
  turno               text NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  status              text NOT NULL DEFAULT 'rascunho'
                        CHECK (status IN ('rascunho', 'publicado')),
  relator_user_id     uuid NOT NULL REFERENCES auth.users (id),
  relator_nome        text NOT NULL,
  sos                 text NOT NULL DEFAULT '',
  sos_nenhum          boolean NOT NULL DEFAULT false,
  figurino            text NOT NULL DEFAULT '',
  figurino_nenhum     boolean NOT NULL DEFAULT false,
  equipamentos        text NOT NULL DEFAULT '',
  equipamentos_nenhum boolean NOT NULL DEFAULT false,
  manutencao          jsonb NOT NULL DEFAULT '{}'::jsonb,
  manutencao_resumo   text NOT NULL DEFAULT '',
  comentarios         text NOT NULL DEFAULT '',
  publicado_em        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_relatorio_uk UNIQUE (data, turno)
);

-- Correção do nome da coluna quando a tabela foi criada com o typo `equipamentosamentos`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'escala_ct_relatorio_turno'
      AND column_name = 'equipamentosamentos'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'escala_ct_relatorio_turno'
      AND column_name = 'equipamentos'
  ) THEN
    ALTER TABLE public.escala_ct_relatorio_turno
      RENAME COLUMN equipamentosamentos TO equipamentos;
  END IF;
END;
$$;

ALTER TABLE public.escala_ct_relatorio_turno
  ADD COLUMN IF NOT EXISTS equipamentos text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS escala_ct_relatorio_data_idx
  ON public.escala_ct_relatorio_turno (data DESC);

COMMENT ON TABLE public.escala_ct_relatorio_turno IS
  'Controle de Turno → aba Relatório (formato SOS/Figurino/Equipamentos/Manutenção/Comentários). Distinto de escala_relatorio_turno legado.';

-- ─── 8b) Registro de presença (aba Escala do Turno) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_ct_presenca_registro (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data                date NOT NULL,
  turno               text NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  prestador_id        uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE RESTRICT,
  tipo                text NOT NULL CHECK (tipo IN (
                        'falta',
                        'saida_antecipada',
                        'hora_adicional',
                        'registrar_horario'
                      )),
  status_presenca     text NOT NULL CHECK (status_presenca IN (
                        'presente',
                        'atraso',
                        'falta',
                        'pendente',
                        'saida_antecipada',
                        'hora_adicional'
                      )),
  entrada_hhmm        text,
  saida_hhmm          text,
  motivo              text NOT NULL,
  lideranca_user_id   uuid REFERENCES auth.users (id),
  lideranca_nome      text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT escala_ct_presenca_motivo_chk CHECK (btrim(motivo) <> ''),
  CONSTRAINT escala_ct_presenca_entrada_chk CHECK (
    entrada_hhmm IS NULL
    OR btrim(entrada_hhmm) = ''
    OR entrada_hhmm ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT escala_ct_presenca_saida_chk CHECK (
    saida_hhmm IS NULL
    OR btrim(saida_hhmm) = ''
    OR saida_hhmm ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT escala_ct_presenca_uk UNIQUE (data, turno, prestador_id)
);

CREATE INDEX IF NOT EXISTS escala_ct_presenca_data_idx
  ON public.escala_ct_presenca_registro (data DESC);
CREATE INDEX IF NOT EXISTS escala_ct_presenca_prestador_idx
  ON public.escala_ct_presenca_registro (prestador_id, data DESC);

COMMENT ON TABLE public.escala_ct_presenca_registro IS
  'Controle de Turno → aba Escala do Turno: registro da liderança por prestador/dia/turno. Sobrepõe o status derivado do ponto.';

-- ─── 9) updated_at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_ct_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escala_ct_fechamento_upd ON public.escala_ct_fechamento_mesa;
CREATE TRIGGER trg_escala_ct_fechamento_upd
  BEFORE UPDATE ON public.escala_ct_fechamento_mesa
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escala_ct_ausencia_upd ON public.escala_ct_ausencia;
CREATE TRIGGER trg_escala_ct_ausencia_upd
  BEFORE UPDATE ON public.escala_ct_ausencia
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escala_ct_feedback_upd ON public.escala_ct_feedback;
CREATE TRIGGER trg_escala_ct_feedback_upd
  BEFORE UPDATE ON public.escala_ct_feedback
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escala_ct_manutencao_upd ON public.escala_ct_manutencao;
CREATE TRIGGER trg_escala_ct_manutencao_upd
  BEFORE UPDATE ON public.escala_ct_manutencao
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escala_ct_relatorio_upd ON public.escala_ct_relatorio_turno;
CREATE TRIGGER trg_escala_ct_relatorio_upd
  BEFORE UPDATE ON public.escala_ct_relatorio_turno
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

DROP TRIGGER IF EXISTS trg_escala_ct_presenca_upd ON public.escala_ct_presenca_registro;
CREATE TRIGGER trg_escala_ct_presenca_upd
  BEFORE UPDATE ON public.escala_ct_presenca_registro
  FOR EACH ROW EXECUTE PROCEDURE public.escala_ct_touch_updated_at();

-- ─── 10) RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.escala_ct_fechamento_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_ct_ausencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_ct_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_ct_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_ct_relatorio_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_ct_presenca_registro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escala_ct_fechamento_select ON public.escala_ct_fechamento_mesa;
CREATE POLICY escala_ct_fechamento_select ON public.escala_ct_fechamento_mesa
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_fechamento_insert ON public.escala_ct_fechamento_mesa;
CREATE POLICY escala_ct_fechamento_insert ON public.escala_ct_fechamento_mesa
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_controle_turno_perm('create'));

DROP POLICY IF EXISTS escala_ct_fechamento_update ON public.escala_ct_fechamento_mesa;
CREATE POLICY escala_ct_fechamento_update ON public.escala_ct_fechamento_mesa
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

DROP POLICY IF EXISTS escala_ct_ausencia_select ON public.escala_ct_ausencia;
CREATE POLICY escala_ct_ausencia_select ON public.escala_ct_ausencia
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_ausencia_insert ON public.escala_ct_ausencia;
CREATE POLICY escala_ct_ausencia_insert ON public.escala_ct_ausencia
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_controle_turno_perm('create'));

DROP POLICY IF EXISTS escala_ct_ausencia_update ON public.escala_ct_ausencia;
CREATE POLICY escala_ct_ausencia_update ON public.escala_ct_ausencia
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

DROP POLICY IF EXISTS escala_ct_feedback_select ON public.escala_ct_feedback;
CREATE POLICY escala_ct_feedback_select ON public.escala_ct_feedback
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_feedback_insert ON public.escala_ct_feedback;
CREATE POLICY escala_ct_feedback_insert ON public.escala_ct_feedback
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_controle_turno_perm('create'));

DROP POLICY IF EXISTS escala_ct_feedback_update ON public.escala_ct_feedback;
CREATE POLICY escala_ct_feedback_update ON public.escala_ct_feedback
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

DROP POLICY IF EXISTS escala_ct_manutencao_select ON public.escala_ct_manutencao;
CREATE POLICY escala_ct_manutencao_select ON public.escala_ct_manutencao
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_manutencao_insert ON public.escala_ct_manutencao;
CREATE POLICY escala_ct_manutencao_insert ON public.escala_ct_manutencao
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_controle_turno_perm('create'));

DROP POLICY IF EXISTS escala_ct_manutencao_update ON public.escala_ct_manutencao;
CREATE POLICY escala_ct_manutencao_update ON public.escala_ct_manutencao
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

DROP POLICY IF EXISTS escala_ct_relatorio_select ON public.escala_ct_relatorio_turno;
CREATE POLICY escala_ct_relatorio_select ON public.escala_ct_relatorio_turno
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_relatorio_insert ON public.escala_ct_relatorio_turno;
CREATE POLICY escala_ct_relatorio_insert ON public.escala_ct_relatorio_turno
  FOR INSERT TO authenticated
  WITH CHECK (
    public._escala_controle_turno_perm('create')
    AND relator_user_id = auth.uid()
  );

DROP POLICY IF EXISTS escala_ct_relatorio_update ON public.escala_ct_relatorio_turno;
CREATE POLICY escala_ct_relatorio_update ON public.escala_ct_relatorio_turno
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

DROP POLICY IF EXISTS escala_ct_presenca_select ON public.escala_ct_presenca_registro;
CREATE POLICY escala_ct_presenca_select ON public.escala_ct_presenca_registro
  FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

DROP POLICY IF EXISTS escala_ct_presenca_insert ON public.escala_ct_presenca_registro;
CREATE POLICY escala_ct_presenca_insert ON public.escala_ct_presenca_registro
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_controle_turno_perm('create'));

DROP POLICY IF EXISTS escala_ct_presenca_update ON public.escala_ct_presenca_registro;
CREATE POLICY escala_ct_presenca_update ON public.escala_ct_presenca_registro
  FOR UPDATE TO authenticated
  USING (public._escala_controle_turno_perm('edit'))
  WITH CHECK (public._escala_controle_turno_perm('edit'));

GRANT SELECT, INSERT, UPDATE ON public.escala_ct_fechamento_mesa TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escala_ct_ausencia TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escala_ct_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escala_ct_manutencao TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escala_ct_relatorio_turno TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escala_ct_presenca_registro TO authenticated;

-- Leitura auxiliar de mesas para quem vê o Controle de Turno (selects de Fechamento /
-- Manutenção). Política aditiva — não altera `mesas_spin_cadastro_select`.
DROP POLICY IF EXISTS mesas_spin_cadastro_select_controle_turno ON public.mesas_spin_cadastro;
CREATE POLICY mesas_spin_cadastro_select_controle_turno
  ON public.mesas_spin_cadastro FOR SELECT TO authenticated
  USING (public._escala_controle_turno_perm('view'));

-- ─── 11) Catálogo: prestadores GP/Shuffler para selects ───────────────────────

CREATE OR REPLACE FUNCTION public.escala_controle_turno_prestadores_gp_shuffler()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_out jsonb;
BEGIN
  IF NOT public._escala_controle_turno_perm('view')
     AND NOT public._escala_controle_turno_perm('create') THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'nome', COALESCE(NULLIF(btrim(f.nome), ''), '—'),
      'time', COALESCE(t.nome, '')
    )
    ORDER BY f.nome
  ), '[]'::jsonb)
  INTO v_out
  FROM public.rh_funcionarios f
  LEFT JOIN public.rh_org_times t ON t.id = f.org_time_id
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      lower(COALESCE(t.nome, '')) LIKE '%game presenter%'
      OR lower(COALESCE(t.nome, '')) LIKE '%shuffler%'
    );

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_controle_turno_prestadores_gp_shuffler() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_controle_turno_prestadores_gp_shuffler() TO authenticated;

COMMENT ON FUNCTION public.escala_controle_turno_prestadores_gp_shuffler() IS
  'Lista GP + Shuffler ativos/indisponíveis para selects de Ausência/Feedback.';

-- ─── 12) Presença do dia/turno (aba Escala do Turno) ─────────────────────────
-- Escalados GP/Shuffler da grade aprovada do dia + ponto (check-in/out) +
-- overlay de `escala_ct_presenca_registro`. Um registro CT sobrepõe o display.

CREATE OR REPLACE FUNCTION public.escala_controle_turno_presenca_dia(
  p_dia date,
  p_turno text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno text := lower(btrim(COALESCE(p_turno, '')));
  v_valor text;
  v_ref date;
  v_out jsonb;
BEGIN
  IF NOT public._escala_controle_turno_perm('view') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  IF p_dia IS NULL THEN
    RAISE EXCEPTION 'dia_obrigatorio';
  END IF;

  IF v_turno NOT IN ('manha', 'tarde', 'noite') THEN
    RAISE EXCEPTION 'turno_invalido';
  END IF;

  v_ref := date_trunc('month', p_dia)::date;
  v_valor := CASE v_turno
    WHEN 'manha' THEN 'MRN'
    WHEN 'tarde' THEN 'AFT'
    ELSE 'NGT'
  END;

  WITH escalados AS (
    SELECT DISTINCT ON (f.id)
      f.id AS funcionario_id,
      COALESCE(NULLIF(btrim(f.nome), ''), '—') AS nome,
      COALESCE(NULLIF(btrim(f.staff_nickname), ''), '') AS nickname,
      COALESCE(NULLIF(btrim(t.nome), ''), '') AS time_nome
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_gestao_escala_grade gr
      ON gr.funcionario_id = f.id
     AND gr.ref_mes = v_ref
     AND gr.dia_iso = p_dia
     AND gr.area_key IN ('game_presenter', 'shuffler')
     AND btrim(COALESCE(gr.valor, '')) = v_valor
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
        OR lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%'
      )
    ORDER BY f.id, gr.area_key
  ),
  uids AS (
    SELECT e.funcionario_id, u.id AS user_id
    FROM escalados e
    INNER JOIN public.rh_funcionarios f ON f.id = e.funcionario_id
    INNER JOIN auth.users u ON (
      lower(trim(COALESCE(f.email, ''))) = lower(trim(COALESCE(u.email::text, '')))
      OR (
        trim(COALESCE(f.email_spin, '')) <> ''
        AND lower(trim(COALESCE(f.email_spin, ''))) = lower(trim(COALESCE(u.email::text, '')))
      )
    )
  ),
  ponto AS (
    SELECT
      COALESCE(r.funcionario_id, uids.funcionario_id) AS funcionario_id,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS check_in_at,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS check_out_at
    FROM public.prestador_ponto_registros r
    LEFT JOIN uids ON uids.user_id = r.user_id
    WHERE r.dia_sp = p_dia
      AND (
        r.funcionario_id IN (SELECT funcionario_id FROM escalados)
        OR uids.funcionario_id IS NOT NULL
      )
    GROUP BY COALESCE(r.funcionario_id, uids.funcionario_id)
  ),
  reg AS (
    SELECT pr.prestador_id, pr.status_presenca, pr.entrada_hhmm, pr.saida_hhmm
    FROM public.escala_ct_presenca_registro pr
    WHERE pr.data = p_dia
      AND pr.turno = v_turno
  ),
  linhas AS (
    SELECT
      e.funcionario_id,
      e.nome,
      e.nickname,
      e.time_nome,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN btrim(COALESCE(r.entrada_hhmm, ''))
        WHEN p.check_in_at IS NOT NULL
          THEN to_char(p.check_in_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
        ELSE ''
      END AS entrada,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN btrim(COALESCE(r.saida_hhmm, ''))
        WHEN p.check_out_at IS NOT NULL
          THEN to_char(p.check_out_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
        ELSE ''
      END AS saida,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN r.status_presenca
        WHEN p.check_in_at IS NOT NULL THEN 'presente'
        ELSE 'pendente'
      END AS status,
      (r.prestador_id IS NOT NULL) AS registrado
    FROM escalados e
    LEFT JOIN ponto p ON p.funcionario_id = e.funcionario_id
    LEFT JOIN reg r ON r.prestador_id = e.funcionario_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', l.funcionario_id,
      'nome', l.nome,
      'nickname', l.nickname,
      'time', l.time_nome,
      'entrada', l.entrada,
      'saida', l.saida,
      'status', l.status,
      'registrado', l.registrado
    )
    ORDER BY l.nome
  ), '[]'::jsonb)
  INTO v_out
  FROM linhas l;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_controle_turno_presenca_dia(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_controle_turno_presenca_dia(date, text) TO authenticated;

COMMENT ON FUNCTION public.escala_controle_turno_presenca_dia(date, text) IS
  'Controle de Turno → Escala do Turno: escalados GP/Shuffler do dia/turno com ponto e overlay de escala_ct_presenca_registro.';

-- ─── 13) Seed permissões (reforço) ───────────────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'escala_controle_turno', 'nao', 'nao', 'nao', NULL
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;

COMMIT;
