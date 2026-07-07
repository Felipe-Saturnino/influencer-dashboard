-- Calendário RH — aprovação mensal de presença (mês fechado).

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_calendario_presenca_aprovacao_mes (
  funcionario_id uuid NOT NULL REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  ref_mes date NOT NULL,
  aprovado_em timestamptz NOT NULL DEFAULT now(),
  aprovado_por uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  aprovado_por_nome text NOT NULL,
  PRIMARY KEY (funcionario_id, ref_mes),
  CONSTRAINT rh_calendario_presenca_aprovacao_mes_ref_mes_check
    CHECK (ref_mes = date_trunc('month', ref_mes)::date)
);

CREATE INDEX IF NOT EXISTS rh_calendario_presenca_aprovacao_mes_ref_idx
  ON public.rh_calendario_presenca_aprovacao_mes (funcionario_id, ref_mes DESC);

COMMENT ON TABLE public.rh_calendario_presenca_aprovacao_mes IS
  'Calendário RH — registro de aprovação mensal de presença (Controle de Presença, mês fechado).';

ALTER TABLE public.rh_calendario_presenca_aprovacao_mes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rh_calendario_presenca_aprovacao_mes FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_calendario_presenca_aprovacao_mes FROM authenticated;

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_aprovacao_mes_obter(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  aprovado_em timestamptz,
  aprovado_por uuid,
  aprovado_por_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
BEGIN
  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.aprovado_em, a.aprovado_por, a.aprovado_por_nome
  FROM public.rh_calendario_presenca_aprovacao_mes a
  WHERE a.funcionario_id = p_funcionario_id
    AND a.ref_mes = v_ref
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(
  p_funcionario_id uuid,
  p_ref_mes date,
  p_aprovado_por_nome text
)
RETURNS TABLE (
  aprovado_em timestamptz,
  aprovado_por uuid,
  aprovado_por_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref date := date_trunc('month', p_ref_mes)::date;
  v_now timestamptz := now();
  v_nome text := nullif(trim(coalesce(p_aprovado_por_nome, '')), '');
BEGIN
  IF NOT public._rh_calendario_pode_acessar_funcionario(p_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar presença do mês.';
  END IF;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Nome do aprovador é obrigatório.';
  END IF;

  INSERT INTO public.rh_calendario_presenca_aprovacao_mes (
    funcionario_id,
    ref_mes,
    aprovado_em,
    aprovado_por,
    aprovado_por_nome
  )
  VALUES (
    p_funcionario_id,
    v_ref,
    v_now,
    auth.uid(),
    v_nome
  )
  ON CONFLICT (funcionario_id, ref_mes) DO UPDATE SET
    aprovado_em = EXCLUDED.aprovado_em,
    aprovado_por = EXCLUDED.aprovado_por,
    aprovado_por_nome = EXCLUDED.aprovado_por_nome;

  RETURN QUERY
  SELECT a.aprovado_em, a.aprovado_por, a.aprovado_por_nome
  FROM public.rh_calendario_presenca_aprovacao_mes a
  WHERE a.funcionario_id = p_funcionario_id
    AND a.ref_mes = v_ref;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_obter(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_obter(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_presenca_aprovacao_mes_salvar(uuid, date, text) TO authenticated;

COMMIT;
