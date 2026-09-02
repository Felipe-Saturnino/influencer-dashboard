-- Gestão de Prestadores: INSERT em rh_prestador_salvar falhava com code genérico «erro».
-- Causa: INSERT VALUES (v_new.*) envia staff_skills = NULL (campo removido do patch);
-- coluna é NOT NULL DEFAULT '{}' — DEFAULT não aplica quando o valor vem explícito como NULL.
-- Correção: coalesce de defaults + INSERT com colunas explícitas + códigos de erro tipados.

BEGIN;

CREATE OR REPLACE FUNCTION public.rh_prestador_salvar(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_patch jsonb,
  p_historico jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb;
  v_old public.rh_funcionarios%ROWTYPE;
  v_new public.rh_funcionarios%ROWTYPE;
  v_id uuid;
  v_out jsonb;
  v_tipo text;
  v_sqlstate text;
  v_sqlerrm text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
  END IF;

  v_patch := public._rh_prestador_patch_sanitizado(p_patch);

  IF p_id IS NULL THEN
    IF NOT public._rh_funcionario_perm('create') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
    END IF;

    v_new := jsonb_populate_record(NULL::public.rh_funcionarios, v_patch);
    v_new.id := gen_random_uuid();
    v_new.created_at := now();
    v_new.created_by := auth.uid();
    v_new.updated_by := auth.uid();
    v_new.updated_at := now();

    -- Defaults NOT NULL: jsonb_populate_record deixa NULL e INSERT com valor explícito
    -- não dispara DEFAULT da coluna (staff_skills era o caso típico do «Não foi possível salvar»).
    v_new.status := coalesce(nullif(btrim(v_new.status), ''), 'ativo');
    v_new.area_atuacao := coalesce(nullif(btrim(v_new.area_atuacao), ''), 'escritorio');
    v_new.staff_skills := coalesce(v_new.staff_skills, '{}'::jsonb);
    v_new.res_cep := coalesce(v_new.res_cep, '');
    v_new.res_logradouro := coalesce(v_new.res_logradouro, '');
    v_new.res_numero := coalesce(v_new.res_numero, '');
    v_new.res_complemento := coalesce(v_new.res_complemento, '');
    v_new.res_cidade := coalesce(v_new.res_cidade, '');
    v_new.res_estado := coalesce(v_new.res_estado, '');
    v_new.emerg_nome := coalesce(v_new.emerg_nome, '');
    v_new.emerg_parentesco := coalesce(v_new.emerg_parentesco, '');
    v_new.emerg_telefone := coalesce(v_new.emerg_telefone, '');
    v_new.emp_cep := coalesce(v_new.emp_cep, '');
    v_new.emp_logradouro := coalesce(v_new.emp_logradouro, '');
    v_new.emp_numero := coalesce(v_new.emp_numero, '');
    v_new.emp_complemento := coalesce(v_new.emp_complemento, '');
    v_new.emp_cidade := coalesce(v_new.emp_cidade, '');
    v_new.emp_estado := coalesce(v_new.emp_estado, '');

    INSERT INTO public.rh_funcionarios (
      id,
      status,
      nome,
      rg,
      cpf,
      telefone,
      email,
      email_spin,
      data_nascimento,
      endereco_residencial,
      res_cep,
      res_logradouro,
      res_numero,
      res_complemento,
      res_cidade,
      res_estado,
      contato_emergencia,
      emerg_nome,
      emerg_parentesco,
      emerg_telefone,
      setor,
      org_diretoria_id,
      org_gerencia_id,
      org_time_id,
      cargo,
      nivel,
      area_atuacao,
      remuneracao_hora_centavos,
      salario,
      data_inicio,
      data_funcao,
      origem_contratacao,
      quem_indicou,
      data_desligamento,
      observacao_rh,
      escala,
      tipo_contrato,
      nome_empresa,
      cnpj,
      endereco_empresa,
      emp_cep,
      emp_logradouro,
      emp_numero,
      emp_complemento,
      emp_cidade,
      emp_estado,
      banco,
      agencia,
      conta_corrente,
      pix,
      staff_turno,
      staff_skills,
      created_at,
      updated_at,
      created_by,
      updated_by
    ) VALUES (
      v_new.id,
      v_new.status,
      v_new.nome,
      v_new.rg,
      v_new.cpf,
      v_new.telefone,
      v_new.email,
      v_new.email_spin,
      v_new.data_nascimento,
      v_new.endereco_residencial,
      v_new.res_cep,
      v_new.res_logradouro,
      v_new.res_numero,
      v_new.res_complemento,
      v_new.res_cidade,
      v_new.res_estado,
      v_new.contato_emergencia,
      v_new.emerg_nome,
      v_new.emerg_parentesco,
      v_new.emerg_telefone,
      v_new.setor,
      v_new.org_diretoria_id,
      v_new.org_gerencia_id,
      v_new.org_time_id,
      v_new.cargo,
      v_new.nivel,
      v_new.area_atuacao,
      v_new.remuneracao_hora_centavos,
      v_new.salario,
      v_new.data_inicio,
      v_new.data_funcao,
      v_new.origem_contratacao,
      v_new.quem_indicou,
      v_new.data_desligamento,
      v_new.observacao_rh,
      v_new.escala,
      v_new.tipo_contrato,
      v_new.nome_empresa,
      v_new.cnpj,
      v_new.endereco_empresa,
      v_new.emp_cep,
      v_new.emp_logradouro,
      v_new.emp_numero,
      v_new.emp_complemento,
      v_new.emp_cidade,
      v_new.emp_estado,
      v_new.banco,
      v_new.agencia,
      v_new.conta_corrente,
      v_new.pix,
      v_new.staff_turno,
      v_new.staff_skills,
      v_new.created_at,
      v_new.updated_at,
      v_new.created_by,
      v_new.updated_by
    );
    v_id := v_new.id;
  ELSE
    IF NOT public._rh_funcionario_perm('edit') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
    END IF;

    SELECT * INTO v_old
    FROM public.rh_funcionarios
    WHERE id = p_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'nao_encontrado');
    END IF;

    IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RETURN jsonb_build_object('ok', false, 'code', 'conflito');
    END IF;

    v_new := jsonb_populate_record(v_old, v_patch);
    v_new.id := v_old.id;
    v_new.created_at := v_old.created_at;
    v_new.created_by := v_old.created_by;
    v_new.updated_at := now();
    v_new.updated_by := auth.uid();
    v_new.staff_nickname := v_old.staff_nickname;
    v_new.staff_estudio_slug := v_old.staff_estudio_slug;
    v_new.staff_estudio_slugs := v_old.staff_estudio_slugs;
    v_new.staff_operadora_slug := v_old.staff_operadora_slug;
    v_new.staff_barcode := v_old.staff_barcode;
    v_new.staff_id_operacional := v_old.staff_id_operacional;
    v_new.staff_id_tos := v_old.staff_id_tos;
    v_new.staff_horario_turno := v_old.staff_horario_turno;
    v_new.staff_skills := v_old.staff_skills;
    v_new.staff_live_no_estudio := v_old.staff_live_no_estudio;
    v_new.staff_fim_treinamento := v_old.staff_fim_treinamento;
    v_new.staff_dealer_genero := v_old.staff_dealer_genero;
    v_new.staff_dealer_bio := v_old.staff_dealer_bio;
    v_new.staff_dealer_fotos := v_old.staff_dealer_fotos;
    v_new.cadastro_revisado_em := v_old.cadastro_revisado_em;
    v_new.cadastro_revisao_tipo := v_old.cadastro_revisao_tipo;

    UPDATE public.rh_funcionarios f
    SET
      status = v_new.status,
      nome = v_new.nome,
      rg = v_new.rg,
      cpf = v_new.cpf,
      telefone = v_new.telefone,
      email = v_new.email,
      email_spin = v_new.email_spin,
      data_nascimento = v_new.data_nascimento,
      endereco_residencial = v_new.endereco_residencial,
      res_cep = v_new.res_cep,
      res_logradouro = v_new.res_logradouro,
      res_numero = v_new.res_numero,
      res_complemento = v_new.res_complemento,
      res_cidade = v_new.res_cidade,
      res_estado = v_new.res_estado,
      contato_emergencia = v_new.contato_emergencia,
      emerg_nome = v_new.emerg_nome,
      emerg_parentesco = v_new.emerg_parentesco,
      emerg_telefone = v_new.emerg_telefone,
      setor = v_new.setor,
      org_diretoria_id = v_new.org_diretoria_id,
      org_gerencia_id = v_new.org_gerencia_id,
      org_time_id = v_new.org_time_id,
      cargo = v_new.cargo,
      nivel = v_new.nivel,
      area_atuacao = v_new.area_atuacao,
      remuneracao_hora_centavos = v_new.remuneracao_hora_centavos,
      salario = v_new.salario,
      data_inicio = v_new.data_inicio,
      data_funcao = v_new.data_funcao,
      origem_contratacao = v_new.origem_contratacao,
      quem_indicou = v_new.quem_indicou,
      data_desligamento = v_new.data_desligamento,
      observacao_rh = v_new.observacao_rh,
      escala = v_new.escala,
      tipo_contrato = v_new.tipo_contrato,
      nome_empresa = v_new.nome_empresa,
      cnpj = v_new.cnpj,
      endereco_empresa = v_new.endereco_empresa,
      emp_cep = v_new.emp_cep,
      emp_logradouro = v_new.emp_logradouro,
      emp_numero = v_new.emp_numero,
      emp_complemento = v_new.emp_complemento,
      emp_cidade = v_new.emp_cidade,
      emp_estado = v_new.emp_estado,
      banco = v_new.banco,
      agencia = v_new.agencia,
      conta_corrente = v_new.conta_corrente,
      pix = v_new.pix,
      staff_turno = v_new.staff_turno,
      updated_at = v_new.updated_at,
      updated_by = v_new.updated_by
    WHERE f.id = p_id;

    v_id := p_id;
  END IF;

  IF p_historico IS NOT NULL AND coalesce(p_historico->>'tipo', '') <> '' THEN
    v_tipo := p_historico->>'tipo';
    INSERT INTO public.rh_funcionario_historico (
      rh_funcionario_id,
      tipo,
      detalhes,
      anexos
    ) VALUES (
      v_id,
      v_tipo,
      coalesce(p_historico->'detalhes', '{}'::jsonb),
      coalesce(p_historico->'anexos', '[]'::jsonb)
    );
  END IF;

  SELECT to_jsonb(f) INTO v_out
  FROM public.rh_funcionarios f
  WHERE f.id = v_id;

  RETURN jsonb_build_object('ok', true, 'row', v_out);
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM ILIKE '%cpf%' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'cpf_duplicado');
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'duplicado');
  WHEN check_violation THEN
    IF SQLERRM ILIKE '%cpf%' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'cpf_invalido');
    END IF;
    IF SQLERRM ILIKE '%cnpj%' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'cnpj_invalido');
    END IF;
    IF SQLERRM ILIKE '%org%' OR SQLERRM ILIKE '%origem_contratacao%' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'dado_invalido');
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'dado_invalido');
  WHEN not_null_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'campo_obrigatorio');
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'organograma_invalido');
  WHEN others THEN
    GET STACKED DIAGNOSTICS
      v_sqlstate = RETURNED_SQLSTATE,
      v_sqlerrm = MESSAGE_TEXT;
    RAISE WARNING 'rh_prestador_salvar falhou: state=% msg=%', v_sqlstate, v_sqlerrm;
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
END;
$$;

COMMENT ON FUNCTION public.rh_prestador_salvar(uuid, timestamptz, jsonb, jsonb) IS
  'Gestão de Prestadores: INSERT/UPDATE atómico com defaults de staff_skills, lock de updated_at e histórico opcional.';

COMMIT;
