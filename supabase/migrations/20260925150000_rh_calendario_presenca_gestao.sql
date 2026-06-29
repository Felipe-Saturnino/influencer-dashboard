-- Calendário RH — Controle de Presença: gestão local (aprovação, correção, histórico) por funcionário/dia.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_calendario_presenca_gestao (
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  dia_iso date NOT NULL,
  status_gestao text CHECK (status_gestao IS NULL OR status_gestao IN ('aprovado', 'em_analise')),
  correcao jsonb,
  historico jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (funcionario_id, dia_iso)
);

CREATE INDEX IF NOT EXISTS rh_calendario_presenca_gestao_dia_idx
  ON public.rh_calendario_presenca_gestao (funcionario_id, dia_iso);

COMMENT ON TABLE public.rh_calendario_presenca_gestao IS
  'Calendário RH — aba Controle de Presença: aprovação de turno, correção de horários e histórico por dia.';

ALTER TABLE public.rh_calendario_presenca_gestao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_calendario_presenca_gestao FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_calendario_presenca_gestao FROM authenticated;

CREATE OR REPLACE FUNCTION public._rh_calendario_pode_acessar_funcionario(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_calendario_proprios boolean := false;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
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
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN true;
  END IF;

  SELECT (rp.can_view = 'proprios')
  INTO v_calendario_proprios
  FROM public.profiles p
  INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
  WHERE p.id = auth.uid()
    AND rp.page_key = 'rh_calendario'
  LIMIT 1;
  v_calendario_proprios := coalesce(v_calendario_proprios, false);

  IF NOT v_calendario_proprios THEN
    RETURN true;
  END IF;

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

  RETURN v_meu_funcionario_id IS NOT NULL AND p_funcionario_id = v_meu_funcionario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_gestao_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  dia_iso date,
  status_gestao text,
  correcao jsonb,
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
  SELECT g.dia_iso, g.status_gestao, g.correcao, g.historico
  FROM public.rh_calendario_presenca_gestao g
  WHERE g.funcionario_id = p_funcionario_id
    AND g.dia_iso >= v_ref0
    AND g.dia_iso <= v_ref1
  ORDER BY g.dia_iso;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_gestao_salvar(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_status_gestao text,
  p_correcao jsonb,
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
    historico,
    updated_at
  )
  VALUES (
    p_funcionario_id,
    p_dia_iso,
    p_status_gestao,
    p_correcao,
    coalesce(p_historico, '[]'::jsonb),
    now()
  )
  ON CONFLICT (funcionario_id, dia_iso) DO UPDATE SET
    status_gestao = EXCLUDED.status_gestao,
    correcao = EXCLUDED.correcao,
    historico = EXCLUDED.historico,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) IS
  'Calendário RH: gestão de presença (correção/aprovação/histórico) do mês por funcionário.';

COMMENT ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb) IS
  'Calendário RH: upsert da gestão de presença de um dia.';

REVOKE ALL ON FUNCTION public._rh_calendario_pode_acessar_funcionario(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_mes(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_gestao_salvar(uuid, date, text, jsonb, jsonb) TO authenticated;

COMMIT;
