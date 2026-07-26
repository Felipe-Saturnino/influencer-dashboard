-- Rotação: pool de Shift Lead no contexto do dia (reserva para cobrir mesas).
-- Aplicar no SQL Editor do Supabase se o deploy de migrations não estiver ligado ao projeto.

BEGIN;

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
  v_shift_leads jsonb := '[]'::jsonb;
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

    -- Shift Lead do mesmo dia/turno/estúdio (reserva para cobrir mesas)
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
    INTO v_shift_leads
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    INNER JOIN public.rh_gestao_escala_grade gr
      ON gr.funcionario_id = f.id
     AND gr.ref_mes = v_ref
     AND gr.area_key = 'shift_leader'
     AND gr.dia_iso = p_dia
    LEFT JOIN public.rh_gestao_escala_turno_mes tm
      ON tm.ref_mes = v_ref
     AND tm.area_key = 'shift_leader'
     AND tm.funcionario_id = f.id
    WHERE f.status IN ('ativo', 'indisponivel')
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%'
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
    'shift_leads', COALESCE(v_shift_leads, '[]'::jsonb),
    'mesas', COALESCE(v_mesas, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) IS
  'Pool de GPs 4x2 + Shift Leads escalados no dia (MRN/AFT/NGT) + mesas + horário 8h do estúdio.';

COMMIT;
