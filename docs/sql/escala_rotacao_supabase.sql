-- =============================================================================
-- COPIAR E COLAR NO SUPABASE SQL BROWSER
-- Pagina: Escala -> Rotacao (page_key escala_rotacao)
--
-- Como usar:
--   1. Abra o Dashboard Supabase -> SQL Editor -> New query
--   2. Cole ESTE arquivo inteiro
--   3. Run
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Espelho no Git (so historico): supabase/migrations/20261021120000_escala_rotacao.sql
-- =============================================================================

-- ─── 1) Permissão ────────────────────────────────────────────────────────────

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

REVOKE ALL ON FUNCTION public._escala_rotacao_perm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._escala_rotacao_perm(text) TO authenticated;

COMMENT ON FUNCTION public._escala_rotacao_perm(text) IS
  'Permissao Escala -> Rotacao (view|create|edit|delete).';

-- ─── 2) Tabelas ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escala_rotacao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia             date NOT NULL,
  turno           text NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
  estudio_slug    text NOT NULL,
  estudio_nome    text NOT NULL,
  status          text NOT NULL DEFAULT 'publicada'
                    CHECK (status IN ('rascunho', 'publicada', 'arquivada')),
  modelo_n        int NOT NULL CHECK (modelo_n IN (5, 6, 7, 8)),
  slot_minutos    int NOT NULL CHECK (slot_minutos IN (20, 30)),
  turno_inicio    text NOT NULL,
  turno_fim       text NOT NULL,
  publicado_por   uuid REFERENCES auth.users (id),
  publicado_em    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS escala_rotacao_publicada_uk
  ON public.escala_rotacao (dia, turno, estudio_slug)
  WHERE status = 'publicada';

CREATE INDEX IF NOT EXISTS escala_rotacao_dia_idx
  ON public.escala_rotacao (dia DESC);

CREATE INDEX IF NOT EXISTS escala_rotacao_estudio_idx
  ON public.escala_rotacao (estudio_slug);

COMMENT ON TABLE public.escala_rotacao IS
  'Cabecalho da rotacao de Game Presenters (dia + turno + estudio).';

CREATE TABLE IF NOT EXISTS public.escala_rotacao_celula (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotacao_id      uuid NOT NULL REFERENCES public.escala_rotacao (id) ON DELETE CASCADE,
  funcionario_id  uuid NOT NULL REFERENCES public.rh_funcionarios (id),
  nome_exibicao   text NOT NULL,
  nickname        text NOT NULL DEFAULT '',
  linha_ordem     int NOT NULL DEFAULT 0,
  slot_inicio     text NOT NULL,
  valor           text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escala_rotacao_celula_rot_idx
  ON public.escala_rotacao_celula (rotacao_id);

CREATE INDEX IF NOT EXISTS escala_rotacao_celula_func_idx
  ON public.escala_rotacao_celula (funcionario_id);

COMMENT ON TABLE public.escala_rotacao_celula IS
  'Celula da rotacao: GP x slot -> numero_mesa | Break | X.';

COMMENT ON COLUMN public.escala_rotacao_celula.valor IS
  'numero_mesa, Break ou X (falta). Legado: B e F ainda aceitos na leitura da UI.';

-- ─── 3) RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.escala_rotacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_rotacao_celula ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS escala_rotacao_select ON public.escala_rotacao;
DROP POLICY IF EXISTS escala_rotacao_insert ON public.escala_rotacao;
DROP POLICY IF EXISTS escala_rotacao_update ON public.escala_rotacao;
DROP POLICY IF EXISTS escala_rotacao_delete ON public.escala_rotacao;
DROP POLICY IF EXISTS escala_rotacao_celula_select ON public.escala_rotacao_celula;
DROP POLICY IF EXISTS escala_rotacao_celula_insert ON public.escala_rotacao_celula;
DROP POLICY IF EXISTS escala_rotacao_celula_update ON public.escala_rotacao_celula;
DROP POLICY IF EXISTS escala_rotacao_celula_delete ON public.escala_rotacao_celula;

CREATE POLICY escala_rotacao_select ON public.escala_rotacao
  FOR SELECT TO authenticated
  USING (public._escala_rotacao_perm('view'));

CREATE POLICY escala_rotacao_insert ON public.escala_rotacao
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_rotacao_perm('create'));

CREATE POLICY escala_rotacao_update ON public.escala_rotacao
  FOR UPDATE TO authenticated
  USING (public._escala_rotacao_perm('edit'))
  WITH CHECK (public._escala_rotacao_perm('edit'));

CREATE POLICY escala_rotacao_delete ON public.escala_rotacao
  FOR DELETE TO authenticated
  USING (public._escala_rotacao_perm('delete') OR public._escala_rotacao_perm('edit'));

CREATE POLICY escala_rotacao_celula_select ON public.escala_rotacao_celula
  FOR SELECT TO authenticated
  USING (public._escala_rotacao_perm('view'));

CREATE POLICY escala_rotacao_celula_insert ON public.escala_rotacao_celula
  FOR INSERT TO authenticated
  WITH CHECK (public._escala_rotacao_perm('create') OR public._escala_rotacao_perm('edit'));

CREATE POLICY escala_rotacao_celula_update ON public.escala_rotacao_celula
  FOR UPDATE TO authenticated
  USING (public._escala_rotacao_perm('edit'))
  WITH CHECK (public._escala_rotacao_perm('edit'));

