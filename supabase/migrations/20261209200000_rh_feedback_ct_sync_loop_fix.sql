-- Fix: Atender Feedback em Solicitações (Aprovado/Rejeitado) estourava
-- "stack depth limit exceeded" por loop entre:
--   trg_rh_solicitacao_feedback_sync_ct  (sol → CT)
--   trg_escala_ct_feedback_espelha_solicitacao (CT → sol)
-- Solução: flag de sessão app.feedback_sync_direction + UPDATE só se status mudar.

BEGIN;

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
  v_dir text := coalesce(nullif(current_setting('app.feedback_sync_direction', true), ''), '');
BEGIN
  -- Atender em Solicitações já está a gravar a linha — não reescrever (evita loop).
  IF v_dir = 'sol_to_ct' THEN
    SELECT id INTO v_exist
    FROM public.rh_solicitacoes
    WHERE escala_ct_feedback_id = p_id
      AND tipo = 'feedback'
    LIMIT 1;
    RETURN v_exist;
  END IF;

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
    PERFORM set_config('app.feedback_sync_direction', 'ct_to_sol', true);
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
    PERFORM set_config('app.feedback_sync_direction', '', true);
  ELSE
    PERFORM set_config('app.feedback_sync_direction', 'ct_to_sol', true);
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
    WHERE id = v_exist
      AND (
        status IS DISTINCT FROM v_status_sol
        OR (v_desc <> '' AND descricao IS DISTINCT FROM v_desc)
        OR (
          p_recomendacao IS NOT NULL
          AND feedback_recomendacao IS DISTINCT FROM p_recomendacao
        )
        OR (
          btrim(coalesce(p_lideranca_nome, '')) <> ''
          AND lideranca_nome IS DISTINCT FROM p_lideranca_nome
        )
      );
    PERFORM set_config('app.feedback_sync_direction', '', true);
  END IF;

  RETURN v_exist;
END;
$$;

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
  v_dir text := coalesce(nullif(current_setting('app.feedback_sync_direction', true), ''), '');
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

  -- Espelho CT → Solicitações: não empurrar de volta para o CT.
  IF v_dir = 'ct_to_sol' THEN
    IF NEW.status = 'aprovado' THEN
      NEW.status := 'aplicado';
    END IF;
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

  PERFORM set_config('app.feedback_sync_direction', 'sol_to_ct', true);

  UPDATE public.escala_ct_feedback f
  SET
    status = v_ct_status,
    aplicado_por_user_id = CASE
      WHEN v_ct_status = 'aplicado' THEN coalesce(v_uid, f.aplicado_por_user_id)
      ELSE NULL
    END,
    aplicado_por_nome = CASE
      WHEN v_ct_status = 'aplicado' THEN coalesce(v_nome, f.aplicado_por_nome, '')
      ELSE ''
    END,
    updated_at = now()
  WHERE f.id = NEW.escala_ct_feedback_id
    AND f.status IS DISTINCT FROM v_ct_status;

  PERFORM set_config('app.feedback_sync_direction', '', true);

  IF NEW.status = 'aprovado' THEN
    NEW.status := 'aplicado';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
