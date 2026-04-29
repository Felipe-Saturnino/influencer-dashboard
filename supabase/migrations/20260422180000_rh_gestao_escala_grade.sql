-- Grade mensal da Gestão de Escala (células por prestador e dia), persistida na base.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_gestao_escala_grade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_mes date NOT NULL,
  area_key text NOT NULL,
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  dia_iso date NOT NULL,
  valor text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rh_gestao_escala_grade_uk UNIQUE (ref_mes, area_key, funcionario_id, dia_iso)
);

CREATE INDEX IF NOT EXISTS rh_gestao_escala_grade_ref_area_idx
  ON public.rh_gestao_escala_grade (ref_mes, area_key);

COMMENT ON TABLE public.rh_gestao_escala_grade IS
  'Células da grade Gestão de Escala (valor por funcionário e dia). ref_mes = primeiro dia do mês (UTC).';

ALTER TABLE public.rh_gestao_escala_grade ENABLE ROW LEVEL SECURITY;

-- Sem políticas para authenticated: acesso apenas via RPC SECURITY DEFINER.
REVOKE ALL ON TABLE public.rh_gestao_escala_grade FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_gestao_escala_grade FROM authenticated;

-- Prestador ativo/indisponível no organograma da Gestão de Escala e cujo time casa com area_key (mesma semântica da app).
CREATE OR REPLACE FUNCTION public._rh_gestao_escala_prestador_na_area(p_funcionario_id uuid, p_area_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id AND g.status = 'ativo'
    WHERE f.id = p_funcionario_id
      AND f.status IN ('ativo', 'indisponivel')
      AND (
        (lower(btrim(g.nome)) LIKE '%game floor%')
        OR (
          lower(btrim(g.nome)) LIKE '%operation%'
          AND lower(btrim(g.nome)) LIKE '%management%'
        )
      )
      AND lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) <> 'contador de cartas'
      AND (
        CASE lower(btrim(p_area_key))
          WHEN 'customer_service' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%customer service%'
          WHEN 'service_manager' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%service manager%'
          WHEN 'shift_leader' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shift leader%'
          WHEN 'game_presenter' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
          WHEN 'shuffler' THEN
            lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%'
          ELSE false
        END
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.rh_gestao_escala_grade_carregar(p_ref_mes date, p_area_key text)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT g.funcionario_id, g.dia_iso, g.valor
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = date_trunc('month', p_ref_mes)::date
    AND g.area_key = lower(btrim(p_area_key));
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) IS
  'Carrega células gravadas da grade (Gestão de Escala) para o mês e área. Requer rh_gestao_escala.can_view.';

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

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) IS
  'Upsert em lote das células da grade (chaves "uuid|YYYY-MM-DD"). Requer rh_gestao_escala.can_criar ou can_editar.';

REVOKE ALL ON FUNCTION public._rh_gestao_escala_prestador_na_area(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_carregar(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_gestao_escala_grade_salvar(date, text, jsonb) TO authenticated;

COMMIT;
