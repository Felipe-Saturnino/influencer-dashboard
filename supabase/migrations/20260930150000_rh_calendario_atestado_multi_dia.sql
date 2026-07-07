-- Justificativa Médico com período (início ≠ fim): propagar status/indicador a todos os dias Escalado no intervalo.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_grade_valor_eh_escalado(p_valor text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    nullif(trim(coalesce(p_valor, '')), '') IS NOT NULL
    AND trim(p_valor) NOT IN ('Folga', 'Compra', 'Venda', 'Troca')
    AND lower(trim(p_valor)) NOT IN ('folga', 'f');
$$;

CREATE OR REPLACE FUNCTION public._rh_grade_dia_escalado(p_funcionario_id uuid, p_dia_iso date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes
      AND s.area_key = g.area_key
      AND s.status = 'aprovada'
    WHERE g.funcionario_id = p_funcionario_id
      AND g.dia_iso = p_dia_iso
      AND g.ref_mes = date_trunc('month', p_dia_iso)::date
      AND public._rh_grade_valor_eh_escalado(g.valor)
  );
$$;

DROP FUNCTION IF EXISTS public._rh_solicitacao_sync_presenca_gestao_atestado(uuid, date, uuid, text);

CREATE OR REPLACE FUNCTION public._rh_solicitacao_sync_presenca_gestao_atestado(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_solicitacao_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio date;
  v_fim date;
BEGIN
  IF p_funcionario_id IS NULL OR p_solicitacao_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.atestado_inicio, s.atestado_fim
  INTO v_inicio, v_fim
  FROM public.rh_solicitacoes s
  WHERE s.id = p_solicitacao_id;

  UPDATE public.rh_calendario_presenca_gestao g
  SET
    justificativa = jsonb_set(
      jsonb_set(
        coalesce(g.justificativa, '{}'::jsonb),
        '{atestadoStatus}',
        to_jsonb(p_status)
      ),
      '{solicitacaoId}',
      to_jsonb(p_solicitacao_id::text)
    ),
    status_gestao = CASE
      WHEN p_status = 'em_analise' THEN 'em_analise'
      WHEN p_status = 'aprovado' THEN 'aprovado'
      ELSE NULL
    END,
    updated_at = now()
  WHERE g.funcionario_id = p_funcionario_id
    AND coalesce(g.justificativa->>'motivo', '') = 'medico'
    AND (
      g.justificativa->>'solicitacaoId' = p_solicitacao_id::text
      OR (
        p_dia_iso IS NOT NULL
        AND coalesce(g.justificativa->>'atestadoDiaRegistro', g.dia_iso::text) = p_dia_iso::text
      )
      OR (
        v_inicio IS NOT NULL
        AND v_fim IS NOT NULL
        AND v_inicio <> v_fim
        AND g.dia_iso >= v_inicio
        AND g.dia_iso <= v_fim
        AND public._rh_grade_dia_escalado(p_funcionario_id, g.dia_iso)
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_calendario_propagar_justificativa_medico(
  p_funcionario_id uuid,
  p_dia_registro date,
  p_justificativa jsonb,
  p_status_gestao text,
  p_solicitacao_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio date;
  v_fim date;
  v_d date;
  v_j jsonb;
BEGIN
  IF p_justificativa IS NULL OR coalesce(p_justificativa->>'motivo', '') <> 'medico' THEN
    RETURN;
  END IF;

  BEGIN
    v_inicio := nullif(trim(coalesce(p_justificativa->>'atestadoInicio', '')), '')::date;
    v_fim := nullif(trim(coalesce(p_justificativa->>'atestadoFim', '')), '')::date;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN;
  END;

  IF v_inicio IS NULL OR v_fim IS NULL OR v_inicio >= v_fim THEN
    RETURN;
  END IF;

  v_j := jsonb_set(
    jsonb_set(
      p_justificativa,
      '{atestadoDiaRegistro}',
      to_jsonb(p_dia_registro::text)
    ),
    '{solicitacaoId}',
    CASE
      WHEN p_solicitacao_id IS NOT NULL THEN to_jsonb(p_solicitacao_id::text)
      WHEN p_justificativa ? 'solicitacaoId' THEN p_justificativa->'solicitacaoId'
      ELSE 'null'::jsonb
    END
  );

  v_d := v_inicio;
  WHILE v_d <= v_fim LOOP
    IF v_d <> p_dia_registro AND public._rh_grade_dia_escalado(p_funcionario_id, v_d) THEN
      INSERT INTO public.rh_calendario_presenca_gestao (
        funcionario_id,
        dia_iso,
        status_gestao,
        correcao,
        justificativa,
        historico,
        updated_at
      )
      VALUES (
        p_funcionario_id,
        v_d,
        p_status_gestao,
        NULL,
        v_j,
        '[]'::jsonb,
        now()
      )
      ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
        status_gestao = EXCLUDED.status_gestao,
        justificativa = EXCLUDED.justificativa,
        updated_at = now()
      WHERE coalesce(rh_calendario_presenca_gestao.justificativa->>'motivo', '') <> 'medico'
         OR coalesce(rh_calendario_presenca_gestao.justificativa->>'atestadoDiaRegistro', rh_calendario_presenca_gestao.dia_iso::text)
            = p_dia_registro::text;
    END IF;
    v_d := v_d + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_solicitacao_sync_calendario_atestado(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_justificativa jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_desc text;
  v_inicio date;
  v_fim date;
  v_path text;
  v_file text;
  v_j jsonb;
BEGIN
  IF p_justificativa IS NULL OR coalesce(p_justificativa->>'motivo', '') <> 'medico' THEN
    RETURN;
  END IF;

  v_path := nullif(trim(coalesce(p_justificativa->>'atestadoStoragePath', '')), '');
  v_file := nullif(trim(coalesce(p_justificativa->>'atestadoFileName', '')), '');

  v_inicio := NULL;
  v_fim := NULL;
  BEGIN
    v_inicio := nullif(trim(coalesce(p_justificativa->>'atestadoInicio', '')), '')::date;
    v_fim := nullif(trim(coalesce(p_justificativa->>'atestadoFim', '')), '')::date;
  EXCEPTION
    WHEN OTHERS THEN
      v_inicio := NULL;
      v_fim := NULL;
  END;

  v_desc := nullif(trim(coalesce(p_justificativa->>'observacao', '')), '');
  IF v_desc IS NULL THEN
    v_desc := 'Atestado médico registrado no Calendário — dia '
      || to_char(p_dia_iso, 'DD/MM/YYYY');
  END IF;

  v_j := jsonb_set(
    p_justificativa,
    '{atestadoDiaRegistro}',
    to_jsonb(p_dia_iso::text)
  );

  SELECT s.id
  INTO v_id
  FROM public.rh_solicitacoes s
  WHERE s.rh_funcionario_id = p_funcionario_id
    AND s.presenca_dia_iso = p_dia_iso
    AND s.tipo = 'atestado'
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.rh_solicitacoes (
      rh_funcionario_id,
      tipo,
      status,
      descricao,
      atestado_inicio,
      atestado_fim,
      atestado_storage_path,
      atestado_file_name,
      presenca_dia_iso
    )
    VALUES (
      p_funcionario_id,
      'atestado',
      'em_analise',
      v_desc,
      v_inicio,
      v_fim,
      v_path,
      v_file,
      p_dia_iso
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.rh_solicitacoes
    SET
      descricao = v_desc,
      atestado_inicio = v_inicio,
      atestado_fim = v_fim,
      atestado_storage_path = v_path,
      atestado_file_name = v_file,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  UPDATE public.rh_calendario_presenca_gestao g
  SET justificativa = jsonb_set(
    jsonb_set(
      coalesce(g.justificativa, '{}'::jsonb),
      '{atestadoDiaRegistro}',
      to_jsonb(p_dia_iso::text)
    ),
    '{solicitacaoId}',
    to_jsonb(v_id::text)
  )
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso = p_dia_iso;

  PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
    p_funcionario_id,
    p_dia_iso,
    v_id,
    'em_analise'
  );

  PERFORM public._rh_calendario_propagar_justificativa_medico(
    p_funcionario_id,
    p_dia_iso,
    v_j,
    'em_analise',
    v_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_solicitacao_presenca_atestado_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo <> 'atestado' OR NEW.presenca_dia_iso IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
    NEW.rh_funcionario_id,
    NEW.presenca_dia_iso,
    NEW.id,
    NEW.status
  );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb);

CREATE FUNCTION public.rh_calendario_presenca_gestao_salvar(
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
  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
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
    funcionario_id,
    dia_iso,
    status_gestao,
    correcao,
    justificativa,
    historico,
    updated_at
  )
  VALUES (
    p_funcionario_id,
    p_dia_iso,
    p_status_gestao,
    p_correcao,
    v_j,
    coalesce(p_historico, '[]'::jsonb),
    now()
  )
  ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
    status_gestao = EXCLUDED.status_gestao,
    correcao = EXCLUDED.correcao,
    justificativa = EXCLUDED.justificativa,
    historico = EXCLUDED.historico,
    updated_at = now();

  IF v_j IS NOT NULL AND coalesce(v_j->>'motivo', '') = 'medico' THEN
    IF p_dia_iso = v_dia_registro THEN
      PERFORM public._rh_solicitacao_sync_calendario_atestado(
        p_funcionario_id,
        p_dia_iso,
        v_j
      );
    END IF;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_mes(uuid, date);

CREATE FUNCTION public.rh_calendario_presenca_gestao_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  dia_iso date,
  status_gestao text,
  correcao jsonb,
  justificativa jsonb,
  historico jsonb
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
  SELECT
    g.dia_iso,
    CASE
      WHEN coalesce(g.justificativa->>'motivo', '') = 'medico' THEN
        CASE coalesce(s.status, g.justificativa->>'atestadoStatus', 'em_analise')
          WHEN 'em_analise' THEN 'em_analise'::text
          WHEN 'aprovado' THEN 'aprovado'::text
          ELSE NULL
        END
      ELSE g.status_gestao
    END AS status_gestao,
    g.correcao,
    CASE
      WHEN g.justificativa IS NOT NULL AND coalesce(g.justificativa->>'motivo', '') = 'medico' THEN
        jsonb_set(
          jsonb_set(
            g.justificativa,
            '{atestadoStatus}',
            to_jsonb(coalesce(s.status, g.justificativa->>'atestadoStatus', 'em_analise'))
          ),
          '{solicitacaoId}',
          CASE
            WHEN s.id IS NOT NULL THEN to_jsonb(s.id::text)
            WHEN g.justificativa ? 'solicitacaoId' THEN g.justificativa->'solicitacaoId'
            ELSE 'null'::jsonb
          END
        )
      ELSE g.justificativa
    END AS justificativa,
    g.historico
  FROM public.rh_calendario_presenca_gestao g
  LEFT JOIN public.rh_solicitacoes s
    ON s.rh_funcionario_id = g.funcionario_id
    AND s.tipo = 'atestado'
    AND (
      s.id::text = g.justificativa->>'solicitacaoId'
      OR s.presenca_dia_iso = coalesce(
        nullif(trim(coalesce(g.justificativa->>'atestadoDiaRegistro', '')), '')::date,
        g.dia_iso
      )
    )
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= v_ref0
    AND g.dia_iso <= v_ref1
  ORDER BY g.dia_iso;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) TO authenticated;

-- Backfill: propagar justificativas médicas multi-dia já existentes.
DO $$
DECLARE
  r RECORD;
  v_dia_reg date;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (g.funcionario_id, coalesce(g.justificativa->>'atestadoDiaRegistro', g.dia_iso::text))
      g.funcionario_id,
      coalesce(
        nullif(trim(coalesce(g.justificativa->>'atestadoDiaRegistro', '')), '')::date,
        g.dia_iso
      ) AS dia_registro,
      g.justificativa,
      g.status_gestao,
      s.id AS sid
    FROM public.rh_calendario_presenca_gestao g
    LEFT JOIN public.rh_solicitacoes s
      ON s.rh_funcionario_id = g.funcionario_id
      AND s.presenca_dia_iso = coalesce(
        nullif(trim(coalesce(g.justificativa->>'atestadoDiaRegistro', '')), '')::date,
        g.dia_iso
      )
      AND s.tipo = 'atestado'
    WHERE g.justificativa IS NOT NULL
      AND coalesce(g.justificativa->>'motivo', '') = 'medico'
    ORDER BY g.funcionario_id, coalesce(g.justificativa->>'atestadoDiaRegistro', g.dia_iso::text), g.updated_at DESC
  LOOP
    v_dia_reg := r.dia_registro;
    BEGIN
      IF nullif(trim(coalesce(r.justificativa->>'atestadoInicio', '')), '')::date
        < nullif(trim(coalesce(r.justificativa->>'atestadoFim', '')), '')::date
      THEN
        PERFORM public._rh_calendario_propagar_justificativa_medico(
          r.funcionario_id,
          v_dia_reg,
          r.justificativa,
          coalesce(r.status_gestao, 'em_analise'),
          r.sid
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
END;
$$;

COMMIT;
