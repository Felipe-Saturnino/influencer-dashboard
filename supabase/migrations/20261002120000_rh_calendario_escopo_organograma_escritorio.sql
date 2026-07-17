-- ============================================================================
-- Calendário RH — escopo pelo Organograma, listas autorizadas e escala
-- sintética de Escritório.
--
-- Regra de escopo (permissão Ver da página rh_calendario):
--   Ver = sim      → visão global (todos os funcionários ativos/indisponíveis).
--   Ver = próprios → o próprio funcionário + cascata dos ramos onde é líder
--                    explícito no Organograma (diretoria → gerências → times).
--
-- Idempotente: pode ser executada mais de uma vez sem erro (recria funções,
-- triggers e grants; tabela e seed usam IF NOT EXISTS / ON CONFLICT).
--
-- Inclui as versões otimizadas de rh_calendario_funcionarios_gerenciaveis e
-- rh_calendario_reunioes_mes (escopo materializado uma vez por chamada, sem
-- reavaliação por linha) — a migration 20261003120000 apenas reaplica estas
-- mesmas definições.
--
-- Pré-requisitos (migrations anteriores): rh_funcionarios, rh_org_diretorias,
-- rh_org_gerencias, rh_org_times, rh_gestao_escala_grade(_status),
-- rh_calendario_acoes, rh_solicitacoes, rh_calendario_presenca_gestao,
-- rh_calendario_presenca_aprovacao_mes, prestador_ponto_registros,
-- _prestador_page_perm, _gestor_page_perm, _dash_escopo_proprios_prestador,
-- _rh_solicitacao_sync_calendario_atestado.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Versão do escopo (singleton) — invalida cache do cliente quando o
--    Organograma ou os vínculos de funcionários mudam.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rh_calendario_escopo_versao (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.rh_calendario_escopo_versao (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- Sem policies: leitura só via função SECURITY DEFINER (rh_calendario_escopo_versao()).
ALTER TABLE public.rh_calendario_escopo_versao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_calendario_escopo_versao FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._rh_calendario_marcar_escopo_alterado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rh_calendario_escopo_versao (singleton, updated_at)
  VALUES (true, clock_timestamp())
  ON CONFLICT (singleton) DO UPDATE
  SET updated_at = EXCLUDED.updated_at;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_cal_escopo_diretorias ON public.rh_org_diretorias;
CREATE TRIGGER trg_rh_cal_escopo_diretorias
AFTER INSERT OR UPDATE OR DELETE ON public.rh_org_diretorias
FOR EACH STATEMENT EXECUTE FUNCTION public._rh_calendario_marcar_escopo_alterado();

DROP TRIGGER IF EXISTS trg_rh_cal_escopo_gerencias ON public.rh_org_gerencias;
CREATE TRIGGER trg_rh_cal_escopo_gerencias
AFTER INSERT OR UPDATE OR DELETE ON public.rh_org_gerencias
FOR EACH STATEMENT EXECUTE FUNCTION public._rh_calendario_marcar_escopo_alterado();

DROP TRIGGER IF EXISTS trg_rh_cal_escopo_times ON public.rh_org_times;
CREATE TRIGGER trg_rh_cal_escopo_times
AFTER INSERT OR UPDATE OR DELETE ON public.rh_org_times
FOR EACH STATEMENT EXECUTE FUNCTION public._rh_calendario_marcar_escopo_alterado();

DROP TRIGGER IF EXISTS trg_rh_cal_escopo_funcionarios ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_cal_escopo_funcionarios
AFTER INSERT OR UPDATE OF status, org_diretoria_id, org_gerencia_id, org_time_id, email, email_spin
OR DELETE ON public.rh_funcionarios
FOR EACH STATEMENT EXECUTE FUNCTION public._rh_calendario_marcar_escopo_alterado();

-- ----------------------------------------------------------------------------
-- 2. Helpers de permissão e identidade do usuário logado.
-- ----------------------------------------------------------------------------

-- Valor efetivo da permissão da página rh_calendario para o usuário logado
-- (p_need: view | create | edit | delete → 'sim' | 'proprios' | 'nao').
CREATE OR REPLACE FUNCTION public._rh_calendario_permissao_valor(p_need text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_valor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'nao';
  END IF;

  SELECT p.role::text
  INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN 'sim';
  END IF;

  IF v_role = 'prestador'
    AND NOT public._prestador_page_perm('rh_calendario', p_need)
  THEN
    RETURN 'nao';
  END IF;

  IF v_role = 'gestor'
    AND NOT public._gestor_page_perm('rh_calendario', p_need)
  THEN
    RETURN 'nao';
  END IF;

  SELECT CASE p_need
    WHEN 'view' THEN rp.can_view::text
    WHEN 'create' THEN rp.can_criar::text
    WHEN 'edit' THEN rp.can_editar::text
    WHEN 'delete' THEN rp.can_excluir::text
    ELSE 'nao'
  END
  INTO v_valor
  FROM public.role_permissions rp
  WHERE rp.role::text = v_role
    AND rp.page_key = 'rh_calendario'
  LIMIT 1;

  RETURN coalesce(v_valor, 'nao');
END;
$$;

-- rh_funcionarios.id do usuário logado (match por e-mail pessoal ou Spin).
CREATE OR REPLACE FUNCTION public._rh_funcionario_login_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id
  FROM public.rh_funcionarios f
  LEFT JOIN auth.users u ON u.id = auth.uid()
  LEFT JOIN public.profiles p ON p.id = auth.uid()
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, p.email, '')))
      OR (
        trim(coalesce(f.email_spin, '')) <> ''
        AND lower(trim(f.email_spin)) = lower(trim(coalesce(u.email::text, p.email, '')))
      )
    )
  ORDER BY f.updated_at DESC NULLS LAST
  LIMIT 1
