-- Rotação cockpit: alocação do dia, pool com estúdio efetivo, prévias rascunho.
-- Aplicar no SQL Editor do Supabase (Git ≠ migrations não faz deploy automático).
--
-- Ordem canónica da RPC escala_rotacao_contexto_dia:
--   1) Este ficheiro (cockpit)
--   2) docs/sql/escala_rotacao_incluir_lideranca.sql (última revisão — liderancas)
-- NÃO reaplicar depois: escala_rotacao_supabase.sql nem escala_rotacao_contexto_shift_lead.sql
-- (CREATE OR REPLACE antigo → downgrade silencioso da RPC).

BEGIN;

-- Modelo mais flexível (time folgado / enxuto)
ALTER TABLE public.escala_rotacao
  DROP CONSTRAINT IF EXISTS escala_rotacao_modelo_n_check;
ALTER TABLE public.escala_rotacao
  ADD CONSTRAINT escala_rotacao_modelo_n_check CHECK (modelo_n BETWEEN 1 AND 24);

-- ─── Alocação do dia (só Rotação; não altera Staff) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_rotacao_alocacao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia             date NOT NULL,
  turno           text NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  funcionario_id  uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  estudio_slug    text NOT NULL,
  origem          text NOT NULL DEFAULT 'manual'
                    CHECK (origem IN ('staff', 'manual')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dia, turno, funcionario_id)
);

CREATE INDEX IF NOT EXISTS escala_rotacao_alocacao_dia_turno_idx
  ON public.escala_rotacao_alocacao (dia, turno);
CREATE INDEX IF NOT EXISTS escala_rotacao_alocacao_estudio_idx
  ON public.escala_rotacao_alocacao (estudio_slug);

ALTER TABLE public.escala_rotacao_alocacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escala_rotacao_alocacao_select ON public.escala_rotacao_alocacao;
CREATE POLICY escala_rotacao_alocacao_select
  ON public.escala_rotacao_alocacao FOR SELECT TO authenticated
  USING (public._escala_rotacao_perm('view') OR public._escala_rotacao_perm('create'));

