-- Ponto: gravar funcionario_id e ler por todas as contas Auth ligadas ao RH
-- (evita check-in ok + horário vazio quando e-mail pessoal e e-mail Spin apontam
-- para auth.users distintos e a RPC escolhia só um com LIMIT 1).

BEGIN;

ALTER TABLE public.prestador_ponto_registros
  ADD COLUMN IF NOT EXISTS funcionario_id uuid REFERENCES public.rh_funcionarios (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.prestador_ponto_registros.funcionario_id IS
  'rh_funcionarios do turno; preferência de leitura na RPC de presença.';

CREATE INDEX IF NOT EXISTS prestador_ponto_registros_func_dia_idx
  ON public.prestador_ponto_registros (funcionario_id, dia_sp, created_at DESC)
  WHERE funcionario_id IS NOT NULL;

-- Backfill: usuario Auth → e-mail → rh_funcionarios (ativo/indisponível)
UPDATE public.prestador_ponto_registros r
SET funcionario_id = sub.fid
FROM (
  SELECT DISTINCT ON (u.id)
    u.id AS uid,
    f.id AS fid
  FROM auth.users u
  INNER JOIN public.rh_funcionarios f
    ON (
      lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
      OR (
        trim(coalesce(f.email_spin, '')) <> ''
        AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
      )
    )
  WHERE f.status IN ('ativo', 'indisponivel')
  ORDER BY u.id, f.updated_at DESC NULLS LAST
) sub
WHERE r.funcionario_id IS NULL
  AND r.user_id = sub.uid;

CREATE OR REPLACE FUNCTION public.rh_calendario_ponto_registros_mes(
  p_funcionario_id uuid,
  p_ref_mes date
)
RETURNS TABLE (
  dia_sp date,
  check_in_at timestamptz,
  check_out_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref0 date := date_trunc('month', p_ref_mes)::date;
  v_ref1 date := (date_trunc('month', p_ref_mes) + interval '1 month - 1 day')::date;
  v_ok boolean;
  v_meu_funcionario_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._prestador_page_perm('rh_calendario', 'view')
    OR public._prestador_page_perm('dash_overview_prestador', 'view')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
      WHERE p.id = auth.uid()
        AND p.role IS DISTINCT FROM 'prestador'
        AND rp.page_key IN ('rh_calendario', 'rh_gestao_escala', 'dash_overview_prestador')
        AND rp.can_view IN ('sim', 'proprios')
    )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;

  IF public._dash_escopo_proprios_prestador() THEN
    SELECT f.id
    INTO v_meu_funcionario_id
    FROM public.rh_funcionarios f
    INNER JOIN auth.users u ON u.id = auth.uid()
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
        )
        OR lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(p.email, '')))
        OR (
          trim(coalesce(f.email_spin, '')) <> ''
          AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(p.email, '')))
        )
      )
    ORDER BY f.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_meu_funcionario_id IS NULL OR p_funcionario_id <> v_meu_funcionario_id THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT gs::date AS dia
    FROM generate_series(v_ref0, v_ref1, interval '1 day') AS gs
  ),
  uids AS (
    -- Todas as contas Auth cujo e-mail casa com e-mail / e-mail Spin do prestador
    SELECT u.id AS user_id
    FROM auth.users u
    INNER JOIN public.rh_funcionarios f ON f.id = p_funcionario_id
    WHERE lower(trim(coalesce(f.email, ''))) = lower(trim(coalesce(u.email::text, '')))
       OR (
         trim(coalesce(f.email_spin, '')) <> ''
         AND lower(trim(coalesce(f.email_spin, ''))) = lower(trim(coalesce(u.email::text, '')))
       )
  ),
  agg AS (
    SELECT r.dia_sp,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS ci,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS co
    FROM public.prestador_ponto_registros r
    WHERE r.dia_sp >= v_ref0
      AND r.dia_sp <= v_ref1
      AND (
        r.funcionario_id = p_funcionario_id
        OR r.user_id IN (SELECT uids.user_id FROM uids)
      )
    GROUP BY r.dia_sp
  )
  SELECT days.dia, agg.ci, agg.co
  FROM days
  LEFT JOIN agg ON agg.dia_sp = days.dia
  ORDER BY 1;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_ponto_registros_mes(uuid, date) IS
  'Calendário RH / Overview Prestador: check-in e check-out por dia do turno (funcionario_id ou todas as contas Auth ligadas ao RH).';

COMMIT;
