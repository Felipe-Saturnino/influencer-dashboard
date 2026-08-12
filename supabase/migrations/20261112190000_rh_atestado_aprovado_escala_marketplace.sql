-- Aprovação de atestado (Solicitações RH):
-- - Calendário: Abonado (abono=sim) só em Escalado/Troca/Compra; Atestado (abono=nao) em todos os dias do período.
-- - Escala: grava Atestado em todas as células do período (incl. Folga/Venda).
-- - Marketplace: cancela vendas de Folga abertas no período.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_grade_valor_eh_abonavel(p_valor text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    nullif(trim(coalesce(p_valor, '')), '') IS NOT NULL
    AND lower(trim(p_valor)) NOT IN ('folga', 'f', 'venda', 'atestado');
$$;

COMMENT ON FUNCTION public._rh_grade_valor_eh_abonavel(text) IS
  'Grade: jornada (turno), Compra/Compra-Turno ou Troca — elegível a Status Abonado no Calendário.';

CREATE OR REPLACE FUNCTION public._rh_grade_valor_eh_folga_ou_venda(p_valor text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_valor, ''))) IN ('folga', 'f', 'venda');
$$;

CREATE OR REPLACE FUNCTION public._rh_grade_dia_abonavel(p_funcionario_id uuid, p_dia_iso date)
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
      AND public._rh_grade_valor_eh_abonavel(g.valor)
  );
$$;

CREATE OR REPLACE FUNCTION public._rh_grade_dia_folga_ou_venda(p_funcionario_id uuid, p_dia_iso date)
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
      AND public._rh_grade_valor_eh_folga_ou_venda(g.valor)
  );
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
    IF v_d <> p_dia_registro AND public._rh_grade_dia_abonavel(p_funcionario_id, v_d) THEN
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

