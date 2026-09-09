-- RH Solicitações: abas Feedback + sync Controle de Turno; status Aplicado/Rejeitado no CT;
-- tipos reuniao_lideranca; RLS para RH criar solicitação para outro prestador.

BEGIN;

-- ─── 1) escala_ct_feedback: status rejeitado ─────────────────────────────────
ALTER TABLE public.escala_ct_feedback DROP CONSTRAINT IF EXISTS escala_ct_feedback_status_check;
ALTER TABLE public.escala_ct_feedback
  ADD CONSTRAINT escala_ct_feedback_status_check
  CHECK (status IN ('aplicado', 'revisar', 'rejeitado'));

COMMENT ON COLUMN public.escala_ct_feedback.status IS
  'aplicado | revisar | rejeitado. Revisar ↔ Em análise em Solicitações; Atender Aprovado→aplicado, Rejeitado→rejeitado.';

-- Visibilidade em dias seguintes: só revisar (aplicado/rejeitado saem do bloco)
-- (já filtrado no client; documentado aqui)

-- ─── 2) rh_solicitacoes: feedback + reuniao_lideranca + aplicado ─────────────
ALTER TABLE public.rh_solicitacoes
  ADD COLUMN IF NOT EXISTS feedback_recomendacao text,
  ADD COLUMN IF NOT EXISTS feedback_origem text,
  ADD COLUMN IF NOT EXISTS escala_ct_feedback_id uuid REFERENCES public.escala_ct_feedback (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lideranca_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidencias_storage_paths text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.rh_solicitacoes DROP CONSTRAINT IF EXISTS rh_solicitacoes_tipo_check;
ALTER TABLE public.rh_solicitacoes
  ADD CONSTRAINT rh_solicitacoes_tipo_check
  CHECK (tipo IN ('atestado', 'vagas', 'reuniao_rh', 'reuniao_lideranca', 'feedback'));

ALTER TABLE public.rh_solicitacoes DROP CONSTRAINT IF EXISTS rh_solicitacoes_status_check;
ALTER TABLE public.rh_solicitacoes
  ADD CONSTRAINT rh_solicitacoes_status_check
  CHECK (status IN ('em_analise', 'aprovado', 'rejeitado', 'aplicado'));

ALTER TABLE public.rh_solicitacoes DROP CONSTRAINT IF EXISTS rh_solicitacoes_feedback_origem_check;
ALTER TABLE public.rh_solicitacoes
  ADD CONSTRAINT rh_solicitacoes_feedback_origem_check
  CHECK (
    feedback_origem IS NULL
    OR feedback_origem IN ('controle_turno', 'solicitacoes')
  );

ALTER TABLE public.rh_solicitacoes DROP CONSTRAINT IF EXISTS rh_solicitacoes_feedback_recomendacao_check;
ALTER TABLE public.rh_solicitacoes
  ADD CONSTRAINT rh_solicitacoes_feedback_recomendacao_check
  CHECK (
    feedback_recomendacao IS NULL
    OR feedback_recomendacao IN (
      'orientacao',
      'alinhamento',
      'notif_descumprimento',
      'notif_suspensao',
      'persistencia'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_solicitacoes_ct_feedback
  ON public.rh_solicitacoes (escala_ct_feedback_id)
  WHERE escala_ct_feedback_id IS NOT NULL;

COMMENT ON COLUMN public.rh_solicitacoes.feedback_origem IS
  'controle_turno = espelho CT; solicitacoes = criado só em Solicitações (sem sync CT).';
COMMENT ON COLUMN public.rh_solicitacoes.escala_ct_feedback_id IS
  'FK opcional para escala_ct_feedback quando origem = controle_turno.';
COMMENT ON COLUMN public.rh_solicitacoes.status IS
  'em_analise | aprovado | rejeitado | aplicado (Feedback origem CT após Aprovado).';

-- ─── 3) Solicitações → CT (só origem controle_turno) ─────────────────────────
CREATE OR REPLACE FUNCTION public._rh_solicitacao_feedback_sync_ct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ct_status text;
  v_uid uuid := auth.uid();
  v_nome text;
BEGIN
  IF NEW.tipo IS DISTINCT FROM 'feedback' THEN
    RETURN NEW;
  END IF;
  IF NEW.feedback_origem IS DISTINCT FROM 'controle_turno' THEN
    RETURN NEW;
  END IF;
  IF NEW.escala_ct_feedback_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Decisão Atender: aprovado → aplicado; rejeitado → rejeitado; aplicado → aplicado
  v_ct_status := CASE NEW.status
    WHEN 'aprovado' THEN 'aplicado'
    WHEN 'aplicado' THEN 'aplicado'
    WHEN 'rejeitado' THEN 'rejeitado'
    WHEN 'em_analise' THEN 'revisar'
    ELSE NULL
  END;

  IF v_ct_status IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), 'RH') INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  UPDATE public.escala_ct_feedback f
  SET
    status = v_ct_status,
    aplicado_por_user_id = CASE WHEN v_ct_status = 'aplicado' THEN coalesce(v_uid, f.aplicado_por_user_id) ELSE f.aplicado_por_user_id END,
    aplicado_por_nome = CASE
      WHEN v_ct_status = 'aplicado' THEN coalesce(v_nome, f.aplicado_por_nome, '')
      ELSE f.aplicado_por_nome
    END,
    updated_at = now()
  WHERE f.id = NEW.escala_ct_feedback_id;

  -- Normaliza status na solicitação: Aprovado (atender) grava como Aplicado
  IF NEW.status = 'aprovado' THEN
    NEW.status := 'aplicado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_solicitacao_feedback_sync_ct ON public.rh_solicitacoes;
