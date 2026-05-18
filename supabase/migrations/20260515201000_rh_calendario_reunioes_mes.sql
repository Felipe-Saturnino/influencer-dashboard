-- Calendário RH: reuniões agendadas (rh_calendario_acoes agendamento_reuniao) visíveis por mês.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_calendario_reunioes_mes(p_ref_mes date)
RETURNS TABLE (
  id uuid,
  solicitante_funcionario_id uuid,
  solicitante_nome text,
  dia_iso date,
  reuniao_com text,
  reuniao_com_label text,
  motivo text,
  turno text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_ok boolean;
  v_calendario_proprios boolean := false;
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
    INTO v_calendario_proprios
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
    WHERE p.id = auth.uid()
      AND rp.page_key = 'rh_calendario'
    LIMIT 1;
    v_calendario_proprios := coalesce(v_calendario_proprios, false);
  END IF;

  IF coalesce(v_calendario_proprios, false) THEN
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
    trim(coalesce(f.nome, ''))::text AS solicitante_nome,
    left(trim(a.payload->>'dia_iso'), 10)::date AS dia_iso,
    trim(coalesce(a.payload->>'reuniao_com', ''))::text AS reuniao_com,
    trim(coalesce(a.payload->>'reuniao_com_label', ''))::text AS reuniao_com_label,
    trim(coalesce(a.payload->>'motivo', ''))::text AS motivo,
    trim(coalesce(a.payload->>'turno', ''))::text AS turno,
    a.status,
    a.created_at
  FROM public.rh_calendario_acoes a
  LEFT JOIN public.rh_funcionarios f
    ON f.id = a.solicitante_funcionario_id
    AND f.status IN ('ativo', 'indisponivel')
  WHERE a.tipo_acao = 'agendamento_reuniao'
    AND coalesce(trim(a.payload->>'dia_iso'), '') <> ''
    AND length(trim(a.payload->>'dia_iso')) >= 10
    AND date_trunc('month', left(trim(a.payload->>'dia_iso'), 10)::date) = v_ref
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR NOT coalesce(v_calendario_proprios, false)
      OR (
        a.solicitante_funcionario_id = v_meu_funcionario_id
        OR (
          trim(coalesce(a.payload->>'reuniao_com', '')) = 'shift_lead'
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'shift_leader')
        )
        OR (
          trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'rh')
        )
        OR (
          trim(coalesce(a.payload->>'reuniao_com', '')) = 'figurino'
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'figurino')
        )
        OR (
          trim(coalesce(a.payload->>'reuniao_com', '')) = 'gerente_operacoes'
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'gestor')
          AND EXISTS (
            SELECT 1
            FROM public.user_scopes s
            WHERE s.user_id = auth.uid()
              AND s.scope_type = 'gestor_tipo'
              AND s.scope_ref = 'operacoes'
          )
        )
      )
    )
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_reunioes_mes(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_reunioes_mes(date) TO authenticated;

COMMENT ON FUNCTION public.rh_calendario_reunioes_mes(date) IS
  'Calendário RH: reuniões agendadas (agendamento_reuniao) no mês. Vista ampla (admin / sem «proprios» em rh_calendario): todas. Vista «proprios»: solicitante ou destinatário (perfil Shift Lead, RH, Figurino, Gestor tipo Estúdio/operacoes).';

COMMIT;