$$;

-- ----------------------------------------------------------------------------
-- 3. Conjuntos de escopo (materializados uma vez por chamada).
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public._rh_calendario_funcionarios_escopo_por_permissao(text);
CREATE FUNCTION public._rh_calendario_funcionarios_escopo_por_permissao(p_need text)
RETURNS TABLE (funcionario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  perm AS (
    SELECT public._rh_calendario_permissao_valor(p_need) AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  ),
  diretorias_lideradas AS (
    SELECT d.id
    FROM public.rh_org_diretorias d, me
    WHERE d.status = 'ativo'
      AND d.diretor_funcionario_id = me.id
  ),
  gerencias_lideradas AS (
    SELECT g.id
    FROM public.rh_org_gerencias g, me
    WHERE g.status = 'ativo'
      AND g.gerente_funcionario_id = me.id
  ),
  times_liderados AS (
    SELECT t.id
    FROM public.rh_org_times t, me
    WHERE t.status = 'ativo'
      AND t.lider_funcionario_id = me.id
  ),
  gerencias_no_escopo AS (
    SELECT gl.id FROM gerencias_lideradas gl
    UNION
    SELECT g.id
    FROM public.rh_org_gerencias g
    WHERE g.status = 'ativo'
      AND g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
  ),
  times_no_escopo AS (
    SELECT tl.id FROM times_liderados tl
    UNION
    SELECT t.id
    FROM public.rh_org_times t
    WHERE t.status = 'ativo'
      AND t.gerencia_id IN (SELECT id FROM gerencias_no_escopo)
  ),
  lideres_no_escopo AS (
    SELECT d.diretor_funcionario_id AS id
    FROM public.rh_org_diretorias d
    WHERE d.status = 'ativo'
      AND d.id IN (SELECT id FROM diretorias_lideradas)
    UNION
    SELECT g.gerente_funcionario_id
    FROM public.rh_org_gerencias g
    WHERE g.status = 'ativo'
      AND g.id IN (SELECT id FROM gerencias_no_escopo)
    UNION
    SELECT t.lider_funcionario_id
    FROM public.rh_org_times t
    WHERE t.status = 'ativo'
      AND t.id IN (SELECT id FROM times_no_escopo)
  )
  SELECT DISTINCT f.id
  FROM public.rh_funcionarios f
  CROSS JOIN perm
  CROSS JOIN me
  WHERE f.status IN ('ativo', 'indisponivel')
    AND (
      perm.valor = 'sim'
      OR (
        perm.valor = 'proprios'
        AND (
          f.id = me.id
          OR f.id IN (SELECT id FROM lideres_no_escopo WHERE id IS NOT NULL)
          OR f.org_diretoria_id IN (SELECT id FROM diretorias_lideradas)
          OR f.org_gerencia_id IN (SELECT id FROM gerencias_no_escopo)
          OR f.org_time_id IN (SELECT id FROM times_no_escopo)
        )
      )
    )
$$;

DROP FUNCTION IF EXISTS public._rh_calendario_funcionarios_escopo();
CREATE FUNCTION public._rh_calendario_funcionarios_escopo()
RETURNS TABLE (funcionario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.funcionario_id
  FROM public._rh_calendario_funcionarios_escopo_por_permissao('view') e
$$;

CREATE OR REPLACE FUNCTION public._rh_calendario_funcionario_no_escopo(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public._rh_calendario_funcionarios_escopo() e
    WHERE e.funcionario_id = p_funcionario_id
  )
$$;

-- Conjunto de funcionários sobre os quais o usuário pode agir (aprovar/corrigir).
-- Uma única passada: interseção dos escopos de Ver e Editar, sem reavaliar a
-- cascata por funcionário (evita custo quadrático no carregamento dos filtros).
DROP FUNCTION IF EXISTS public.rh_calendario_funcionarios_gerenciaveis();
CREATE FUNCTION public.rh_calendario_funcionarios_gerenciaveis()
RETURNS TABLE (funcionario_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  perm_edit AS (
    SELECT public._rh_calendario_permissao_valor('edit') AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  )
  SELECT v.funcionario_id
  FROM public._rh_calendario_funcionarios_escopo_por_permissao('view') v
  INNER JOIN public._rh_calendario_funcionarios_escopo_por_permissao('edit') e
    ON e.funcionario_id = v.funcionario_id
  CROSS JOIN perm_edit
  CROSS JOIN me
  WHERE perm_edit.valor = 'sim'
     OR (perm_edit.valor = 'proprios' AND v.funcionario_id IS DISTINCT FROM me.id)
$$;

CREATE OR REPLACE FUNCTION public._rh_calendario_funcionario_gerenciavel(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_calendario_funcionarios_gerenciaveis() g
    WHERE g.funcionario_id = p_funcionario_id
  )
$$;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_editar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public._rh_calendario_permissao_valor('edit') IN ('sim', 'proprios')
    AND public._rh_calendario_funcionario_no_escopo(p_funcionario_id)
    AND EXISTS (
      SELECT 1
      FROM public._rh_calendario_funcionarios_escopo_por_permissao('edit') e
      WHERE e.funcionario_id = p_funcionario_id
    )
$$;

-- ----------------------------------------------------------------------------
-- 4. RPCs de identidade, versão e listas autorizadas (filtros do Calendário).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rh_calendario_meu_funcionario_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public._rh_calendario_permissao_valor('view') IN ('sim', 'proprios')
      THEN public._rh_funcionario_login_id()
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_escopo_versao()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public._rh_calendario_permissao_valor('view') IN ('sim', 'proprios')
      THEN (SELECT v.updated_at FROM public.rh_calendario_escopo_versao v WHERE v.singleton)
    ELSE NULL
  END
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_funcionarios_visiveis();
CREATE FUNCTION public.rh_calendario_funcionarios_visiveis()
RETURNS TABLE (
  id uuid,
  status text,
  nome text,
  org_diretoria_id uuid,
  org_gerencia_id uuid,
  org_time_id uuid,
  area_atuacao text,
  escala text,
  staff_turno text,
  staff_horario_turno text,
  staff_operadora_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.status,
    f.nome,
    f.org_diretoria_id,
    f.org_gerencia_id,
    f.org_time_id,
    f.area_atuacao,
    f.escala,
    f.staff_turno,
    f.staff_horario_turno,
    f.staff_operadora_slug
  FROM public.rh_funcionarios f
  INNER JOIN public._rh_calendario_funcionarios_escopo() e
    ON e.funcionario_id = f.id
  ORDER BY f.nome
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_times_visiveis();
CREATE FUNCTION public.rh_calendario_times_visiveis()
RETURNS TABLE (
  id uuid,
  nome text,
  gerencia_id uuid,
  gerencia_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  perm AS (
    SELECT public._rh_calendario_permissao_valor('view') AS valor
  ),
  me AS (
    SELECT public._rh_funcionario_login_id() AS id
  ),
  diretorias_lideradas AS (
    SELECT d.id
    FROM public.rh_org_diretorias d, me
    WHERE d.status = 'ativo' AND d.diretor_funcionario_id = me.id
  ),
  gerencias_lideradas AS (
    SELECT g.id
    FROM public.rh_org_gerencias g, me
    WHERE g.status = 'ativo' AND g.gerente_funcionario_id = me.id
  )
  SELECT t.id, t.nome, t.gerencia_id, g.nome AS gerencia_nome
  FROM public.rh_org_times t
  INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
  CROSS JOIN perm
  CROSS JOIN me
  WHERE t.status = 'ativo'
    AND (
      perm.valor = 'sim'
      OR (
        perm.valor = 'proprios'
        AND (
          t.lider_funcionario_id = me.id
          OR t.id IN (
            SELECT f.org_time_id
            FROM public.rh_funcionarios f
            WHERE f.id = me.id AND f.org_time_id IS NOT NULL
          )
          OR t.gerencia_id IN (SELECT id FROM gerencias_lideradas)
          OR g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
        )
      )
    )
  ORDER BY t.nome
$$;

-- Mantém consumidores externos do helper (Gestão de Escala e Overview Prestador)
-- e aplica o novo escopo quando a permissão efetiva do Calendário está presente.
CREATE OR REPLACE FUNCTION public._rh_calendario_pode_acessar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cal_perm text := public._rh_calendario_permissao_valor('view');
  v_me uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN true;
  END IF;

  IF v_cal_perm IN ('sim', 'proprios') THEN
    RETURN public._rh_calendario_funcionario_no_escopo(p_funcionario_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_gestao_escala'
      AND rp.can_view IN ('sim', 'proprios')
  ) THEN
    RETURN true;
  END IF;

  IF public._prestador_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key = 'dash_overview_prestador'
        AND rp.can_view IN ('sim', 'proprios')
    )
  THEN
    IF NOT public._dash_escopo_proprios_prestador() THEN
      RETURN true;
    END IF;
    v_me := public._rh_funcionario_login_id();
    RETURN v_me IS NOT NULL AND p_funcionario_id = v_me;
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPCs de dados do Calendário (grade, reuniões, ponto, presença).
-- ----------------------------------------------------------------------------

-- RPC exclusiva do Calendário: grade aprovada do Estúdio + escala sintética
-- de Escritório (seg–sex Comercial 09h–18h; sáb/dom Folga).
DROP FUNCTION IF EXISTS public.rh_calendario_grade_mes(date);
CREATE FUNCTION public.rh_calendario_grade_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  limites AS (
    SELECT
      date_trunc('month', p_ref_mes)::date AS ref0,
      (date_trunc('month', p_ref_mes) + interval '1 month - 1 day')::date AS ref1
  ),
  visiveis AS (
    SELECT f.*
    FROM public.rh_funcionarios f
    INNER JOIN public._rh_calendario_funcionarios_escopo() e ON e.funcionario_id = f.id
  ),
  grade_estudio AS (
    SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes
      AND s.area_key = g.area_key
      AND s.status = 'aprovada'
    INNER JOIN visiveis f ON f.id = g.funcionario_id
    CROSS JOIN limites l
    WHERE g.ref_mes = l.ref0
      AND coalesce(f.area_atuacao, 'estudio') <> 'escritorio'
  ),
  grade_escritorio AS (
    SELECT
      f.id AS funcionario_id,
      d.dia::date AS dia_iso,
      CASE
        WHEN extract(isodow FROM d.dia) BETWEEN 1 AND 5 THEN 'Comercial'
        ELSE 'Folga'
      END::text AS valor,
      'escritorio'::text AS area_key
    FROM visiveis f
    CROSS JOIN limites l
    CROSS JOIN LATERAL generate_series(l.ref0, l.ref1, interval '1 day') d(dia)
    WHERE f.area_atuacao = 'escritorio'
  )
  SELECT * FROM grade_estudio
  UNION ALL
  SELECT * FROM grade_escritorio
  ORDER BY funcionario_id, dia_iso
$$;

-- Reuniões do mês: escopo resolvido por JOIN (esc.funcionario_id IS NOT NULL)
-- em vez de checagem por linha.
DROP FUNCTION IF EXISTS public.rh_calendario_reunioes_mes(date);
CREATE FUNCTION public.rh_calendario_reunioes_mes(p_ref_mes date)
RETURNS TABLE (
  id uuid,
  solicitante_funcionario_id uuid,
  solicitante_nome text,
  dia_iso date,
  reuniao_com text,
  reuniao_com_label text,
  motivo text,
  turno text,
  status text,
  created_at timestamptz,
  solicitacao_status text,
  observacao_rh text,
  atendente_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_perm text := public._rh_calendario_permissao_valor('view');
  v_me uuid := public._rh_funcionario_login_id();
  v_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL OR v_perm NOT IN ('sim', 'proprios') THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  INTO v_admin;

  RETURN QUERY
  SELECT
    a.id,
    a.solicitante_funcionario_id,
    trim(coalesce(f.nome, ''))::text AS solicitante_nome,
    left(trim(a.payload->>'dia_iso'), 10)::date AS dia_iso,
    trim(coalesce(a.payload->>'reuniao_com', ''))::text AS reuniao_com,
    trim(coalesce(a.payload->>'reuniao_com_label', ''))::text AS reuniao_com_label,
    trim(coalesce(a.payload->>'motivo', ''))::text AS motivo,
    trim(coalesce(a.payload->>'turno', ''))::text AS turno,
    a.status,
    a.created_at,
    s.status::text AS solicitacao_status,
    trim(coalesce(s.observacao_rh, ''))::text AS observacao_rh,
    trim(coalesce(pa.name, ''))::text AS atendente_nome
  FROM public.rh_calendario_acoes a
  LEFT JOIN public.rh_funcionarios f
    ON f.id = a.solicitante_funcionario_id
    AND f.status IN ('ativo', 'indisponivel')
  LEFT JOIN public.rh_solicitacoes s
    ON s.rh_calendario_acao_id = a.id
    AND s.tipo = 'reuniao_rh'
  LEFT JOIN public.profiles pa ON pa.id = s.atendido_por
  LEFT JOIN public._rh_calendario_funcionarios_escopo() esc
    ON esc.funcionario_id = a.solicitante_funcionario_id
  WHERE a.tipo_acao = 'agendamento_reuniao'
    AND coalesce(trim(a.payload->>'dia_iso'), '') <> ''
    AND length(trim(a.payload->>'dia_iso')) >= 10
    AND date_trunc('month', left(trim(a.payload->>'dia_iso'), 10)::date) = v_ref
    AND (
      (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NOT NULL
        AND (
          a.solicitante_funcionario_id = v_me
          OR v_admin
          OR v_perm = 'sim'
          OR (
            s.status IN ('aprovado', 'rejeitado')
            AND auth.uid() = s.atendido_por
          )
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) <> 'rh'
        AND a.status = 'Agendado'
        AND (
          esc.funcionario_id IS NOT NULL
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'shift_lead'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'shift_leader'
            )
          )
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'figurino'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.role = 'figurino'
            )
          )
          OR (
            trim(coalesce(a.payload->>'reuniao_com', '')) = 'gerente_operacoes'
            AND EXISTS (
              SELECT 1
              FROM public.user_scopes sc
              WHERE sc.user_id = auth.uid()
                AND sc.scope_type = 'gestor_tipo'
                AND sc.scope_ref = 'operacoes'
            )
          )
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NULL
        AND a.status = 'Agendado'
        AND (
          a.solicitante_funcionario_id = v_me
          OR v_admin
          OR v_perm = 'sim'
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'rh'
          )
        )
      )
    )
  ORDER BY a.created_at DESC;
END;
$$;

-- Leitura de ponto respeitando o novo escopo sem quebrar o Overview Prestador.
DROP FUNCTION IF EXISTS public.rh_calendario_ponto_registros_mes(uuid, date);
CREATE FUNCTION public.rh_calendario_ponto_registros_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  dia_sp date,
  check_in_at timestamptz,
  check_out_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref0 date := date_trunc('month', p_ref_mes)::date;
  v_ref1 date := (date_trunc('month', p_ref_mes) + interval '1 month - 1 day')::date;
BEGIN
  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT gs::date AS dia
    FROM generate_series(v_ref0, v_ref1, interval '1 day') AS gs
  ),
  uids AS (
    SELECT u.id AS user_id
    FROM auth.users u
    INNER JOIN public.rh_funcionarios f ON f.id = p_funcionario_id
    WHERE lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
       OR (
         trim(coalesce(f.email_spin, '')) <> ''
         AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
       )
  ),
  agg AS (
    SELECT r.dia_sp,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS ci,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS co
    FROM public.prestador_ponto_registros r
    WHERE r.dia_sp >= v_ref0
      AND r.dia_sp <= v_ref1
      AND (
        r.funcionario_id = p_funcionario_id
        OR r.user_id IN (SELECT uids.user_id FROM uids)
      )
    GROUP BY r.dia_sp
  )
  SELECT days.dia, agg.ci, agg.co
  FROM days
  LEFT JOIN agg ON agg.dia_sp = days.dia
  ORDER BY 1;
