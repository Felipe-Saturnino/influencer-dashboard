-- Calendário RH — justificativa de presença (motivo, atestado) + bucket de anexos.

BEGIN;

ALTER TABLE public.rh_calendario_presenca_gestao
  ADD COLUMN IF NOT EXISTS justificativa jsonb;

COMMENT ON COLUMN public.rh_calendario_presenca_gestao.justificativa IS
  'Justificativa de falta/pendência: motivo (medico/esquecimento/outro), atestado e observação.';

-- Retorno/assinatura mudou — CREATE OR REPLACE não altera OUT parameters.
DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_mes(uuid, date);
DROP FUNCTION IF EXISTS public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb);

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
  SELECT g.dia_iso, g.status_gestao, g.correcao, g.justificativa, g.historico
  FROM public.rh_calendario_presenca_gestao g
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= v_ref0
    AND g.dia_iso <= v_ref1
  ORDER BY g.dia_iso;
END;
$$;

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
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) IS
  'Calendário RH: gestão de presença (correção/aprovação/justificativa/histórico) do mês por funcionário.';

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) IS
  'Calendário RH: upsert da gestão de presença de um dia (inclui justificativa).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rh-calendario-presenca-atestados',
  'rh-calendario-presenca-atestados',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS rh_calendario_presenca_atestados_storage_select ON storage.objects;
CREATE POLICY rh_calendario_presenca_atestados_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rh-calendario-presenca-atestados');

DROP POLICY IF EXISTS rh_calendario_presenca_atestados_storage_insert ON storage.objects;
CREATE POLICY rh_calendario_presenca_atestados_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rh-calendario-presenca-atestados');

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb, jsonb) TO authenticated;

COMMIT;
