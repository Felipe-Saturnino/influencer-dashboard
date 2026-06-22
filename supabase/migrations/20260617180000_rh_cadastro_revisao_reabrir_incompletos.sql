-- Reabrir revisão cadastral de prestadores que registraram conclusão com cadastro incompleto.
-- Espelha lib/rhCadastroRevisaoCompleteness.ts (Dados cadastrais, documentos, formação, experiência).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_digits_len(p_text text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT length(regexp_replace(coalesce(p_text, ''), '\D', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public._rh_cadastro_doc_categorias_obrigatorias(p_tipo text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE trim(coalesce(p_tipo, ''))
    WHEN 'PJ' THEN ARRAY[
      'rg', 'cpf', 'comprovante_residencia', 'cartao_cnpj', 'comprovante_contas_bancarias'
    ]::text[]
    WHEN 'CLT' THEN ARRAY[
      'rg', 'cpf', 'comprovante_residencia', 'carteira_trabalho', 'comprovante_contas_bancarias'
    ]::text[]
    WHEN 'Estagio' THEN ARRAY[
      'rg', 'cpf', 'comprovante_residencia', 'comprovante_matricula_faculdade', 'comprovante_contas_bancarias'
    ]::text[]
    ELSE ARRAY[
      'rg', 'cpf', 'comprovante_residencia', 'comprovante_contas_bancarias'
    ]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.rh_cadastro_revisao_esta_completo(p_funcionario_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.rh_funcionarios%ROWTYPE;
  cat text;
  tel_len integer;
  tel_emerg_len integer;
  cep_res_len integer;
  cep_emp_len integer;
  cpf_len integer;
  cnpj_len integer;
  logradouro_res text;
  nome_emerg text;
BEGIN
  SELECT * INTO f FROM public.rh_funcionarios WHERE id = p_funcionario_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF f.status NOT IN ('ativo', 'indisponivel') THEN
    RETURN true;
  END IF;

  IF nullif(trim(coalesce(f.nome, '')), '') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.rg, '')), '') IS NULL THEN RETURN false; END IF;

  cpf_len := public._rh_digits_len(f.cpf);
  IF cpf_len <> 11 THEN RETURN false; END IF;

  IF f.data_nascimento IS NULL THEN RETURN false; END IF;

  tel_len := public._rh_digits_len(f.telefone);
  IF tel_len < 10 OR tel_len > 11 THEN RETURN false; END IF;

  IF nullif(trim(coalesce(f.email, '')), '') IS NULL THEN RETURN false; END IF;
  IF position('@' in trim(f.email)) <= 1 THEN RETURN false; END IF;

  cep_res_len := public._rh_digits_len(f.res_cep);
  IF cep_res_len <> 8 THEN RETURN false; END IF;

  logradouro_res := coalesce(
    nullif(trim(coalesce(f.res_logradouro, '')), ''),
    nullif(trim(coalesce(f.endereco_residencial, '')), '')
  );
  IF logradouro_res IS NULL THEN RETURN false; END IF;

  IF nullif(trim(coalesce(f.res_numero, '')), '') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.res_complemento, '')), '') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.res_cidade, '')), '') IS NULL THEN RETURN false; END IF;
  IF length(trim(coalesce(f.res_estado, ''))) <> 2 THEN RETURN false; END IF;

  nome_emerg := coalesce(
    nullif(trim(coalesce(f.emerg_nome, '')), ''),
    nullif(trim(coalesce(f.contato_emergencia, '')), '')
  );
  IF nome_emerg IS NULL THEN RETURN false; END IF;

  IF nullif(trim(coalesce(f.emerg_parentesco, '')), '') IS NULL THEN RETURN false; END IF;

  tel_emerg_len := public._rh_digits_len(f.emerg_telefone);
  IF tel_emerg_len < 10 OR tel_emerg_len > 11 THEN RETURN false; END IF;

  IF trim(coalesce(f.tipo_contrato, '')) = 'PJ' THEN
    IF nullif(trim(coalesce(f.nome_empresa, '')), '') IS NULL THEN RETURN false; END IF;
    cnpj_len := public._rh_digits_len(f.cnpj);
    IF cnpj_len <> 14 THEN RETURN false; END IF;
    cep_emp_len := public._rh_digits_len(f.emp_cep);
    IF cep_emp_len <> 8 THEN RETURN false; END IF;
    IF nullif(trim(coalesce(f.emp_logradouro, '')), '') IS NULL
       AND nullif(trim(coalesce(f.endereco_empresa, '')), '') IS NULL THEN
      RETURN false;
    END IF;
    IF nullif(trim(coalesce(f.emp_numero, '')), '') IS NULL THEN RETURN false; END IF;
    IF nullif(trim(coalesce(f.emp_complemento, '')), '') IS NULL THEN RETURN false; END IF;
    IF nullif(trim(coalesce(f.emp_cidade, '')), '') IS NULL THEN RETURN false; END IF;
    IF length(trim(coalesce(f.emp_estado, ''))) <> 2 THEN RETURN false; END IF;
  END IF;

  IF nullif(trim(coalesce(f.banco, '')), '') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.banco, '')), '—') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.agencia, '')), '') IS NULL THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.conta_corrente, '')), '') IS NULL THEN RETURN false; END IF;
  IF trim(coalesce(f.conta_corrente, '')) = '0' THEN RETURN false; END IF;
  IF nullif(trim(coalesce(f.pix, '')), '') IS NULL THEN RETURN false; END IF;

  FOREACH cat IN ARRAY public._rh_cadastro_doc_categorias_obrigatorias(f.tipo_contrato) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.rh_funcionario_self_media m
      WHERE m.rh_funcionario_id = p_funcionario_id
        AND m.kind = 'documento'
        AND coalesce(nullif(trim(m.document_category), ''), 'outros') = cat
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  IF (
    SELECT count(*)::integer
    FROM public.rh_funcionario_formacao ff
    WHERE ff.rh_funcionario_id = p_funcionario_id
  ) < 1 THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(*)::integer
    FROM public.rh_funcionario_idioma fi
    WHERE fi.rh_funcionario_id = p_funcionario_id
  ) < 1 THEN
    RETURN false;
  END IF;

  IF trim(coalesce(f.tipo_contrato, '')) NOT IN ('Estagio', 'Temporario') THEN
    IF (
      SELECT count(*)::integer
      FROM public.rh_funcionario_experiencia ex
      WHERE ex.rh_funcionario_id = p_funcionario_id
    ) < 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.rh_cadastro_revisao_esta_completo(uuid) IS
  'True quando o cadastro atende todos os requisitos da revisão periódica (Dados de Cadastro).';