CREATE POLICY escala_rotacao_celula_delete ON public.escala_rotacao_celula
  FOR DELETE TO authenticated
  USING (public._escala_rotacao_perm('delete') OR public._escala_rotacao_perm('edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_rotacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escala_rotacao_celula TO authenticated;

-- ─── 4) RPC: contexto do dia (pool + mesas + horario) ─────────────────────────

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
        'staff_turno', f.staff_turno,
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
    WHERE f.status IN ('ativo', 'indisponivel')
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
      AND lower(replace(regexp_replace(COALESCE(f.escala, ''), '\s+', '', 'g'), '×', 'x')) = '4x2'
      AND (
        (v_turno = 'manha' AND btrim(COALESCE(f.staff_turno, '')) = 'Manhã')
        OR (v_turno = 'tarde' AND btrim(COALESCE(f.staff_turno, '')) = 'Tarde')
        OR (v_turno = 'noite' AND btrim(COALESCE(f.staff_turno, '')) = 'Noite')
      )
      AND btrim(COALESCE(gr.valor, '')) IN ('MRN', 'AFT', 'NGT', 'Comercial')
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

REVOKE ALL ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) TO authenticated;

COMMENT ON FUNCTION public.escala_rotacao_contexto_dia(date, text, text) IS
  'Pool de GPs 4x2 escalados (grade aprovada) + mesas (numero_mesa) + horario 8h do estudio.';

-- ─── 5) RPC: publicar ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.escala_rotacao_publicar(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia date;
  v_turno text;
  v_estudio text;
  v_estudio_nome text;
  v_modelo int;
  v_slot int;
  v_inicio text;
  v_fim text;
  v_celulas jsonb;
  v_id uuid;
  v_uid uuid := auth.uid();
  c jsonb;
BEGIN
  IF NOT public._escala_rotacao_perm('create')
     AND NOT public._escala_rotacao_perm('edit') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  v_dia := (p_payload->>'dia')::date;
  v_turno := lower(btrim(p_payload->>'turno'));
  v_estudio := btrim(p_payload->>'estudio_slug');
  v_estudio_nome := btrim(COALESCE(p_payload->>'estudio_nome', v_estudio));
  v_modelo := (p_payload->>'modelo_n')::int;
  v_slot := (p_payload->>'slot_minutos')::int;
  v_inicio := btrim(p_payload->>'turno_inicio');
  v_fim := btrim(p_payload->>'turno_fim');
  v_celulas := COALESCE(p_payload->'celulas', '[]'::jsonb);

  IF v_turno NOT IN ('manha', 'tarde', 'noite') THEN
    RAISE EXCEPTION 'turno_invalido';
  END IF;
  IF v_modelo NOT IN (5, 6, 7, 8) THEN
    RAISE EXCEPTION 'modelo_invalido';
  END IF;
  IF v_slot NOT IN (20, 30) THEN
    RAISE EXCEPTION 'slot_invalido';
  END IF;
  IF v_modelo IN (7, 8) AND v_slot <> 30 THEN
    RAISE EXCEPTION 'slot_invalido';
  END IF;
  IF v_estudio = '' THEN
    RAISE EXCEPTION 'estudio_obrigatorio';
  END IF;

  UPDATE public.escala_rotacao
  SET status = 'arquivada', updated_at = now()
  WHERE dia = v_dia
    AND turno = v_turno
    AND estudio_slug = v_estudio
    AND status = 'publicada';

  INSERT INTO public.escala_rotacao (
    dia, turno, estudio_slug, estudio_nome, status,
    modelo_n, slot_minutos, turno_inicio, turno_fim,
    publicado_por, publicado_em
  ) VALUES (
    v_dia, v_turno, v_estudio, v_estudio_nome, 'publicada',
    v_modelo, v_slot, v_inicio, v_fim,
    v_uid, now()
  )
  RETURNING id INTO v_id;

  FOR c IN SELECT * FROM jsonb_array_elements(v_celulas)
  LOOP
    INSERT INTO public.escala_rotacao_celula (
      rotacao_id, funcionario_id, nome_exibicao, nickname, linha_ordem, slot_inicio, valor
    ) VALUES (
      v_id,
      (c->>'funcionario_id')::uuid,
      btrim(COALESCE(c->>'nome_exibicao', '—')),
      btrim(COALESCE(c->>'nickname', '')),
      COALESCE((c->>'linha_ordem')::int, 0),
      btrim(c->>'slot_inicio'),
      btrim(c->>'valor')
    );
  END LOOP;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_rotacao_publicar(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_rotacao_publicar(jsonb) TO authenticated;

COMMENT ON FUNCTION public.escala_rotacao_publicar(jsonb) IS
  'Publica rotacao do dia/turno/estudio (arquiva a anterior publicada).';

-- ─── 6) Leitura de estudios_spin (inclui Rotacao) ────────────────────────────
-- Recria a funcao completa (mesmo padrao das migracoes anteriores).

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
    );
$$;

COMMENT ON FUNCTION public._estudios_spin_leitura_perm(text) IS
  'SELECT em estudios_spin: Gestao de Mesas ou paginas operacionais (incl. Relatorio de Turno e Rotacao).';

-- ─── 7) Seed de permissoes (nao-admin = Nao) ─────────────────────────────────

INSERT INTO public.role_permissions (role, page_key, can_view, can_criar, can_editar, can_excluir)
SELECT DISTINCT rp.role, 'escala_rotacao', 'nao', 'nao', 'nao', 'nao'
FROM public.role_permissions rp
WHERE rp.role::text <> 'admin'
ON CONFLICT (role, page_key) DO NOTHING;
