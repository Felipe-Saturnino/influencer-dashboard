-- Escopo de liderança no Organograma (cascata) para Ver/Criar/Editar = Próprios
-- em Overview Prestador, Escala Escritório e Solicitações de RH.
-- Não altera o Calendário (_rh_calendario_funcionarios_escopo_por_permissao).

BEGIN;

-- ─── uuid a partir de hex32 (eo_/eog_/t_/g_) ────────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_uuid_from_hex32(p_hex text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_hex IS NULL OR p_hex !~ '^[0-9a-f]{32}$' THEN
    RETURN NULL;
  END IF;
  RETURN (
    substr(p_hex, 1, 8) || '-' ||
    substr(p_hex, 9, 4) || '-' ||
    substr(p_hex, 13, 4) || '-' ||
    substr(p_hex, 17, 4) || '-' ||
    substr(p_hex, 21, 12)
  )::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_uuid_from_hex32(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_uuid_from_hex32(text) TO authenticated;

-- ─── Resolver o prestador cuja cascata será lida ─────────────────────────────
-- NULL → login. Id explícito só se for o próprio login ou o caller for admin
-- (Simulador de Login).

CREATE OR REPLACE FUNCTION public._rh_lideranca_resolver_id(p_funcionario_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login uuid := public._rh_funcionario_login_id();
BEGIN
  IF p_funcionario_id IS NULL THEN
    RETURN v_login;
  END IF;
  IF v_login IS NOT NULL AND p_funcionario_id = v_login THEN
    RETURN p_funcionario_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RETURN p_funcionario_id;
  END IF;
  RETURN v_login;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_resolver_id(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_lideranca_eh_lider(p_me uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_me IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.rh_org_diretorias d
      WHERE d.status = 'ativo' AND d.diretor_funcionario_id = p_me
    )
    OR EXISTS (
      SELECT 1 FROM public.rh_org_gerencias g
      WHERE g.status = 'ativo' AND g.gerente_funcionario_id = p_me
    )
    OR EXISTS (
      SELECT 1 FROM public.rh_org_times t
      WHERE t.status = 'ativo' AND t.lider_funcionario_id = p_me
    )
  );
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_eh_lider(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_lideranca_diretorias_ids(p_me uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id
  FROM public.rh_org_diretorias d
  WHERE p_me IS NOT NULL
    AND d.status = 'ativo'
    AND d.diretor_funcionario_id = p_me
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_diretorias_ids(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_lideranca_gerencias_ids(p_me uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  diretorias_lideradas AS (
    SELECT public._rh_lideranca_diretorias_ids(p_me) AS id
  ),
  gerencias_lideradas AS (
    SELECT g.id
    FROM public.rh_org_gerencias g
    WHERE p_me IS NOT NULL
      AND g.status = 'ativo'
      AND g.gerente_funcionario_id = p_me
  )
  SELECT id FROM gerencias_lideradas
  UNION
  SELECT g.id
  FROM public.rh_org_gerencias g
  WHERE g.status = 'ativo'
    AND g.diretoria_id IN (SELECT id FROM diretorias_lideradas)
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_gerencias_ids(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_lideranca_times_ids(p_me uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  gerencias_no_escopo AS (
    SELECT public._rh_lideranca_gerencias_ids(p_me) AS id
  ),
  times_liderados AS (
    SELECT t.id
    FROM public.rh_org_times t
    WHERE p_me IS NOT NULL
      AND t.status = 'ativo'
      AND t.lider_funcionario_id = p_me
  )
  SELECT id FROM times_liderados
  UNION
  SELECT t.id
  FROM public.rh_org_times t
  WHERE t.status = 'ativo'
    AND t.gerencia_id IN (SELECT id FROM gerencias_no_escopo)
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_times_ids(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_lideranca_funcionario_no_escopo(p_alvo uuid, p_me uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
BEGIN
  IF p_alvo IS NULL THEN
    RETURN false;
  END IF;
  v_me := COALESCE(p_me, public._rh_lideranca_resolver_id(NULL));
  IF v_me IS NULL THEN
    RETURN public._rh_funcionario_vinculado_ao_login(p_alvo);
  END IF;
  IF p_alvo = v_me THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    WHERE f.id = p_alvo
      AND f.status IN ('ativo', 'indisponivel')
      AND (
        f.org_diretoria_id IN (SELECT public._rh_lideranca_diretorias_ids(v_me))
        OR f.org_gerencia_id IN (SELECT public._rh_lideranca_gerencias_ids(v_me))
        OR f.org_time_id IN (SELECT public._rh_lideranca_times_ids(v_me))
        OR f.id IN (
          SELECT d.diretor_funcionario_id
          FROM public.rh_org_diretorias d
          WHERE d.status = 'ativo'
            AND d.id IN (SELECT public._rh_lideranca_diretorias_ids(v_me))
            AND d.diretor_funcionario_id IS NOT NULL
          UNION
          SELECT g.gerente_funcionario_id
          FROM public.rh_org_gerencias g
          WHERE g.status = 'ativo'
            AND g.id IN (SELECT public._rh_lideranca_gerencias_ids(v_me))
            AND g.gerente_funcionario_id IS NOT NULL
          UNION
          SELECT t.lider_funcionario_id
          FROM public.rh_org_times t
          WHERE t.status = 'ativo'
            AND t.id IN (SELECT public._rh_lideranca_times_ids(v_me))
            AND t.lider_funcionario_id IS NOT NULL
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_funcionario_no_escopo(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_lideranca_funcionario_no_escopo(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public._rh_lideranca_funcionario_no_escopo(uuid, uuid) IS
  'true se o alvo é o login (ou p_me) ou está na cascata que essa pessoa lidera no Organograma.';

-- Área da Escala Escritório (eo_/eog_) está na cascata ou é o próprio vínculo.

CREATE OR REPLACE FUNCTION public._rh_lideranca_area_escritorio_ok(p_area_key text, p_me uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
  v_hex text;
  v_id uuid;
  v_org_time uuid;
  v_org_ger uuid;
BEGIN
  v_me := COALESCE(p_me, public._rh_lideranca_resolver_id(NULL));
  IF v_me IS NULL OR v_area = '' THEN
    RETURN false;
  END IF;

  SELECT f.org_time_id, f.org_gerencia_id
    INTO v_org_time, v_org_ger
  FROM public.rh_funcionarios f
  WHERE f.id = v_me;

  IF v_area LIKE 'eo\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 4);
    v_id := public._rh_uuid_from_hex32(v_hex);
    IF v_id IS NULL THEN
      RETURN false;
    END IF;
    RETURN v_id = v_org_time
      OR v_id IN (SELECT public._rh_lideranca_times_ids(v_me));
  END IF;

  IF v_area LIKE 'eog\_%' ESCAPE '\' THEN
    v_hex := substr(v_area, 5);
    v_id := public._rh_uuid_from_hex32(v_hex);
    IF v_id IS NULL THEN
      RETURN false;
    END IF;
    RETURN v_id = v_org_ger
      OR v_id IN (SELECT public._rh_lideranca_gerencias_ids(v_me));
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_lideranca_area_escritorio_ok(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_lideranca_area_escritorio_ok(text, uuid) TO authenticated;

-- RPC única para o cliente (UI + Simulador).

CREATE OR REPLACE FUNCTION public.rh_lideranca_escopo(p_funcionario_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_unidades jsonb;
  v_ids jsonb;
BEGIN
  v_me := public._rh_lideranca_resolver_id(p_funcionario_id);
  IF v_me IS NULL THEN
    RETURN jsonb_build_object(
      'funcionario_id', NULL,
      'eh_lider', false,
      'unidades', '[]'::jsonb,
      'funcionario_ids', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'tipo', u.tipo,
        'nome', u.nome,
        'gerencia_id', u.gerencia_id
      )
      ORDER BY u.nome
    ),
    '[]'::jsonb
  )
  INTO v_unidades
  FROM (
    SELECT t.id, 'time'::text AS tipo, t.nome, t.gerencia_id
    FROM public.rh_org_times t
    WHERE t.status = 'ativo'
      AND t.id IN (SELECT public._rh_lideranca_times_ids(v_me))
    UNION ALL
    SELECT g.id, 'gerencia'::text, g.nome, g.id
    FROM public.rh_org_gerencias g
    WHERE g.status = 'ativo'
      AND g.id IN (SELECT public._rh_lideranca_gerencias_ids(v_me))
      AND NOT EXISTS (
        SELECT 1
        FROM public.rh_org_times t
        WHERE t.status = 'ativo' AND t.gerencia_id = g.id
      )
  ) u;

  SELECT COALESCE(jsonb_agg(x.id), '[]'::jsonb)
  INTO v_ids
  FROM (
    SELECT DISTINCT f.id
    FROM public.rh_funcionarios f
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        f.id = v_me
        OR f.org_diretoria_id IN (SELECT public._rh_lideranca_diretorias_ids(v_me))
        OR f.org_gerencia_id IN (SELECT public._rh_lideranca_gerencias_ids(v_me))
        OR f.org_time_id IN (SELECT public._rh_lideranca_times_ids(v_me))
        OR f.id IN (
          SELECT d.diretor_funcionario_id
          FROM public.rh_org_diretorias d
          WHERE d.status = 'ativo'
            AND d.diretor_funcionario_id IS NOT NULL
            AND d.id IN (SELECT public._rh_lideranca_diretorias_ids(v_me))
          UNION
          SELECT g.gerente_funcionario_id
          FROM public.rh_org_gerencias g
          WHERE g.status = 'ativo'
            AND g.gerente_funcionario_id IS NOT NULL
            AND g.id IN (SELECT public._rh_lideranca_gerencias_ids(v_me))
          UNION
          SELECT t.lider_funcionario_id
          FROM public.rh_org_times t
          WHERE t.status = 'ativo'
            AND t.lider_funcionario_id IS NOT NULL
            AND t.id IN (SELECT public._rh_lideranca_times_ids(v_me))
        )
      )
  ) x;

  RETURN jsonb_build_object(
    'funcionario_id', v_me,
    'eh_lider', public._rh_lideranca_eh_lider(v_me),
    'unidades', v_unidades,
    'funcionario_ids', v_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_escopo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_escopo(uuid) TO authenticated;

COMMENT ON FUNCTION public.rh_lideranca_escopo(uuid) IS
  'Cascata Organograma do login (ou do prestador informado se admin): unidades lideradas + ids no escopo.';

-- Prestadores no escopo (SECURITY DEFINER) — quem tem Próprios nestas páginas
-- pode não ter Ver em rh_funcionarios / rh_organograma.

CREATE OR REPLACE FUNCTION public.rh_lideranca_prestadores(p_funcionario_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  email_spin text,
  org_time_id uuid,
  org_gerencia_id uuid,
  status text,
  staff_operadora_slug text,
  staff_estudio_slug text,
  staff_estudio_slugs text[],
  staff_id_tos text,
  area_atuacao text,
  escala text,
  staff_turno text,
  staff_horario_turno text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT public._rh_lideranca_resolver_id(p_funcionario_id) AS id
  )
  SELECT
    f.id,
    f.nome,
    f.email,
    f.email_spin,
    f.org_time_id,
    f.org_gerencia_id,
    f.status::text,
    f.staff_operadora_slug,
    f.staff_estudio_slug,
    f.staff_estudio_slugs,
    f.staff_id_tos,
    f.area_atuacao,
    f.escala,
    f.staff_turno,
    f.staff_horario_turno
  FROM public.rh_funcionarios f
  CROSS JOIN me
  WHERE me.id IS NOT NULL
    AND f.status IN ('ativo', 'indisponivel')
    AND (
      f.id = me.id
      OR f.org_diretoria_id IN (SELECT public._rh_lideranca_diretorias_ids(me.id))
      OR f.org_gerencia_id IN (SELECT public._rh_lideranca_gerencias_ids(me.id))
      OR f.org_time_id IN (SELECT public._rh_lideranca_times_ids(me.id))
      OR f.id IN (
        SELECT d.diretor_funcionario_id
        FROM public.rh_org_diretorias d
        WHERE d.status = 'ativo'
          AND d.diretor_funcionario_id IS NOT NULL
          AND d.id IN (SELECT public._rh_lideranca_diretorias_ids(me.id))
        UNION
        SELECT g.gerente_funcionario_id
        FROM public.rh_org_gerencias g
        WHERE g.status = 'ativo'
          AND g.gerente_funcionario_id IS NOT NULL
          AND g.id IN (SELECT public._rh_lideranca_gerencias_ids(me.id))
        UNION
        SELECT t.lider_funcionario_id
        FROM public.rh_org_times t
        WHERE t.status = 'ativo'
          AND t.lider_funcionario_id IS NOT NULL
          AND t.id IN (SELECT public._rh_lideranca_times_ids(me.id))
      )
    )
  ORDER BY f.nome;
$$;

REVOKE ALL ON FUNCTION public.rh_lideranca_prestadores(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_lideranca_prestadores(uuid) TO authenticated;

COMMENT ON FUNCTION public.rh_lideranca_prestadores(uuid) IS
  'Prestadores ativos no escopo de liderança do login (ou do prestador informado se admin).';

-- ─── Escala Escritório: Próprios só nas áreas da cascata ─────────────────────

CREATE OR REPLACE FUNCTION public._rh_escala_ok_ver_area(p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page text := public._rh_escala_page_for_area(p_area_key);
  v_view text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN true;
  END IF;

  SELECT rp.can_view
    INTO v_view
  FROM public.profiles p
  INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
  WHERE p.id = auth.uid()
    AND rp.page_key = v_page
  LIMIT 1;

  IF v_view = 'sim' THEN
    RETURN true;
  END IF;

  IF v_view = 'proprios' OR public._prestador_page_perm(v_page, 'view') THEN
    IF v_page = 'escala_escritorio' THEN
      RETURN public._rh_lideranca_area_escritorio_ok(p_area_key);
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_escala_ok_mutar_area(p_area_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page text := public._rh_escala_page_for_area(p_area_key);
  v_criar text;
  v_editar text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN true;
  END IF;

  SELECT rp.can_criar, rp.can_editar
    INTO v_criar, v_editar
  FROM public.profiles p
  INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
  WHERE p.id = auth.uid()
    AND rp.page_key = v_page
  LIMIT 1;

  IF v_criar = 'sim' OR v_editar = 'sim' THEN
    RETURN true;
  END IF;

  IF v_criar = 'proprios'
     OR v_editar = 'proprios'
     OR public._prestador_page_perm(v_page, 'create')
     OR public._prestador_page_perm(v_page, 'edit') THEN
    IF v_page = 'escala_escritorio' THEN
      RETURN public._rh_lideranca_area_escritorio_ok(p_area_key);
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public._rh_escala_ok_ver_area(text) IS
  'Ver escala: Sim = página; Próprios em escala_escritorio = só áreas da cascata/próprio vínculo.';
COMMENT ON FUNCTION public._rh_escala_ok_mutar_area(text) IS
  'Mutar escala: Sim = página; Próprios em escala_escritorio = só áreas da cascata/próprio vínculo.';

-- ─── Solicitações: Próprios = eu + cascata ───────────────────────────────────

CREATE OR REPLACE FUNCTION public._rh_solicitacoes_view_row(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'rh_solicitacoes'
        AND rp.can_view = 'sim'
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_view = 'proprios'
      )
      AND (
        public._rh_funcionario_vinculado_ao_login(p_funcionario_id)
        OR public._rh_lideranca_funcionario_no_escopo(p_funcionario_id)
      )
    );
$$;

COMMENT ON FUNCTION public._rh_solicitacoes_view_row(uuid) IS
  'RLS rh_solicitacoes SELECT: admin ou Ver=sim (todas); Ver=proprios = login + cascata Organograma.';

DROP POLICY IF EXISTS rh_solicitacoes_insert ON public.rh_solicitacoes;
CREATE POLICY rh_solicitacoes_insert ON public.rh_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      public._rh_solicitacoes_perm('create')
      AND public._rh_lideranca_funcionario_no_escopo(rh_funcionario_id)
    )
  );

DROP POLICY IF EXISTS rh_solicitacoes_update ON public.rh_solicitacoes;
CREATE POLICY rh_solicitacoes_update ON public.rh_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      public._rh_solicitacoes_perm('edit')
      AND public._rh_lideranca_funcionario_no_escopo(rh_funcionario_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      public._rh_solicitacoes_perm('edit')
      AND public._rh_lideranca_funcionario_no_escopo(rh_funcionario_id)
    )
  );

-- Agendar reunião: Criar/Editar Próprios no mesmo escopo.

CREATE OR REPLACE FUNCTION public.rh_solicitacoes_agendar_reuniao(
  p_prestador_id uuid,
  p_tipo text,
  p_dia_iso date,
  p_turno text,
  p_observacao text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao_id uuid;
  v_sol_id uuid;
  v_obs text := trim(coalesce(p_observacao, ''));
  v_ref date := date_trunc('month', p_dia_iso)::date;
  v_label text;
  v_com text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      (public._rh_solicitacoes_perm('create') OR public._rh_solicitacoes_perm('edit'))
      AND public._rh_lideranca_funcionario_no_escopo(p_prestador_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para agendar reunião.';
  END IF;

  IF p_tipo NOT IN ('reuniao_rh', 'reuniao_lideranca') THEN
    RAISE EXCEPTION 'Tipo de reunião inválido.';
  END IF;

  IF v_obs = '' THEN
    RAISE EXCEPTION 'Informe a observação.';
  END IF;

  IF p_dia_iso IS NULL OR p_dia_iso <= current_date THEN
    RAISE EXCEPTION 'A data da reunião deve ser um dia futuro.';
  END IF;

  IF p_tipo = 'reuniao_rh' THEN
    v_com := 'rh';
    v_label := 'RH';
  ELSE
    v_com := 'lideranca';
    v_label := 'Liderança';
  END IF;

  INSERT INTO public.rh_calendario_acoes (
    solicitante_funcionario_id,
    tipo_acao,
    status,
    ref_mes,
    payload
  )
  VALUES (
    p_prestador_id,
    'agendamento_reuniao',
    'Pendente',
    v_ref,
    jsonb_build_object(
      'dia_iso', to_char(p_dia_iso, 'YYYY-MM-DD'),
      'turno', coalesce(trim(p_turno), ''),
      'reuniao_com', v_com,
      'reuniao_com_label', v_label,
      'motivo', v_obs,
      'origem', 'solicitacoes'
    )
  )
  RETURNING id INTO v_acao_id;

  INSERT INTO public.rh_solicitacoes (
    rh_funcionario_id,
    tipo,
    status,
    descricao,
    rh_calendario_acao_id,
    reuniao_dia_iso
  )
  VALUES (
    p_prestador_id,
    p_tipo,
    'em_analise',
    v_obs,
    v_acao_id,
    p_dia_iso
  )
  RETURNING id INTO v_sol_id;

  RETURN v_sol_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_solicitacoes_agendar_reuniao(uuid, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_solicitacoes_agendar_reuniao(uuid, text, date, text, text) TO authenticated;

COMMIT;