CREATE TRIGGER trg_rh_solicitacao_feedback_sync_ct
  BEFORE UPDATE OF status ON public.rh_solicitacoes
  FOR EACH ROW
  EXECUTE FUNCTION public._rh_solicitacao_feedback_sync_ct();

-- Evita loop: UPDATE CT dispara UPDATE solicitação — só se status divergir
CREATE OR REPLACE FUNCTION public._escala_ct_feedback_espelha_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_sol text;
  v_desc text;
  v_exist uuid;
BEGIN
  v_status_sol := CASE NEW.status
    WHEN 'revisar' THEN 'em_analise'
    WHEN 'aplicado' THEN 'aplicado'
    WHEN 'rejeitado' THEN 'rejeitado'
    ELSE 'em_analise'
  END;
  v_desc := left(btrim(coalesce(NEW.observacao, '')), 2000);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rh_solicitacoes (
      rh_funcionario_id,
      tipo,
      status,
      descricao,
      feedback_recomendacao,
      feedback_origem,
      escala_ct_feedback_id,
      lideranca_nome
    )
    VALUES (
      NEW.prestador_id,
      'feedback',
      v_status_sol,
      v_desc,
      NEW.recomendacao,
      'controle_turno',
      NEW.id,
      coalesce(NEW.lideranca_nome, '')
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT id INTO v_exist
    FROM public.rh_solicitacoes
    WHERE escala_ct_feedback_id = NEW.id
      AND tipo = 'feedback'
    LIMIT 1;

    IF v_exist IS NULL THEN
      INSERT INTO public.rh_solicitacoes (
        rh_funcionario_id,
        tipo,
        status,
        descricao,
        feedback_recomendacao,
        feedback_origem,
        escala_ct_feedback_id,
        lideranca_nome
      )
      VALUES (
        NEW.prestador_id,
        'feedback',
        v_status_sol,
        v_desc,
        NEW.recomendacao,
        'controle_turno',
        NEW.id,
        coalesce(NEW.lideranca_nome, '')
      );
    ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.observacao IS DISTINCT FROM OLD.observacao THEN
      UPDATE public.rh_solicitacoes
      SET
        status = v_status_sol,
        descricao = CASE WHEN btrim(coalesce(NEW.observacao, '')) <> '' THEN v_desc ELSE descricao END,
        updated_at = now()
      WHERE id = v_exist
        AND status IS DISTINCT FROM v_status_sol;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escala_ct_feedback_espelha_solicitacao ON public.escala_ct_feedback;
CREATE TRIGGER trg_escala_ct_feedback_espelha_solicitacao
  AFTER INSERT OR UPDATE OF status, observacao ON public.escala_ct_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public._escala_ct_feedback_espelha_solicitacao();

-- ─── 5) RLS: RH com Editar Sim pode criar para qualquer prestador ────────────
DROP POLICY IF EXISTS rh_solicitacoes_insert ON public.rh_solicitacoes;
CREATE POLICY rh_solicitacoes_insert ON public.rh_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      public._rh_solicitacoes_perm('create')
      AND public._rh_funcionario_vinculado_ao_login(rh_funcionario_id)
    )
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Trigger SECURITY DEFINER já bypassa RLS no espelho CT→Solicitações

