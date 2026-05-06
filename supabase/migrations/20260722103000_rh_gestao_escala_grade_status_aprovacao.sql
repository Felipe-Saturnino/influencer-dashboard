-- Gestão de Escala: status por mês/área (rascunho vs aprovada), aprovação com auditoria,
-- bloqueio de salvamento quando aprovada, reset, meta para a app e filtro no Calendário.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_gestao_escala_grade_status (
  ref_mes date NOT NULL,
  area_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('rascunho', 'aprovada')),
  aprovado_em timestamptz,
  aprovado_por uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  PRIMARY KEY (ref_mes, area_key)
);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_grade_status_ref_idx
  ON public.rh_gestao_escala_grade_status (ref_mes);

COMMENT ON TABLE public.rh_gestao_escala_grade_status IS
  'Status da grade Gestão de Escala por mês (ref_mes = 1º dia) e área: rascunho (edição) ou aprovada (compromissos de turno no Calendário).';

ALTER TABLE public.rh_gestao_escala_grade_status ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rh_gestao_escala_grade_status FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_gestao_escala_grade_status FROM authenticated;

-- Dados já gravados na grade: tratar como aprovados para não esvaziar o Calendário até nova revisão explícita.
INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
SELECT DISTINCT g.ref_mes, g.area_key, 'aprovada'::text, now()::timestamptz, NULL::uuid
FROM public.rh_gestao_escala_grade g
ON CONFLICT (ref_mes, area_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_salvar(p_ref_mes date, p_area_key text, p_celulas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_area text := lower(btrim(p_area_key));
  k text;
  v_val text;
  parts text[];
  v_fid uuid;
  v_dia date;
  v_ok_perm boolean;
  v_aprovada boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
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

  IF p_celulas IS NULL OR jsonb_typeof(p_celulas) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_payload');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s
    WHERE s.ref_mes = v_ref
      AND s.area_key = v_area
      AND s.status = 'aprovada'
  )
  INTO v_aprovada;

  IF coalesce(v_aprovada, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'escala_aprovada');
  END IF;

  FOR k, v_val IN
    SELECT x.key, x.value FROM jsonb_each_text(p_celulas) AS x (key, value)
  LOOP
    parts := string_to_array(k, '|');
    IF coalesce(array_length(parts, 1), 0) <> 2 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END IF;
    BEGIN
      v_fid := parts[1]::uuid;
      v_dia := parts[2]::date;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_key', 'key', k);
    END;

    IF NOT public._rh_gestao_escala_prestador_na_area(v_fid, v_area) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'prestador_fora_area', 'funcionario_id', v_fid::text);
    END IF;

    IF length(v_val) > 32 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'valor_too_long');
    END IF;

    INSERT INTO public.rh_gestao_escala_grade (ref_mes, area_key, funcionario_id, dia_iso, valor)
    VALUES (v_ref, v_area, v_fid, v_dia, coalesce(v_val, ''))
    ON CONFLICT (ref_mes, area_key, funcionario_id, dia_iso)
    DO UPDATE SET
      valor = EXCLUDED.valor,
      atualizado_em = now();
  END LOOP;

  INSERT INTO public.rh_gestao_escala_grade_status (ref_mes, area_key, status, aprovado_em, aprovado_por)
  SELECT v_ref, v_area, 'rascunho'::text, NULL::timestamptz, NULL::uuid
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade_status s2
    WHERE s2.ref_mes = v_ref AND s2.area_key = v_area
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) IS
  'Upsert em lote das células da grade. Recusa quando a escala está aprovada. Garante linha de status em rascunho na primeira gravação.';

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_meta_listar(p_ref_mes date)
RETURNS TABLE (area_key text, status text, aprovado_em timestamptz, aprovado_por uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'rh_gestao_escala'
        AND rp.can_view IN ('sim', 'proprios')
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.area_key, s.status, s.aprovado_em, s.aprovado_por
  FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref;
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) IS
  'Lista status/aprovação da grade por área para o mês. Requer rh_gestao_escala.can_view.';

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
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = v_uid
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

  RETURN jsonb_build_object(
    'ok', true,
    'aprovado_em', v_now::text,
    'aprovado_por', v_uid::text
  );
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) IS
  'Marca a grade do mês/área como aprovada (data/hora e utilizador). Requer rh_gestao_escala can_criar ou can_editar.';

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
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
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

  DELETE FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref AND g.area_key = v_area;

  DELETE FROM public.rh_gestao_escala_grade_status s
  WHERE s.ref_mes = v_ref AND s.area_key = v_area;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) IS
  'Remove células e meta da grade do mês/área (ex.: refazer escala já aprovada). Requer rh_gestao_escala can_criar ou can_editar.';

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_escala_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_ok boolean;
  v_calendario_proprios boolean := false;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    SELECT (rp.can_view = 'proprios')
    INTO v_calendario_proprios
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_calendario'
    LIMIT 1;
    v_calendario_proprios := coalesce(v_calendario_proprios, false);
  END IF;

  IF coalesce(v_calendario_proprios, false) THEN
    SELECT f.id
    INTO v_meu_funcionario_id
    FROM public.rh_funcionarios f
    INNER JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
        )
      )
    ORDER BY f.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_meu_funcionario_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  INNER JOIN public.rh_gestao_escala_grade_status s
    ON s.ref_mes = g.ref_mes
    AND s.area_key = g.area_key
    AND s.status = 'aprovada'
  WHERE g.ref_mes = v_ref
    AND (
      NOT coalesce(v_calendario_proprios, false)
      OR g.funcionario_id = v_meu_funcionario_id
    );
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Calendário RH: células da grade do mês só para combinações mês/área com status aprovada. Admin / rh_gestao_escala ou rh_calendario can_view sim: todas. rh_calendario can_view proprios: só o funcionário vinculado ao e-mail.';

REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_meta_listar(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_aprovar(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_resetar(date, text) TO authenticated;

COMMIT;
