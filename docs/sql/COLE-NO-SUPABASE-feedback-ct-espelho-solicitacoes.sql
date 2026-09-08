-- Cole no SQL Editor do Supabase (uma vez) para corrigir o espelho
-- Controle de Turno → Feedbacks → Solicitações (aba Feedback).
-- Depois rode: SELECT public.rh_solicitacoes_backfill_feedback_ct();

-- Conteúdo espelhado de:
-- supabase/migrations/20261209190000_escala_ct_feedback_espelho_rpc.sql
-- (e garante colunas da 20261209180000)

BEGIN;

ALTER TABLE public.escala_ct_feedback DROP CONSTRAINT IF EXISTS escala_ct_feedback_status_check;
ALTER TABLE public.escala_ct_feedback
  ADD CONSTRAINT escala_ct_feedback_status_check
  CHECK (status IN ('aplicado', 'revisar', 'rejeitado'));

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_solicitacoes_ct_feedback
  ON public.rh_solicitacoes (escala_ct_feedback_id)
  WHERE escala_ct_feedback_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._rh_solicitacoes_upsert_from_ct_feedback(
  p_id uuid,
  p_prestador_id uuid,
  p_recomendacao text,
  p_status text,
  p_observacao text,
  p_lideranca_nome text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_sol text;
  v_desc text;
  v_exist uuid;
BEGIN
  v_status_sol := CASE p_status
    WHEN 'revisar' THEN 'em_analise'
    WHEN 'aplicado' THEN 'aplicado'
    WHEN 'rejeitado' THEN 'rejeitado'
    ELSE 'em_analise'
  END;
  v_desc := left(btrim(coalesce(p_observacao, '')), 2000);

  SELECT id INTO v_exist
  FROM public.rh_solicitacoes
  WHERE escala_ct_feedback_id = p_id
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
      p_prestador_id,
      'feedback',
      v_status_sol,
      v_desc,
      p_recomendacao,
      'controle_turno',
      p_id,
      coalesce(p_lideranca_nome, '')
    )
    RETURNING id INTO v_exist;
  ELSE
    UPDATE public.rh_solicitacoes
    SET
      status = v_status_sol,
      descricao = CASE WHEN v_desc <> '' THEN v_desc ELSE descricao END,
      feedback_recomendacao = coalesce(p_recomendacao, feedback_recomendacao),
      lideranca_nome = CASE
        WHEN btrim(coalesce(p_lideranca_nome, '')) <> '' THEN p_lideranca_nome
        ELSE lideranca_nome
      END,
      updated_at = now()
    WHERE id = v_exist;
  END IF;

  RETURN v_exist;
END;
$$;

CREATE OR REPLACE FUNCTION public._escala_ct_feedback_espelha_solicitacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._rh_solicitacoes_upsert_from_ct_feedback(
    NEW.id,
    NEW.prestador_id,
    NEW.recomendacao,
    NEW.status,
    NEW.observacao,
    NEW.lideranca_nome
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escala_ct_feedback_espelha_solicitacao ON public.escala_ct_feedback;
CREATE TRIGGER trg_escala_ct_feedback_espelha_solicitacao
  AFTER INSERT OR UPDATE OF status, observacao, lideranca_nome ON public.escala_ct_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public._escala_ct_feedback_espelha_solicitacao();

CREATE OR REPLACE FUNCTION public.escala_ct_feedback_criar(
  p_data_registro date,
  p_prestador_id uuid,
  p_recomendacao text,
  p_observacao text,
  p_lideranca_nome text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nome text;
  v_status text;
  v_id uuid;
  v_obs text := trim(coalesce(p_observacao, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin')
    OR public._escala_controle_turno_perm('create')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para registrar feedback.';
  END IF;

  IF p_prestador_id IS NULL THEN
    RAISE EXCEPTION 'Prestador obrigatório.';
  END IF;

  IF p_recomendacao IS NULL OR p_recomendacao NOT IN (
    'orientacao', 'alinhamento', 'notif_descumprimento', 'notif_suspensao', 'persistencia'
  ) THEN
    RAISE EXCEPTION 'Recomendação inválida.';
  END IF;

  IF v_obs = '' THEN
    RAISE EXCEPTION 'Observação obrigatória.';
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), nullif(trim(p_lideranca_nome), ''), 'Liderança')
  INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_nome IS NULL THEN
    v_nome := coalesce(nullif(trim(p_lideranca_nome), ''), 'Liderança');
  END IF;

  v_status := CASE WHEN p_recomendacao = 'orientacao' THEN 'aplicado' ELSE 'revisar' END;

  INSERT INTO public.escala_ct_feedback (
    data_registro,
    prestador_id,
    recomendacao,
    status,
    observacao,
    lideranca_user_id,
    lideranca_nome,
    aplicado_por_user_id,
    aplicado_por_nome
  )
  VALUES (
    p_data_registro,
    p_prestador_id,
    p_recomendacao,
    v_status,
    v_obs,
    v_uid,
    v_nome,
    CASE WHEN v_status = 'aplicado' THEN v_uid ELSE NULL END,
    CASE WHEN v_status = 'aplicado' THEN v_nome ELSE '' END
  )
  RETURNING id INTO v_id;

  PERFORM public._rh_solicitacoes_upsert_from_ct_feedback(
    v_id,
    p_prestador_id,
    p_recomendacao,
    v_status,
    v_obs,
    v_nome
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_ct_feedback_criar(date, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_ct_feedback_criar(date, uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_solicitacoes_backfill_feedback_ct()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._rh_solicitacoes_perm('edit')
    OR public._escala_controle_turno_perm('edit')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para backfill.';
  END IF;

  FOR r IN
    SELECT f.*
    FROM public.escala_ct_feedback f
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.rh_solicitacoes s
      WHERE s.escala_ct_feedback_id = f.id
        AND s.tipo = 'feedback'
    )
  LOOP
    PERFORM public._rh_solicitacoes_upsert_from_ct_feedback(
      r.id,
      r.prestador_id,
      r.recomendacao,
      r.status,
      r.observacao,
      r.lideranca_nome
    );
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_solicitacoes_backfill_feedback_ct() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_solicitacoes_backfill_feedback_ct() TO authenticated;

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
    aplicado_por_user_id = CASE WHEN v_ct_status = 'aplicado' THEN coalesce(v_uid, f.aplicado_por_user_id) ELSE NULL END,
    aplicado_por_nome = CASE WHEN v_ct_status = 'aplicado' THEN coalesce(v_nome, f.aplicado_por_nome, '') ELSE '' END,
    updated_at = now()
  WHERE f.id = NEW.escala_ct_feedback_id;

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

COMMIT;

-- Depois do COMMIT, rode (logado como admin / com Editar):
-- SELECT public.rh_solicitacoes_backfill_feedback_ct();