DROP POLICY IF EXISTS escala_rotacao_alocacao_write ON public.escala_rotacao_alocacao;
CREATE POLICY escala_rotacao_alocacao_write
  ON public.escala_rotacao_alocacao FOR ALL TO authenticated
  USING (public._escala_rotacao_perm('create') OR public._escala_rotacao_perm('edit'))
  WITH CHECK (public._escala_rotacao_perm('create') OR public._escala_rotacao_perm('edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_rotacao_alocacao TO authenticated;

COMMENT ON TABLE public.escala_rotacao_alocacao IS
  'Override de estúdio por dia/turno na Rotação (figurino: 1 GP = 1 estúdio por turno).';

-- Helper: estúdio staff “primário”
CREATE OR REPLACE FUNCTION public._escala_rotacao_estudio_staff(p_f public.rh_funcionarios)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(btrim(
      CASE
        WHEN p_f.staff_estudio_slugs IS NOT NULL
             AND cardinality(p_f.staff_estudio_slugs) > 0
             AND NOT ('todos' = ANY (p_f.staff_estudio_slugs))
          THEN p_f.staff_estudio_slugs[1]
        ELSE NULL
      END
    ), ''),
    NULLIF(btrim(COALESCE(p_f.staff_estudio_slug, '')), ''),
    ''
  );
$$;

-- ─── Alocar / remover override ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_rotacao_alocar_estudio(
  p_dia date,
  p_turno text,
  p_funcionario_id uuid,
  p_estudio_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno text := lower(btrim(p_turno));
  v_est text := btrim(p_estudio_slug);
BEGIN
  IF NOT public._escala_rotacao_perm('create') AND NOT public._escala_rotacao_perm('edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  IF v_turno NOT IN ('manha', 'tarde', 'noite') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'turno_invalido');
  END IF;
  IF v_est = '' OR v_est = 'todos' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'estudio_obrigatorio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.estudios_spin e WHERE e.slug = v_est AND e.ativo IS TRUE) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'estudio_nao_encontrado');
  END IF;

  INSERT INTO public.escala_rotacao_alocacao (dia, turno, funcionario_id, estudio_slug, origem, updated_at)
  VALUES (p_dia, v_turno, p_funcionario_id, v_est, 'manual', now())
  ON CONFLICT (dia, turno, funcionario_id)
  DO UPDATE SET estudio_slug = EXCLUDED.estudio_slug, origem = 'manual', updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_rotacao_alocar_estudio(date, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_rotacao_alocar_estudio(date, text, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.escala_rotacao_limpar_alocacao(
  p_dia date,
  p_turno text,
  p_funcionario_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._escala_rotacao_perm('create') AND NOT public._escala_rotacao_perm('edit') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;
  DELETE FROM public.escala_rotacao_alocacao
  WHERE dia = p_dia AND turno = lower(btrim(p_turno)) AND funcionario_id = p_funcionario_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_rotacao_limpar_alocacao(date, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_rotacao_limpar_alocacao(date, text, uuid) TO authenticated;

-- ─── Contexto do dia (pool com estúdio efetivo + todos GPs do turno) ─────────

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
  v_gps_outros jsonb := '[]'::jsonb;
  v_shift_leads jsonb := '[]'::jsonb;
  v_liderancas jsonb := '[]'::jsonb;
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
    -- GPs do turno com estúdio efetivo = override OU staff
    WITH base AS (
      SELECT
        f.id AS funcionario_id,
        f.nome,
        COALESCE(NULLIF(btrim(f.staff_nickname), ''), '') AS nickname,
        COALESCE(tm.staff_turno, f.staff_turno) AS staff_turno,
        f.escala,
        public._escala_rotacao_estudio_staff(f) AS estudio_staff,
        a.estudio_slug AS estudio_alocado,
        COALESCE(NULLIF(btrim(a.estudio_slug), ''), public._escala_rotacao_estudio_staff(f)) AS estudio_efetivo,
        COALESCE(a.origem, 'staff') AS alocacao_origem
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
      LEFT JOIN public.escala_rotacao_alocacao a
        ON a.dia = p_dia AND a.turno = v_turno AND a.funcionario_id = f.id
      WHERE f.status IN ('ativo', 'indisponivel')
        AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
        AND lower(replace(regexp_replace(COALESCE(f.escala, ''), '\s+', '', 'g'), '×', 'x')) = '4x2'
        AND (
          (v_turno = 'manha' AND btrim(COALESCE(gr.valor, '')) = 'MRN')
          OR (v_turno = 'tarde' AND btrim(COALESCE(gr.valor, '')) = 'AFT')
          OR (v_turno = 'noite' AND btrim(COALESCE(gr.valor, '')) = 'NGT')
        )
    )
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object(
        'funcionario_id', b.funcionario_id,
        'nome', b.nome,
        'nickname', b.nickname,
        'staff_turno', b.staff_turno,
        'escala', b.escala,
        'estudio_staff', b.estudio_staff,
        'estudio_efetivo', b.estudio_efetivo,
        'alocacao_origem', b.alocacao_origem
      ) ORDER BY b.nome) FILTER (WHERE b.estudio_efetivo = v_estudio
        OR (
          b.estudio_efetivo = ''
          AND (
            EXISTS (
              SELECT 1 FROM public.rh_funcionarios f2
              WHERE f2.id = b.funcionario_id
                AND f2.staff_estudio_slugs IS NOT NULL
                AND ('todos' = ANY (f2.staff_estudio_slugs) OR v_estudio = ANY (f2.staff_estudio_slugs))
            )
          )
        )
      ), '[]'::jsonb),
      COALESCE(jsonb_agg(jsonb_build_object(
        'funcionario_id', b.funcionario_id,
        'nome', b.nome,
        'nickname', b.nickname,
        'staff_turno', b.staff_turno,
        'escala', b.escala,
        'estudio_staff', b.estudio_staff,
        'estudio_efetivo', b.estudio_efetivo,
        'alocacao_origem', b.alocacao_origem
      ) ORDER BY b.nome) FILTER (WHERE b.estudio_efetivo IS DISTINCT FROM v_estudio
        AND NOT (
          b.estudio_efetivo = ''
          AND EXISTS (
            SELECT 1 FROM public.rh_funcionarios f2
            WHERE f2.id = b.funcionario_id
              AND f2.staff_estudio_slugs IS NOT NULL
              AND ('todos' = ANY (f2.staff_estudio_slugs) OR v_estudio = ANY (f2.staff_estudio_slugs))
          )
        )
      ), '[]'::jsonb)
    INTO v_gps, v_gps_outros
    FROM base b;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'funcionario_id', f.id,
        'nome', f.nome,
        'nickname', COALESCE(NULLIF(btrim(f.staff_nickname), ''), ''),
        'staff_turno', COALESCE(tm.staff_turno, f.staff_turno),
        'escala', f.escala,
        'estudio_staff', public._escala_rotacao_estudio_staff(f),
        'estudio_efetivo', COALESCE(
          NULLIF(btrim(a.estudio_slug), ''),
          public._escala_rotacao_estudio_staff(f)
        ),
        'alocacao_origem', COALESCE(a.origem, 'staff')
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
    LEFT JOIN public.escala_rotacao_alocacao a
      ON a.dia = p_dia AND a.turno = v_turno AND a.funcionario_id = f.id
    WHERE f.status IN ('ativo', 'indisponivel')
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%'
      AND (
        (v_turno = 'manha' AND btrim(COALESCE(gr.valor, '')) = 'MRN')
        OR (v_turno = 'tarde' AND btrim(COALESCE(gr.valor, '')) = 'AFT')
        OR (v_turno = 'noite' AND btrim(COALESCE(gr.valor, '')) = 'NGT')
      )
      AND (
        COALESCE(NULLIF(btrim(a.estudio_slug), ''), public._escala_rotacao_estudio_staff(f)) = v_estudio
        OR (
          a.estudio_slug IS NULL
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
          )
        )
      );
  END IF;

  -- Liderança do dia (SL + SM) para «Incluir Liderança» — filtro de horário no client
  IF v_aprovada THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'funcionario_id', x.funcionario_id,
        'nome', x.nome,
        'nickname', x.nickname,
        'staff_turno', x.staff_turno,
        'staff_horario_turno', x.staff_horario_turno,
        'grade_valor', x.grade_valor,
        'cargo', x.cargo,
        'escala', x.escala,
        'estudio_staff', x.estudio_staff,
        'estudio_efetivo', x.estudio_efetivo,
        'alocacao_origem', x.alocacao_origem
      )
      ORDER BY x.cargo, x.nome
    ), '[]'::jsonb)
    INTO v_liderancas
    FROM (
      SELECT DISTINCT ON (f.id)
        f.id AS funcionario_id,
        f.nome,
        COALESCE(NULLIF(btrim(f.staff_nickname), ''), '') AS nickname,
        COALESCE(tm.staff_turno, f.staff_turno) AS staff_turno,
        COALESCE(NULLIF(btrim(tm.staff_horario_turno), ''), NULLIF(btrim(f.staff_horario_turno), ''), '') AS staff_horario_turno,
        btrim(COALESCE(gr.valor, '')) AS grade_valor,
        gr.area_key AS cargo,
        f.escala,
        public._escala_rotacao_estudio_staff(f) AS estudio_staff,
        COALESCE(
          NULLIF(btrim(a.estudio_slug), ''),
          public._escala_rotacao_estudio_staff(f)
        ) AS estudio_efetivo,
        COALESCE(a.origem, 'staff') AS alocacao_origem
      FROM public.rh_funcionarios f
      INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
      INNER JOIN public.rh_gestao_escala_grade gr
        ON gr.funcionario_id = f.id
       AND gr.ref_mes = v_ref
       AND gr.dia_iso = p_dia
       AND gr.area_key IN ('shift_leader', 'service_manager')
       AND btrim(COALESCE(gr.valor, '')) IN ('MRN', 'AFT', 'NGT')
      LEFT JOIN public.rh_gestao_escala_turno_mes tm
        ON tm.ref_mes = v_ref
       AND tm.area_key = gr.area_key
       AND tm.funcionario_id = f.id
      LEFT JOIN public.escala_rotacao_alocacao a
        ON a.dia = p_dia AND a.turno = v_turno AND a.funcionario_id = f.id
      WHERE f.status IN ('ativo', 'indisponivel')
        AND (
          (gr.area_key = 'shift_leader' AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%')
          OR (gr.area_key = 'service_manager' AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%service manager%')
        )
      ORDER BY f.id, gr.area_key
    ) x;
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
    'gps_outros', COALESCE(v_gps_outros, '[]'::jsonb),
    'shift_leads', COALESCE(v_shift_leads, '[]'::jsonb),
    'liderancas', COALESCE(v_liderancas, '[]'::jsonb),
    'mesas', COALESCE(v_mesas, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) IS
  'Pool GPs/SL + liderancas (SL/SM do dia) + gps_outros + mesas.';

-- Index rascunho único por dia/turno/estudo (além da publicada)
CREATE UNIQUE INDEX IF NOT EXISTS escala_rotacao_rascunho_uk
  ON public.escala_rotacao (dia, turno, estudio_slug)
  WHERE status = 'rascunho';

COMMIT;
