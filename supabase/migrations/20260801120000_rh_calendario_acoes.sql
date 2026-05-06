-- Calendário RH: registos de ações do prestador (venda folga/turno, trocas, reuniões).

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_calendario_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_acao text NOT NULL CHECK (
    tipo_acao IN (
      'venda_folga',
      'venda_turno',
      'oferta_troca',
      'troca_cassada',
      'agendamento_reuniao'
    )
  ),
  status text NOT NULL,
  ref_mes date,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rh_calendario_acoes_solicitante ON public.rh_calendario_acoes (solicitante_funcionario_id);
CREATE INDEX IF NOT EXISTS idx_rh_calendario_acoes_created ON public.rh_calendario_acoes (created_at DESC);

COMMENT ON TABLE public.rh_calendario_acoes IS
  'Ações registadas a partir do Calendário (prestador): venda de folga/turno, ofertas/solicitações de troca, agendamento de reunião.';

ALTER TABLE public.rh_calendario_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_calendario_acoes_select_own
  ON public.rh_calendario_acoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = rh_calendario_acoes.solicitante_funcionario_id
        AND f.status IN ('ativo', 'indisponivel')
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
    )
  );

CREATE POLICY rh_calendario_acoes_insert_own
  ON public.rh_calendario_acoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rh_funcionarios f
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = rh_calendario_acoes.solicitante_funcionario_id
        AND f.status IN ('ativo', 'indisponivel')
        AND (
          lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
          OR (
            trim(coalesce(f.email_spin, '')) <> ''
            AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
          )
        )
    )
  );

GRANT SELECT, INSERT ON public.rh_calendario_acoes TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_calendario_grade_colega_mes(
  p_ref_mes date,
  p_outro_funcionario_id uuid
)
RETURNS TABLE (dia_iso date, valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_me uuid;
  v_colega_ok boolean;
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND rp.page_key = 'rh_calendario'
        AND rp.can_view = 'proprios'
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  SELECT f.id
  INTO v_me
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

  IF v_me IS NULL THEN
    RETURN;
  END IF;

  IF p_outro_funcionario_id = v_me THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios me
    INNER JOIN public.rh_funcionarios outro ON outro.id = p_outro_funcionario_id
      AND outro.status IN ('ativo', 'indisponivel')
    WHERE me.id = v_me
      AND me.org_time_id IS NOT NULL
      AND me.org_time_id = outro.org_time_id
      AND coalesce(trim(me.staff_operadora_slug), '') <> ''
      AND trim(me.staff_operadora_slug) = trim(outro.staff_operadora_slug)
  )
  INTO v_colega_ok;

  IF NOT coalesce(v_colega_ok, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT g.dia_iso, g.valor
  FROM public.rh_gestao_escala_grade g
  WHERE g.ref_mes = v_ref
    AND g.funcionario_id = p_outro_funcionario_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) TO authenticated;

COMMENT ON FUNCTION public.rh_calendario_grade_colega_mes(date, uuid) IS
  'Calendário (prestador): células da grade do mês de um colega com mesmo org_time_id e staff_operadora_slug.';

COMMIT;
