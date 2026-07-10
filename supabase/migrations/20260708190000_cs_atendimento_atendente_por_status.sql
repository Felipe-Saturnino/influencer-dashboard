-- Atendimento CS: atendente só ao alterar status (quem executa a ação); novos chamados sem atendente.

BEGIN;

CREATE OR REPLACE FUNCTION public.cs_chamado_atender(
  p_chamado_id   uuid,
  p_status_novo  text,
  p_anotacao     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_nome          text;
  v_row           public.cs_chamados%ROWTYPE;
  v_anotacao      text := btrim(coalesce(p_anotacao, ''));
  v_status_antigo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public._cs_atendimento_perm('edit') THEN
    RAISE EXCEPTION 'Sem permissão para atender chamados';
  END IF;

  IF p_status_novo NOT IN ('em_andamento', 'arquivado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  SELECT * INTO v_row FROM public.cs_chamados WHERE id = p_chamado_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF v_row.status = 'arquivado' THEN
    RAISE EXCEPTION 'Chamado já arquivado';
  END IF;

  IF p_status_novo = 'em_andamento' AND v_row.status <> 'aberto' THEN
    RAISE EXCEPTION 'Transição de status inválida';
  END IF;

  IF p_status_novo = 'arquivado' AND v_row.status NOT IN ('aberto', 'em_andamento') THEN
    RAISE EXCEPTION 'Transição de status inválida';
  END IF;

  v_status_antigo := v_row.status;

  IF p_status_novo <> v_status_antigo AND v_anotacao = '' THEN
    RAISE EXCEPTION 'Informe uma anotação ao alterar o status do chamado';
  END IF;

  SELECT coalesce(nullif(btrim(p.name), ''), p.email, '—')
  INTO v_nome
  FROM public.profiles p
  WHERE p.id = v_uid;

  UPDATE public.cs_chamados
  SET
    status = p_status_novo,
    atendente_id = CASE
      WHEN p_status_novo <> v_status_antigo THEN v_uid
      ELSE atendente_id
    END,
    inicio_atendimento_em = CASE
      WHEN p_status_novo = 'em_andamento' AND inicio_atendimento_em IS NULL THEN now()
      ELSE inicio_atendimento_em
    END,
    arquivado_em = CASE
      WHEN p_status_novo = 'arquivado' THEN now()
      ELSE arquivado_em
    END,
    updated_at = now()
  WHERE id = p_chamado_id;

  IF p_status_novo <> v_status_antigo THEN
    IF p_status_novo = 'em_andamento' THEN
      INSERT INTO public.cs_chamado_historico (
        chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao, status_anterior, status_novo
      ) VALUES (
        p_chamado_id, 'inicio_atendimento', v_uid, v_nome, v_anotacao, v_status_antigo, p_status_novo
      );
    ELSIF p_status_novo = 'arquivado' THEN
      INSERT INTO public.cs_chamado_historico (
        chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao, status_anterior, status_novo
      ) VALUES (
        p_chamado_id, 'arquivamento', v_uid, v_nome, v_anotacao, v_status_antigo, p_status_novo
      );
    END IF;
  ELSIF v_anotacao <> '' THEN
    INSERT INTO public.cs_chamado_historico (
      chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
    ) VALUES (
      p_chamado_id, 'anotacao', v_uid, v_nome, v_anotacao
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cs_chamado_atender(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_chamado_atender(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.cs_chamado_atender IS
  'Atendimento CS: altera status (em_andamento/arquivado). Atribui atendente_id ao usuário autenticado somente quando o status muda. Anotação obrigatória na mudança de status.';

COMMENT ON COLUMN public.cs_chamados.atendente_id IS
  'Responsável pelo chamado — preenchido na primeira alteração de status via cs_chamado_atender; NULL na abertura (site ou e-mail).';

COMMIT;
