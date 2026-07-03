-- Sincroniza abono remunerado (Solicitações RH) na justificativa médica do Calendário.

BEGIN;

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
  v_atendido_em timestamptz;
  v_atendido_nome text;
  v_abono text;
BEGIN
  IF p_funcionario_id IS NULL OR p_solicitacao_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.atestado_inicio, s.atestado_fim, coalesce(s.atendido_em, s.updated_at), p.name, s.abono_remunerado
  INTO v_inicio, v_fim, v_atendido_em, v_atendido_nome, v_abono
  FROM public.rh_solicitacoes s
  LEFT JOIN public.profiles p ON p.id = s.atendido_por
  WHERE s.id = p_solicitacao_id;

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
            jsonb_set(
              jsonb_set(
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
                ),
                '{atestadoAtendidoEm}',
                CASE
                  WHEN coalesce(s.atendido_em, s.updated_at) IS NOT NULL
                    THEN to_jsonb(coalesce(s.atendido_em, s.updated_at)::text)
                  WHEN g.justificativa ? 'atestadoAtendidoEm' THEN g.justificativa->'atestadoAtendidoEm'
                  ELSE 'null'::jsonb
                END
              ),
              '{atestadoAtendidoPorNome}',
              CASE
                WHEN nullif(trim(coalesce(atendente.name, '')), '') IS NOT NULL
                  THEN to_jsonb(trim(atendente.name))
                WHEN g.justificativa ? 'atestadoAtendidoPorNome' THEN g.justificativa->'atestadoAtendidoPorNome'
                ELSE 'null'::jsonb
              END
            ),
            '{abonoRemunerado}',
            CASE
              WHEN coalesce(s.status, g.justificativa->>'atestadoStatus', '') = 'aprovado'
                AND nullif(trim(coalesce(s.abono_remunerado, g.justificativa->>'abonoRemunerado', '')), '') IS NOT NULL
                THEN to_jsonb(trim(coalesce(s.abono_remunerado, g.justificativa->>'abonoRemunerado')))
              ELSE 'null'::jsonb
            END
          ),
          '{atestadoDiaRegistro}',
          CASE
            WHEN g.justificativa ? 'atestadoDiaRegistro' THEN g.justificativa->'atestadoDiaRegistro'
            WHEN s.presenca_dia_iso IS NOT NULL THEN to_jsonb(s.presenca_dia_iso::text)
            ELSE to_jsonb(g.dia_iso::text)
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
  LEFT JOIN public.profiles atendente ON atendente.id = s.atendido_por
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= v_ref0
    AND g.dia_iso <= v_ref1
  ORDER BY g.dia_iso;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) TO authenticated;

-- Backfill abono em justificativas médicas já aprovadas/rejeitadas.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.id, s.rh_funcionario_id, s.presenca_dia_iso, s.status
    FROM public.rh_solicitacoes s
    WHERE s.tipo = 'atestado'
      AND s.presenca_dia_iso IS NOT NULL
      AND s.status IN ('aprovado', 'rejeitado')
  LOOP
    PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
      r.rh_funcionario_id,
      r.presenca_dia_iso,
      r.id,
      r.status
    );
  END LOOP;
END;
$$;

COMMIT;
