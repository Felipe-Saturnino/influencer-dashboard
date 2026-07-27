-- Snapshot do turno (e horário) por prestador/mês/área na aprovação da grade.
-- Evita que mudança em rh_funcionarios.staff_turno altere meses já aprovados.
-- Restaura histórico em aprovar/resetar e limpa log de alterações no reset.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_gestao_escala_turno_mes (
  ref_mes date NOT NULL,
  area_key text NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  staff_turno text NOT NULL,
  staff_horario_turno text NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ref_mes, area_key, funcionario_id)
);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_turno_mes_ref_area_idx
  ON public.rh_gestao_escala_turno_mes (ref_mes, area_key);

COMMENT ON TABLE public.rh_gestao_escala_turno_mes IS
  'Turno de referência congelado na aprovação da Gestão de Escala (por mês/área/prestador).';

ALTER TABLE public.rh_gestao_escala_turno_mes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_gestao_escala_turno_mes FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_gestao_escala_turno_mes FROM authenticated;

-- Inferência de turno a partir das células (MRN/AFT/NGT/Comercial) — moda; empate: Manhã > Tarde > Noite > Comercial.
CREATE OR REPLACE FUNCTION public._rh_gestao_escala_inferir_turno_celulas(
  p_ref_mes date,
  p_area_key text,
  p_funcionario_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH cnt AS (
    SELECT
      CASE btrim(g.valor)
        WHEN 'MRN' THEN 'Manhã'
        WHEN 'AFT' THEN 'Tarde'
        WHEN 'NGT' THEN 'Noite'
        WHEN 'Comercial' THEN 'Comercial'
        ELSE NULL
      END AS turno_nome,
      count(*)::int AS n
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
      AND g.area_key = lower(btrim(p_area_key))
      AND g.funcionario_id = p_funcionario_id
      AND btrim(COALESCE(g.valor, '')) IN ('MRN', 'AFT', 'NGT', 'Comercial')
    GROUP BY 1
  )
  SELECT c.turno_nome
  FROM cnt c
  WHERE c.turno_nome IS NOT NULL
  ORDER BY
    c.n DESC,
    CASE c.turno_nome
      WHEN 'Manhã' THEN 1
      WHEN 'Tarde' THEN 2
      WHEN 'Noite' THEN 3
      WHEN 'Comercial' THEN 4
      ELSE 9
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._rh_gestao_escala_snapshot_turnos_area(
  p_ref_mes date,
  p_area_key text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
BEGIN
  DELETE FROM public.rh_gestao_escala_turno_mes t
  WHERE t.ref_mes = v_ref AND t.area_key = v_area;

  INSERT INTO public.rh_gestao_escala_turno_mes (
    ref_mes, area_key, funcionario_id, staff_turno, staff_horario_turno
  )
  SELECT
    v_ref,
    v_area,
    ids.funcionario_id,
    COALESCE(
      NULLIF(btrim(f.staff_turno), ''),
      public._rh_gestao_escala_inferir_turno_celulas(v_ref, v_area, ids.funcionario_id),
      'Manhã'
    ),
    NULLIF(btrim(f.staff_horario_turno), '')
  FROM (
    SELECT DISTINCT g.funcionario_id
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area
  ) ids
  INNER JOIN public.rh_funcionarios f ON f.id = ids.funcionario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_turno_mes_listar(
  p_ref_mes date,
  p_area_key text DEFAULT NULL
)
RETURNS TABLE (
  area_key text,
  funcionario_id uuid,
  staff_turno text,
  staff_horario_turno text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(COALESCE(p_area_key, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_gestao_escala', 'view')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_gestao_escala', 'rh_calendario', 'escala_rotacao')
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT t.area_key, t.funcionario_id, t.staff_turno, t.staff_horario_turno
  FROM public.rh_gestao_escala_turno_mes t
  WHERE t.ref_mes = v_ref
    AND (v_area = '' OR t.area_key = v_area);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_turno_mes_listar(date, text) IS
  'Lista snapshots de turno da grade aprovada no mês (opcionalmente por área).';

REVOKE ALL ON FUNCTION public.rh_gestao_escala_turno_mes_listar(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_turno_mes_listar(date, text) TO authenticated;

-- ─── Aprovar: status + snapshot + histórico ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_aprovar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_ok_perm boolean;
  v_now timestamptz := now();
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin'
  )
  OR (
    public._prestador_page_perm('rh_gestao_escala', 'create')
    OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = v_uid
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND (
        rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
      )
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = v_ref AND g.area_key = v_area
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_grade');
  END IF;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  VALUES (v_ref, v_area, 'aprovada', v_now, v_uid)
  ON CONFLICT (ref_mes, area_key) DO UPDATE SET
    status = 'aprovada',
    aprovado_em = v_now,
    aprovado_por = v_uid;

  PERFORM public._rh_gestao_escala_snapshot_turnos_area(v_ref, v_area);

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'aprovar', '{}'::jsonb);

  RETURN jsonb_build_object(
    'ok', true,
    'aprovado_em', v_now::text,
    'aprovado_por', v_uid::text
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) IS
  'Marca a grade como aprovada, congela turno/horário por prestador e registra histórico.';

-- ─── Resetar: histórico + limpa alterações + grade + status + snapshots ─────

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_resetar(p_ref_mes date, p_area_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  v_ok_perm boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR (
    public._prestador_page_perm('rh_gestao_escala', 'create')
    OR public._prestador_page_perm('rh_gestao_escala', 'edit')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND p.role IS DISTINCT FROM 'prestador'
      AND rp.page_key = 'rh_gestao_escala'
      AND (
        rp.can_criar IN ('sim', 'proprios')
        OR rp.can_editar IN ('sim', 'proprios')
      )
  )
  INTO v_ok_perm;

  IF NOT v_ok_perm THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_area IS NULL OR v_area = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_area');
  END IF;

  PERFORM public._rh_gestao_escala_historico_inserir(v_ref, v_area, 'nova_escala', '{}'::jsonb);

  DELETE FROM public.rh_gestao_escala_grade_alteracao a
  WHERE a.ref_mes = v_ref AND a.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_turno_mes t
  WHERE t.ref_mes = v_ref AND t.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) IS
  'Remove células, status, snapshots de turno e log de alterações; registra Nova Escala no histórico.';

-- ─── Backfill: meses já aprovados sem snapshot ───────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT s.ref_mes, s.area_key
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.status = 'aprovada'
      AND NOT EXISTS (
        SELECT 1
        FROM public.rh_gestao_escala_turno_mes t
        WHERE t.ref_mes = s.ref_mes AND t.area_key = s.area_key
      )
  LOOP
    PERFORM public._rh_gestao_escala_snapshot_turnos_area(r.ref_mes, r.area_key);
  END LOOP;
END $$;

-- ─── Rotação: pool pelo valor da célula do dia (não pelo staff_turno atual) ──

CREATE OR REPLACE FUNCTION public.escala_rotacao_contexto_dia(
  p_dia date,
  p_turno text,
  p_estudio_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno text := lower(btrim(p_turno));
  v_estudio text := btrim(p_estudio_slug);
  v_ref date := date_trunc('month', p_dia)::date;
  v_status text;
  v_aprovada boolean := false;
  v_estudio_nome text;
  v_inicio time;
  v_fim time;
  v_inicio_txt text;
  v_fim_txt text;
  v_gps jsonb := '[]'::jsonb;
  v_mesas jsonb := '[]'::jsonb;
  v_turno_label text;
BEGIN
  IF NOT public._escala_rotacao_perm('view')
     AND NOT public._escala_rotacao_perm('create') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  IF v_turno NOT IN ('manha', 'tarde', 'noite') THEN
    RAISE EXCEPTION 'turno_invalido';
  END IF;

  IF v_estudio = '' OR v_estudio = 'todos' THEN
    RAISE EXCEPTION 'estudio_obrigatorio';
  END IF;

  SELECT e.nome,
         CASE v_turno
           WHEN 'manha' THEN e.turno_manha_inicio
           WHEN 'tarde' THEN e.turno_tarde_inicio
           ELSE e.turno_noite_inicio
         END
  INTO v_estudio_nome, v_inicio
  FROM public.estudios_spin e
  WHERE e.slug = v_estudio AND e.ativo IS TRUE;

  IF v_estudio_nome IS NULL THEN
    RAISE EXCEPTION 'estudio_nao_encontrado';
  END IF;

  IF v_inicio IS NULL THEN
    v_inicio := CASE v_turno
      WHEN 'manha' THEN time '06:00'
      WHEN 'tarde' THEN time '12:00'
      ELSE time '18:00'
    END;
  END IF;

  v_fim := (v_inicio + interval '8 hours')::time;
  v_inicio_txt := to_char(v_inicio, 'HH24:MI');
  v_fim_txt := to_char(v_fim, 'HH24:MI');
  v_turno_label := CASE v_turno
    WHEN 'manha' THEN 'Manhã'
    WHEN 'tarde' THEN 'Tarde'
    ELSE 'Noite'
  END;

  SELECT s.status INTO v_status
  FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = 'game_presenter';

  v_aprovada := lower(btrim(COALESCE(v_status, ''))) = 'aprovada';

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'mesa_identificacao', m.mesa_identificacao,
      'nome_mesa', m.nome_mesa,
      'tipo_jogo', m.tipo_jogo,
      'numero_mesa', m.numero_mesa
    )
    ORDER BY m.numero_mesa NULLS LAST, m.nome_mesa, m.mesa_identificacao
  ), '[]'::jsonb)
  INTO v_mesas
  FROM public.mesas_spin_cadastro m
  WHERE m.estudio_slug = v_estudio
    AND btrim(COALESCE(m.numero_mesa, '')) <> '';

  IF v_aprovada THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'funcionario_id', f.id,
        'nome', f.nome,
        'nickname', COALESCE(NULLIF(btrim(f.staff_nickname), ''), ''),
        'staff_turno', COALESCE(tm.staff_turno, f.staff_turno),
        'escala', f.escala
      )
      ORDER BY f.nome
    ), '[]'::jsonb)
    INTO v_gps
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    INNER JOIN public.rh_gestao_escala_grade gr
      ON gr.funcionario_id = f.id
     AND gr.ref_mes = v_ref
     AND gr.area_key = 'game_presenter'
     AND gr.dia_iso = p_dia
    LEFT JOIN public.rh_gestao_escala_turno_mes tm
      ON tm.ref_mes = v_ref
     AND tm.area_key = 'game_presenter'
     AND tm.funcionario_id = f.id
    WHERE f.status IN ('ativo', 'indisponivel')
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
      AND lower(replace(regexp_replace(COALESCE(f.escala, ''), '\s+', '', 'g'), '×', 'x')) = '4x2'
      AND (
        (v_turno = 'manha' AND btrim(COALESCE(gr.valor, '')) = 'MRN')
        OR (v_turno = 'tarde' AND btrim(COALESCE(gr.valor, '')) = 'AFT')
        OR (v_turno = 'noite' AND btrim(COALESCE(gr.valor, '')) = 'NGT')
      )
      AND (
        (
          f.staff_estudio_slugs IS NOT NULL
          AND (
            'todos' = ANY (f.staff_estudio_slugs)
            OR v_estudio = ANY (f.staff_estudio_slugs)
          )
        )
        OR (
          (f.staff_estudio_slugs IS NULL OR cardinality(f.staff_estudio_slugs) = 0)
          AND f.staff_estudio_slug IS NOT NULL
          AND btrim(f.staff_estudio_slug) = v_estudio
        )
      );
  END IF;

  RETURN jsonb_build_object(
    'dia', p_dia,
    'turno', v_turno,
    'turno_label', v_turno_label,
    'estudio_slug', v_estudio,
    'estudio_nome', v_estudio_nome,
    'escala_aprovada', v_aprovada,
    'turno_inicio', v_inicio_txt,
    'turno_fim', v_fim_txt,
    'horario_texto',
      to_char(v_inicio, 'HH24') || 'h' ||
      CASE WHEN EXTRACT(MINUTE FROM v_inicio) = 0 THEN '' ELSE to_char(v_inicio, 'MI') END ||
      ' às ' ||
      to_char(v_fim, 'HH24') || 'h' ||
      CASE WHEN EXTRACT(MINUTE FROM v_fim) = 0 THEN '' ELSE to_char(v_fim, 'MI') END,
    'gps', COALESCE(v_gps, '[]'::jsonb),
    'mesas', COALESCE(v_mesas, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) IS
  'Pool de GPs 4x2 escalados no dia (célula MRN/AFT/NGT da grade) + mesas + horário 8h do estúdio.';

COMMIT;
