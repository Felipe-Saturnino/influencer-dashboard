-- Sync bidirecional: justificativa Médico (Calendário) ↔ solicitação Atestado (Solicitações RH).

BEGIN;

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
BEGIN
  IF p_funcionario_id IS NULL OR p_dia_iso IS NULL OR p_solicitacao_id IS NULL THEN
    RETURN;
  END IF;

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
    AND g.dia_iso = p_dia_iso
    AND coalesce(g.justificativa->>'motivo', '') = 'medico';
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

  PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
    p_funcionario_id,
    p_dia_iso,
    v_id,
    'em_analise'
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

DROP TRIGGER IF EXISTS trg_rh_solicitacao_presenca_atestado_sync ON public.rh_solicitacoes;
CREATE TRIGGER trg_rh_solicitacao_presenca_atestado_sync
  AFTER INSERT OR UPDATE OF status ON public.rh_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public._rh_solicitacao_presenca_atestado_after_update();

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
    AND s.presenca_dia_iso = g.dia_iso
    AND s.tipo = 'atestado'
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= v_ref0
    AND g.dia_iso <= v_ref1
  ORDER BY g.dia_iso;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_solicitacao_sync_presenca_gestao_atestado(uuid, date, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) TO authenticated;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) IS
  'Calendário RH: gestão de presença do mês; justificativa Médico inclui status da solicitação de atestado vinculada.';

-- Backfill status/solicitacaoId para justificativas médicas existentes.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT g.funcionario_id, g.dia_iso, g.justificativa, s.id AS sid, s.status AS st
    FROM public.rh_calendario_presenca_gestao g
    LEFT JOIN public.rh_solicitacoes s
      ON s.rh_funcionario_id = g.funcionario_id
      AND s.presenca_dia_iso = g.dia_iso
      AND s.tipo = 'atestado'
    WHERE g.justificativa IS NOT NULL
      AND coalesce(g.justificativa->>'motivo', '') = 'medico'
  LOOP
    IF r.sid IS NOT NULL THEN
      PERFORM public._rh_solicitacao_sync_presenca_gestao_atestado(
        r.funcionario_id,
        r.dia_iso,
        r.sid,
        coalesce(r.st, 'em_analise')
      );
    ELSIF coalesce(r.justificativa->>'atestadoStatus', '') = '' THEN
      PERFORM public._rh_solicitacao_sync_calendario_atestado(
        r.funcionario_id,
        r.dia_iso,
        r.justificativa
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