REVOKE ALL ON FUNCTION public.rh_cadastro_revisao_esta_completo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_cadastro_revisao_esta_completo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_registrar_revisao_cadastral_sem_alteracao(p_funcionario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.rh_funcionarios%ROWTYPE;
  usuario_lbl text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public._rh_dados_cadastro_perm('edit') THEN
    RAISE EXCEPTION 'Sem permissão para atualizar cadastro';
  END IF;

  SELECT * INTO f FROM public.rh_funcionarios WHERE id = p_funcionario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cadastro não encontrado';
  END IF;

  IF f.status = 'encerrado' THEN
    RAISE EXCEPTION 'Prestação encerrada';
  END IF;

  IF NOT public._rh_funcionario_eh_self_cadastro(f.email, f.email_spin) THEN
    RAISE EXCEPTION 'Só o próprio prestador pode registrar esta confirmação';
  END IF;

  IF NOT public.rh_cadastro_revisao_esta_completo(p_funcionario_id) THEN
    RAISE EXCEPTION 'Complete todas as informações obrigatórias do cadastro antes de registrar a revisão.';
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), nullif(trim(p.email), ''), 'Usuário')
  INTO usuario_lbl
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  UPDATE public.rh_funcionarios
  SET
    cadastro_revisado_em = now(),
    cadastro_revisao_tipo = 'sem_alteracao'
  WHERE id = p_funcionario_id;

  INSERT INTO public.rh_funcionario_historico (rh_funcionario_id, tipo, detalhes, created_by)
  VALUES (
    p_funcionario_id,
    'atualizacao_cadastral_sem_alteracao',
    jsonb_build_object(
      'usuario_label', coalesce(usuario_lbl, 'Usuário'),
      'declaracao', true,
      'revisao_periodica', true
    ),
    auth.uid()
  );
END;
$$;

-- Reabrir revisões registradas sem cadastro completo (ativo / indisponível).
UPDATE public.rh_funcionarios f
SET
  cadastro_revisado_em = NULL,
  cadastro_revisao_tipo = NULL
WHERE f.cadastro_revisado_em IS NOT NULL
  AND f.status IN ('ativo', 'indisponivel')
  AND NOT public.rh_cadastro_revisao_esta_completo(f.id);

COMMIT;