CREATE OR REPLACE FUNCTION public._rh_solicitacao_aplicar_atestado_aprovado_escala_marketplace(
  p_funcionario_id uuid,
  p_inicio date,
  p_fim date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_funcionario_id IS NULL OR p_inicio IS NULL OR p_fim IS NULL OR p_inicio > p_fim THEN
    RETURN;
  END IF;

  UPDATE public.rh_gestao_escala_grade g
  SET valor = 'Atestado'
  FROM public.rh_gestao_escala_grade_status s
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= p_inicio
    AND g.dia_iso <= p_fim
    AND s.ref_mes = g.ref_mes
    AND s.area_key = g.area_key
    AND s.status = 'aprovada'
    AND nullif(trim(coalesce(g.valor, '')), '') IS NOT NULL
    AND trim(g.valor) IS DISTINCT FROM 'Atestado';

  UPDATE public.escala_marketplace_oferta o
  SET status = 'cancelada', atualizado_em = now()
  WHERE o.ofertante_funcionario_id = p_funcionario_id
    AND o.tipo = 'venda_folga'
    AND o.status IN ('aberta', 'interessado', 'em_analise')
    AND o.dia_iso >= p_inicio
    AND o.dia_iso <= p_fim;
END;
$$;

COMMENT ON FUNCTION public._rh_solicitacao_aplicar_atestado_aprovado_escala_marketplace(uuid, date, date) IS
  'Atestado aprovado: grava Atestado na grade aprovada e cancela venda_folga aberta no período.';

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
  v_atendido_em timestamptz;
  v_atendido_nome text;
  v_abono text;
  v_dia_registro date;
  v_j_base jsonb;
  v_d date;
  v_criar boolean;
BEGIN
  IF p_funcionario_id IS NULL OR p_solicitacao_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    s.atestado_inicio,
    s.atestado_fim,
    coalesce(s.atendido_em, s.updated_at),
    p.name,
    s.abono_remunerado,
    coalesce(s.presenca_dia_iso, p_dia_iso)
  INTO v_inicio, v_fim, v_atendido_em, v_atendido_nome, v_abono, v_dia_registro
  FROM public.rh_solicitacoes s
  LEFT JOIN public.profiles p ON p.id = s.atendido_por
  WHERE s.id = p_solicitacao_id;

  IF v_inicio IS NULL AND p_dia_iso IS NOT NULL THEN
    v_inicio := p_dia_iso;
  END IF;
  IF v_fim IS NULL AND p_dia_iso IS NOT NULL THEN
    v_fim := p_dia_iso;
  END IF;

  UPDATE public.rh_calendario_presenca_gestao g
  SET
    justificativa = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              coalesce(g.justificativa, '{}'::jsonb),
              '{atestadoStatus}',
              to_jsonb(p_status)
            ),
            '{solicitacaoId}',
            to_jsonb(p_solicitacao_id::text)
          ),
          '{atestadoAtendidoEm}',
          CASE
            WHEN p_status IN ('aprovado', 'rejeitado') AND v_atendido_em IS NOT NULL
              THEN to_jsonb(v_atendido_em::text)
            ELSE 'null'::jsonb
          END
        ),
        '{atestadoAtendidoPorNome}',
        CASE
          WHEN p_status IN ('aprovado', 'rejeitado') AND nullif(trim(coalesce(v_atendido_nome, '')), '') IS NOT NULL
            THEN to_jsonb(trim(v_atendido_nome))
          ELSE 'null'::jsonb
        END
      ),
      '{abonoRemunerado}',
      CASE
        WHEN p_status = 'aprovado' AND nullif(trim(coalesce(v_abono, '')), '') IS NOT NULL
          THEN to_jsonb(trim(v_abono))
        ELSE 'null'::jsonb
      END
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
        v_dia_registro IS NOT NULL
        AND coalesce(g.justificativa->>'atestadoDiaRegistro', g.dia_iso::text) = v_dia_registro::text
      )
      OR (
        v_inicio IS NOT NULL
        AND v_fim IS NOT NULL
        AND g.dia_iso >= v_inicio
        AND g.dia_iso <= v_fim
        AND public._rh_grade_dia_abonavel(p_funcionario_id, g.dia_iso)
      )
    );

  IF p_status = 'aprovado' AND v_inicio IS NOT NULL AND v_fim IS NOT NULL THEN
    SELECT g.justificativa
    INTO v_j_base
    FROM public.rh_calendario_presenca_gestao g
    WHERE g.funcionario_id = p_funcionario_id
      AND coalesce(g.justificativa->>'motivo', '') = 'medico'
      AND (
        g.justificativa->>'solicitacaoId' = p_solicitacao_id::text
        OR (v_dia_registro IS NOT NULL AND g.dia_iso = v_dia_registro)
      )
    ORDER BY CASE WHEN v_dia_registro IS NOT NULL AND g.dia_iso = v_dia_registro THEN 0 ELSE 1 END, g.dia_iso
    LIMIT 1;

    IF v_j_base IS NULL THEN
      v_j_base := jsonb_build_object(
        'motivo', 'medico',
        'atestadoInicio', v_inicio::text,
        'atestadoFim', v_fim::text,
        'atestadoDiaRegistro', coalesce(v_dia_registro, v_inicio)::text,
        'solicitacaoId', p_solicitacao_id::text
      );
    END IF;

    v_j_base := jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              v_j_base,
              '{atestadoStatus}',
              to_jsonb(p_status)
            ),
            '{solicitacaoId}',
            to_jsonb(p_solicitacao_id::text)
          ),
          '{atestadoAtendidoEm}',
          CASE
            WHEN v_atendido_em IS NOT NULL THEN to_jsonb(v_atendido_em::text)
            ELSE 'null'::jsonb
          END
        ),
        '{atestadoAtendidoPorNome}',
        CASE
          WHEN nullif(trim(coalesce(v_atendido_nome, '')), '') IS NOT NULL
            THEN to_jsonb(trim(v_atendido_nome))
          ELSE 'null'::jsonb
        END
      ),
      '{abonoRemunerado}',
      CASE
        WHEN nullif(trim(coalesce(v_abono, '')), '') IS NOT NULL
          THEN to_jsonb(trim(v_abono))
        ELSE 'null'::jsonb
      END
    );

    -- Antes de reescrever a grade: gestão nos dias Escalado/Troca/Compra;
    -- com abono=nao também Folga/Venda (Status Atestado no Calendário).
    v_d := v_inicio;
    WHILE v_d <= v_fim LOOP
      v_criar := public._rh_grade_dia_abonavel(p_funcionario_id, v_d);
      IF NOT v_criar AND coalesce(v_abono, '') = 'nao' THEN
        v_criar := public._rh_grade_dia_folga_ou_venda(p_funcionario_id, v_d);
      END IF;

      IF v_criar THEN
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
          'aprovado',
          NULL,
          v_j_base,
          '[]'::jsonb,
          now()
        )
        ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
          status_gestao = 'aprovado',
          justificativa = EXCLUDED.justificativa,
          updated_at = now()
        WHERE coalesce(rh_calendario_presenca_gestao.justificativa->>'motivo', '') <> 'medico'
           OR rh_calendario_presenca_gestao.justificativa->>'solicitacaoId' = p_solicitacao_id::text
           OR coalesce(rh_calendario_presenca_gestao.justificativa->>'atestadoDiaRegistro', '')
              = coalesce(v_dia_registro, v_inicio)::text;
      END IF;
      v_d := v_d + 1;
    END LOOP;

    PERFORM public._rh_solicitacao_aplicar_atestado_aprovado_escala_marketplace(
      p_funcionario_id,
      v_inicio,
      v_fim
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._rh_solicitacao_presenca_atestado_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo <> 'atestado' THEN
    RETURN NEW;
  END IF;

  IF NEW.atestado_inicio IS NULL OR NEW.atestado_fim IS NULL THEN
    IF NEW.presenca_dia_iso IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.abono_remunerado IS NOT DISTINCT FROM NEW.abono_remunerado
  THEN
    RETURN NEW;
  END IF;

  PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
    NEW.rh_funcionario_id,
    coalesce(NEW.presenca_dia_iso, NEW.atestado_inicio),
    NEW.id,
    NEW.status
  );

  RETURN NEW;
END;
$$;

COMMIT;
