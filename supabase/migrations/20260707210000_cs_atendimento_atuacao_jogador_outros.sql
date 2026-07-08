-- Customer Success — atuação jogador e outros (sem empresa obrigatória)

BEGIN;

ALTER TABLE public.cs_chamados
  DROP CONSTRAINT IF EXISTS cs_chamados_atuacao_check;

ALTER TABLE public.cs_chamados
  ADD CONSTRAINT cs_chamados_atuacao_check
  CHECK (atuacao IN ('operador', 'provedor', 'parceria', 'agregador', 'jogador', 'outros'));

CREATE OR REPLACE FUNCTION public.cs_chamado_criar_site_spin(
  p_nome_completo text,
  p_telefone      text,
  p_email         text,
  p_atuacao       text,
  p_empresa       text,
  p_mensagem      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        uuid;
  v_protocolo text;
  v_nome      text := btrim(p_nome_completo);
  v_email     text := lower(btrim(p_email));
  v_atuacao   text := btrim(p_atuacao);
  v_empresa   text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_mensagem  text := btrim(coalesce(p_mensagem, ''));
BEGIN
  IF v_nome = '' OR v_email = '' OR v_atuacao = '' OR v_mensagem = '' THEN
    RAISE EXCEPTION 'Campos obrigatórios ausentes';
  END IF;

  IF v_atuacao NOT IN ('operador', 'provedor', 'parceria', 'agregador', 'jogador', 'outros') THEN
    RAISE EXCEPTION 'Atuação inválida';
  END IF;

  IF v_atuacao IN ('operador', 'provedor', 'parceria', 'agregador') AND v_empresa IS NULL THEN
    RAISE EXCEPTION 'Empresa obrigatória para esta atuação';
  END IF;

  IF v_atuacao IN ('jogador', 'outros') THEN
    v_empresa := NULL;
  END IF;

  v_protocolo := public.cs_gerar_protocolo_site();

  INSERT INTO public.cs_chamados (
    protocolo, origem, status, nome_completo, telefone, email, atuacao, empresa, mensagem
  ) VALUES (
    v_protocolo, 'site_spin', 'aberto', v_nome, nullif(btrim(coalesce(p_telefone, '')), ''), v_email, v_atuacao, v_empresa, v_mensagem
  )
  RETURNING id INTO v_id;

  INSERT INTO public.cs_chamado_historico (
    chamado_id, tipo_acao, usuario_id, usuario_nome, anotacao
  ) VALUES (
    v_id, 'abertura', NULL, v_nome, NULL
  );

  RETURN v_id;
END;
$$;

COMMIT;
