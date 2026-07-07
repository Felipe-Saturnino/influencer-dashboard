-- Corrige sync Calendário → Solicitações: migration anterior (20260630150000) foi sobrescrita por
-- 20260925160000_rh_calendario_presenca_justificativa.sql. Reaplica hook + backfill de justificativas médicas.

BEGIN;

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
    );
    RETURN;
  END IF;

  UPDATE public.rh_solicitacoes
  SET
    descricao = v_desc,
    atestado_inicio = v_inicio,
    atestado_fim = v_fim,
    atestado_storage_path = v_path,
    atestado_file_name = v_file,
    updated_at = now()
  WHERE id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_gestao_salvar(
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
BEGIN
  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para salvar gestão de presença.';
  END IF;

  IF p_status_gestao IS NOT NULL AND p_status_gestao NOT IN ('aprovado', 'em_analise') THEN
    RAISE EXCEPTION 'status_gestao inválido.';
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
    p_justificativa,
    coalesce(p_historico, '[]'::jsonb),
    now()
  )
  ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
    status_gestao = EXCLUDED.status_gestao,
    correcao = EXCLUDED.correcao,
    justificativa = EXCLUDED.justificativa,
    historico = EXCLUDED.historico,
    updated_at = now();

  PERFORM public._rh_solicitacao_sync_calendario_atestado(
    p_funcionario_id,
    p_dia_iso,
    p_justificativa
  );
END;
$$;

-- Backfill: justificativas médicas já salvas antes desta correção.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT g.funcionario_id, g.dia_iso, g.justificativa
    FROM public.rh_calendario_presenca_gestao g
    WHERE g.justificativa IS NOT NULL
      AND coalesce(g.justificativa->>'motivo', '') = 'medico'
  LOOP
    PERFORM public._rh_solicitacao_sync_calendario_atestado(
      r.funcionario_id,
      r.dia_iso,
      r.justificativa
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) IS
  'Calendário RH: upsert da gestão de presença de um dia (inclui justificativa). Justificativa Médico gera solicitação de atestado.';

COMMIT;