-- ─── 6) Sync reuniao_lideranca no calendário (mesmo padrão reuniao_rh) ───────
CREATE OR REPLACE FUNCTION public._rh_solicitacao_sync_reuniao_rh_calendario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo NOT IN ('reuniao_rh', 'reuniao_lideranca') OR NEW.rh_calendario_acao_id IS NULL THEN
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

-- ─── 7) RPC: agendar reunião (RH ou Liderança) para um prestador (origem Solicitações)
CREATE OR REPLACE FUNCTION public.rh_solicitacoes_agendar_reuniao(
  p_prestador_id uuid,
  p_tipo text, -- reuniao_rh | reuniao_lideranca
  p_dia_iso date,
  p_turno text,
  p_observacao text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao_id uuid;
  v_sol_id uuid;
  v_obs text := trim(coalesce(p_observacao, ''));
  v_ref date := date_trunc('month', p_dia_iso)::date;
  v_label text;
  v_com text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      public._rh_solicitacoes_perm('edit')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_solicitacoes'
          AND rp.can_editar = 'sim'
      )
    )
    OR (
      public._rh_solicitacoes_perm('create')
      AND public._rh_funcionario_vinculado_ao_login(p_prestador_id)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para agendar reunião.';
  END IF;

  IF p_tipo NOT IN ('reuniao_rh', 'reuniao_lideranca') THEN
    RAISE EXCEPTION 'Tipo de reunião inválido.';
  END IF;

  IF v_obs = '' THEN
    RAISE EXCEPTION 'Informe a observação.';
  END IF;

  IF p_dia_iso IS NULL OR p_dia_iso <= current_date THEN
    RAISE EXCEPTION 'A data da reunião deve ser um dia futuro.';
  END IF;

  IF p_tipo = 'reuniao_rh' THEN
    v_com := 'rh';
    v_label := 'RH';
  ELSE
    v_com := 'lideranca';
    v_label := 'Liderança';
  END IF;

  INSERT INTO public.rh_calendario_acoes (
    solicitante_funcionario_id,
    tipo_acao,
    status,
    ref_mes,
    payload
  )
  VALUES (
    p_prestador_id,
    'agendamento_reuniao',
    'Pendente',
    v_ref,
    jsonb_build_object(
      'dia_iso', to_char(p_dia_iso, 'YYYY-MM-DD'),
      'turno', coalesce(trim(p_turno), ''),
      'reuniao_com', v_com,
      'reuniao_com_label', v_label,
      'motivo', v_obs,
      'origem', 'solicitacoes'
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
    p_prestador_id,
    p_tipo,
    'em_analise',
    v_obs,
    v_acao_id,
    p_dia_iso
  )
  RETURNING id INTO v_sol_id;

  RETURN v_sol_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_solicitacoes_agendar_reuniao(uuid, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_solicitacoes_agendar_reuniao(uuid, text, date, text, text) TO authenticated;

COMMIT;
