-- Calendário RH: listar ações com status «Ofertado» num dia (modal do calendário, aba Ofertas).

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_calendario_acoes_ofertadas_no_dia(p_dia_iso date)
RETURNS TABLE (
  id uuid,
  solicitante_funcionario_id uuid,
  tipo_acao text,
  status text,
  payload jsonb,
  created_at timestamptz,
  solicitante_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_proprios boolean := false;
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
    INTO v_proprios
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_calendario'
    LIMIT 1;
    v_proprios := coalesce(v_proprios, false);
  END IF;

  IF coalesce(v_proprios, false) THEN
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
  SELECT
    a.id,
    a.solicitante_funcionario_id,
    a.tipo_acao,
    a.status,
    a.payload,
    a.created_at,
    trim(coalesce(f.nome, ''))::text AS solicitante_nome
  FROM public.rh_calendario_acoes a
  LEFT JOIN public.rh_funcionarios f
    ON f.id = a.solicitante_funcionario_id
    AND f.status IN ('ativo', 'indisponivel')
  WHERE a.status = 'Ofertado'
    AND (a.payload ? 'dia_iso')
    AND length(trim(a.payload->>'dia_iso')) >= 10
    AND (substring(trim(a.payload->>'dia_iso'), 1, 10))::date = p_dia_iso
    AND (
      NOT coalesce(v_proprios, false)
      OR a.solicitante_funcionario_id = v_meu_funcionario_id
    )
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_acoes_ofertadas_no_dia(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_acoes_ofertadas_no_dia(date) TO authenticated;

COMMENT ON FUNCTION public.rh_calendario_acoes_ofertadas_no_dia(date) IS
  'Calendário RH: ações com status Ofertado cujo payload.dia_iso coincide com o dia. Vista completa (sim / admin): todos os solicitantes. Vista proprios: só o funcionário ligado ao login.';

COMMIT;