END;
$$;

-- Escritas de presença exigem Editar no Calendário e funcionário no escopo.
CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_gestao_salvar(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_status_gestao text,
  p_correcao jsonb,
  p_justificativa jsonb,
  p_historico jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia_registro date;
  v_j jsonb;
BEGIN
  IF NOT public._rh_calendario_pode_editar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar gestão de presença.';
  END IF;

  IF p_status_gestao IS NOT NULL AND p_status_gestao NOT IN ('aprovado', 'em_analise') THEN
    RAISE EXCEPTION 'status_gestao inválido.';
  END IF;

  v_j := p_justificativa;
  IF v_j IS NOT NULL AND coalesce(v_j->>'motivo', '') = 'medico' THEN
    v_dia_registro := coalesce(
      nullif(trim(coalesce(v_j->>'atestadoDiaRegistro', '')), '')::date,
      p_dia_iso
    );
    v_j := jsonb_set(v_j, '{atestadoDiaRegistro}', to_jsonb(v_dia_registro::text));
  END IF;

  INSERT INTO public.rh_calendario_presenca_gestao (
    funcionario_id, dia_iso, status_gestao, correcao, justificativa, historico, updated_at
  )
  VALUES (
    p_funcionario_id, p_dia_iso, p_status_gestao, p_correcao, v_j,
    coalesce(p_historico, '[]'::jsonb), now()
  )
  ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
    status_gestao = EXCLUDED.status_gestao,
    correcao = EXCLUDED.correcao,
    justificativa = EXCLUDED.justificativa,
    historico = EXCLUDED.historico,
    updated_at = now();

  IF v_j IS NOT NULL
    AND coalesce(v_j->>'motivo', '') = 'medico'
    AND p_dia_iso = v_dia_registro
  THEN
    PERFORM public._rh_solicitacao_sync_calendario_atestado(
      p_funcionario_id,
      p_dia_iso,
      v_j
    );
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_presenca_aprovacao_mes_salvar(uuid, date, text);
CREATE FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(
  p_funcionario_id uuid,
  p_ref_mes date,
  p_aprovado_por_nome text
)
RETURNS TABLE (
  aprovado_em timestamptz,
  aprovado_por uuid,
  aprovado_por_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_now timestamptz := now();
  v_nome text := nullif(trim(coalesce(p_aprovado_por_nome, '')), '');
BEGIN
  IF NOT public._rh_calendario_pode_editar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar presença do mês.';
  END IF;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Nome do aprovador é obrigatório.';
  END IF;

  INSERT INTO public.rh_calendario_presenca_aprovacao_mes (
    funcionario_id, ref_mes, aprovado_em, aprovado_por, aprovado_por_nome
  )
  VALUES (p_funcionario_id, v_ref, v_now, auth.uid(), v_nome)
  ON CONFLICT (funcionario_id, ref_mes) DO UPDATE SET
    aprovado_em = EXCLUDED.aprovado_em,
    aprovado_por = EXCLUDED.aprovado_por,
    aprovado_por_nome = EXCLUDED.aprovado_por_nome;

  RETURN QUERY
  SELECT a.aprovado_em, a.aprovado_por, a.aprovado_por_nome
  FROM public.rh_calendario_presenca_aprovacao_mes a
  WHERE a.funcionario_id = p_funcionario_id
    AND a.ref_mes = v_ref;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Privilégios — helpers internos sem EXECUTE; RPCs expostas a authenticated.
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public._rh_calendario_marcar_escopo_alterado() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_permissao_valor(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_funcionario_login_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_funcionarios_escopo_por_permissao(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_funcionarios_escopo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_funcionario_no_escopo(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_funcionario_gerenciavel(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._rh_calendario_pode_editar_funcionario(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rh_calendario_meu_funcionario_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_escopo_versao() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_funcionarios_visiveis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_times_visiveis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_grade_mes(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_reunioes_mes(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(uuid, date, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_calendario_meu_funcionario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_escopo_versao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_funcionarios_visiveis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_times_visiveis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_mes(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_reunioes_mes(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(uuid, date, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Comentários.
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION public._rh_calendario_funcionarios_escopo() IS
  'Calendário RH: Ver sim retorna todos; Ver próprios retorna o próprio funcionário e a cascata dos ramos onde é líder explícito.';
COMMENT ON FUNCTION public.rh_calendario_funcionarios_gerenciaveis() IS
  'Funcionários sobre os quais o usuário logado pode agir no Calendário (aprovar/corrigir presença). Interseção dos escopos Ver e Editar materializada uma única vez por chamada.';
COMMENT ON FUNCTION public.rh_calendario_grade_mes(date) IS
  'Calendário RH: grade aprovada do Estúdio e escala sintética de Escritório (seg-sex Comercial; fim de semana Folga).';

COMMIT;
