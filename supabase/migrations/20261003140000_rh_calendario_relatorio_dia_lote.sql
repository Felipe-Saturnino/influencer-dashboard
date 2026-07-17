-- ============================================================================
-- Calendário RH — Relatório de Presença: ponto e gestão em lote por dia
-- (elimina N+1 de 3 RPCs × N prestadores no relatório diário).
--
-- Idempotente: pode ser executada mais de uma vez sem erro.
--
-- Pré-requisito: migration 20261002120000 (escopo pelo Organograma) aplicada —
-- usa public._rh_calendario_pode_acessar_funcionario.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.rh_calendario_ponto_registros_dia_lote(uuid[], date);
CREATE FUNCTION public.rh_calendario_ponto_registros_dia_lote(
  p_funcionario_ids uuid[],
  p_dia date
)
RETURNS TABLE (
  funcionario_id uuid,
  check_in_at timestamptz,
  check_out_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_funcionario_ids IS NULL OR cardinality(p_funcionario_ids) = 0 OR p_dia IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ids AS (
    SELECT DISTINCT fid AS funcionario_id
    FROM unnest(p_funcionario_ids) AS fid
    WHERE public._rh_calendario_pode_acessar_funcionario(fid)
  ),
  uids AS (
    SELECT f.id AS funcionario_id, u.id AS user_id
    FROM ids
    INNER JOIN public.rh_funcionarios f ON f.id = ids.funcionario_id
    INNER JOIN auth.users u ON (
      lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
      OR (
        trim(coalesce(f.email_spin, '')) <> ''
        AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
      )
    )
  ),
  agg AS (
    SELECT
      coalesce(r.funcionario_id, uids.funcionario_id) AS funcionario_id,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS ci,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS co
    FROM public.prestador_ponto_registros r
    LEFT JOIN uids ON uids.user_id = r.user_id
    WHERE r.dia_sp = p_dia
      AND (
        r.funcionario_id IN (SELECT ids.funcionario_id FROM ids)
        OR uids.funcionario_id IS NOT NULL
      )
    GROUP BY coalesce(r.funcionario_id, uids.funcionario_id)
  )
  SELECT ids.funcionario_id, agg.ci, agg.co
  FROM ids
  LEFT JOIN agg ON agg.funcionario_id = ids.funcionario_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_dia_lote(uuid[], date);
CREATE FUNCTION public.rh_calendario_presenca_gestao_dia_lote(
  p_funcionario_ids uuid[],
  p_dia date
)
RETURNS TABLE (
  funcionario_id uuid,
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
BEGIN
  IF auth.uid() IS NULL OR p_funcionario_ids IS NULL OR cardinality(p_funcionario_ids) = 0 OR p_dia IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ids AS (
    SELECT DISTINCT fid AS funcionario_id
    FROM unnest(p_funcionario_ids) AS fid
    WHERE public._rh_calendario_pode_acessar_funcionario(fid)
  )
  SELECT
    g.funcionario_id,
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
  INNER JOIN ids ON ids.funcionario_id = g.funcionario_id
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
  WHERE g.dia_iso = p_dia
  ORDER BY g.funcionario_id;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_ponto_registros_dia_lote(uuid[], date) IS
  'Calendário RH — Relatório de Presença: check-in/out de um dia para vários funcionários (1 RPC).';

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_dia_lote(uuid[], date) IS
  'Calendário RH — Relatório de Presença: gestão de um dia para vários funcionários (1 RPC).';

REVOKE ALL ON FUNCTION public.rh_calendario_ponto_registros_dia_lote(uuid[], date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_dia_lote(uuid[], date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ponto_registros_dia_lote(uuid[], date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_dia_lote(uuid[], date) TO authenticated;

COMMIT;
