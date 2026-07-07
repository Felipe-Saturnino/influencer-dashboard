-- RH — Reunião com RH: solicitação ao agendar; calendário só após aprovação (solicitante + RH que atendeu).

BEGIN;

ALTER TABLE public.rh_solicitacoes
  ADD COLUMN IF NOT EXISTS rh_calendario_acao_id uuid REFERENCES public.rh_calendario_acoes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reuniao_dia_iso date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_solicitacoes_calendario_acao
  ON public.rh_solicitacoes (rh_calendario_acao_id)
  WHERE rh_calendario_acao_id IS NOT NULL;

ALTER TABLE public.rh_solicitacoes DROP CONSTRAINT IF EXISTS rh_solicitacoes_tipo_check;
ALTER TABLE public.rh_solicitacoes
  ADD CONSTRAINT rh_solicitacoes_tipo_check
  CHECK (tipo IN ('atestado', 'vagas', 'reuniao_rh'));

COMMENT ON COLUMN public.rh_solicitacoes.rh_calendario_acao_id IS
  'Ação de calendário (agendamento_reuniao) vinculada — tipo reuniao_rh.';
COMMENT ON COLUMN public.rh_solicitacoes.reuniao_dia_iso IS
  'Data agendada da reunião com RH (tipo reuniao_rh).';

CREATE OR REPLACE FUNCTION public._rh_solicitacao_sync_reuniao_rh_calendario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo IS DISTINCT FROM 'reuniao_rh' OR NEW.rh_calendario_acao_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    UPDATE public.rh_calendario_acoes
    SET status = 'Agendado'
    WHERE id = NEW.rh_calendario_acao_id
      AND tipo_acao = 'agendamento_reuniao';
  ELSIF NEW.status = 'rejeitado' AND (OLD.status IS DISTINCT FROM 'rejeitado') THEN
    UPDATE public.rh_calendario_acoes
    SET status = 'Rejeitado'
    WHERE id = NEW.rh_calendario_acao_id
      AND tipo_acao = 'agendamento_reuniao';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_solicitacao_reuniao_rh_calendario ON public.rh_solicitacoes;
CREATE TRIGGER trg_rh_solicitacao_reuniao_rh_calendario
  AFTER UPDATE OF status ON public.rh_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public._rh_solicitacao_sync_reuniao_rh_calendario();

CREATE OR REPLACE FUNCTION public.rh_calendario_agendar_reuniao_rh(
  p_solicitante_funcionario_id uuid,
  p_ref_mes date,
  p_dia_iso date,
  p_turno text,
  p_motivo text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao_id uuid;
  v_solicitacao_id uuid;
  v_motivo text := trim(coalesce(p_motivo, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para agendar reunião.';
  END IF;

  IF NOT public._rh_funcionario_vinculado_ao_login(p_solicitante_funcionario_id) THEN
    RAISE EXCEPTION 'Sem permissão para agendar reunião.';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo da reunião.';
  END IF;

  IF p_dia_iso IS NULL OR p_dia_iso <= current_date THEN
    RAISE EXCEPTION 'A data da reunião deve ser um dia futuro.';
  END IF;

  INSERT INTO public.rh_calendario_acoes (
    solicitante_funcionario_id,
    tipo_acao,
    status,
    ref_mes,
    payload
  )
  VALUES (
    p_solicitante_funcionario_id,
    'agendamento_reuniao',
    'Pendente',
    date_trunc('month', p_ref_mes)::date,
    jsonb_build_object(
      'dia_iso', to_char(p_dia_iso, 'YYYY-MM-DD'),
      'turno', coalesce(trim(p_turno), ''),
      'reuniao_com', 'rh',
      'reuniao_com_label', 'RH',
      'motivo', v_motivo
    )
  )
  RETURNING id INTO v_acao_id;

  INSERT INTO public.rh_solicitacoes (
    rh_funcionario_id,
    tipo,
    status,
    descricao,
    rh_calendario_acao_id,
    reuniao_dia_iso
  )
  VALUES (
    p_solicitante_funcionario_id,
    'reuniao_rh',
    'em_analise',
    v_motivo,
    v_acao_id,
    p_dia_iso
  )
  RETURNING id INTO v_solicitacao_id;

  RETURN v_solicitacao_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_agendar_reuniao_rh(uuid, date, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_agendar_reuniao_rh(uuid, date, date, text, text) TO authenticated;

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
  LEFT JOIN public.rh_solicitacoes s
    ON s.rh_calendario_acao_id = a.id
    AND s.tipo = 'reuniao_rh'
  WHERE a.tipo_acao = 'agendamento_reuniao'
    AND coalesce(trim(a.payload->>'dia_iso'), '') <> ''
    AND length(trim(a.payload->>'dia_iso')) >= 10
    AND date_trunc('month', left(trim(a.payload->>'dia_iso'), 10)::date) = v_ref
    AND (
      (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NOT NULL
        AND s.status = 'aprovado'
        AND (
          public._rh_funcionario_vinculado_ao_login(a.solicitante_funcionario_id)
          OR auth.uid() = s.atendido_por
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) <> 'rh'
        AND a.status = 'Agendado'
        AND (
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
          OR NOT coalesce(v_calendario_proprios, false)
          OR (
            v_meu_funcionario_id IS NOT NULL
            AND (
              a.solicitante_funcionario_id = v_meu_funcionario_id
              OR (
                trim(coalesce(a.payload->>'reuniao_com', '')) = 'shift_lead'
                AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'shift_leader')
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
                  FROM public.user_scopes sc
                  WHERE sc.user_id = auth.uid()
                    AND sc.scope_type = 'gestor_tipo'
                    AND sc.scope_ref = 'operacoes'
                )
              )
            )
          )
        )
      )
      OR (
        trim(coalesce(a.payload->>'reuniao_com', '')) = 'rh'
        AND s.id IS NULL
        AND a.status = 'Agendado'
        AND (
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
          OR NOT coalesce(v_calendario_proprios, false)
          OR (
            v_meu_funcionario_id IS NOT NULL
            AND (
              a.solicitante_funcionario_id = v_meu_funcionario_id
              OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'rh')
            )
          )
        )
      )
    )
  ORDER BY a.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_agendar_reuniao_rh(uuid, date, date, text, text) IS
  'Calendário RH: agendar reunião com RH — cria ação Pendente + solicitação reuniao_rh em análise.';

COMMENT ON FUNCTION public.rh_calendario_reunioes_mes(date) IS
  'Calendário RH: reuniões do mês. Reunião com RH: só aprovada, visível ao solicitante e ao RH que atendeu. Demais destinos: regra anterior.';

COMMIT;
