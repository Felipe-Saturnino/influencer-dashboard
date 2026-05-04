-- Calendário RH: com can_view «proprios» em rh_calendario, o RPC devolve só a grade do colaborador
-- vinculado ao e-mail de login ou e-mail Spin (mesma regra do self-cadastro).

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_escala_mes(p_ref_mes date)
RETURNS TABLE (funcionario_id uuid, dia_iso date, valor text, area_key text)
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
  SELECT g.funcionario_id, g.dia_iso, g.valor, g.area_key
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND (
      NOT coalesce(v_calendario_proprios, false)
      OR g.funcionario_id = v_meu_funcionario_id
    );
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_grade_escala_mes(date) IS
  'Calendário RH: células da grade do mês. Admin / rh_gestao_escala ou rh_calendario can_view sim: todas as áreas. rh_calendario can_view proprios: só o funcionário cujo e-mail ou e-mail Spin coincide com o perfil.';

COMMIT;
