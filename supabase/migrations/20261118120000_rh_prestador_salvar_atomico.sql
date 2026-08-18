-- Gestão de Prestadores: save atómico (cadastro + ações RH + RH Talks) com lock de updated_at.

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_prestador_patch_sanitizado(p_patch jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_patch, '{}'::jsonb)
    - ARRAY[
      'id', 'created_at', 'created_by', 'updated_at', 'updated_by',
      'staff_nickname', 'staff_estudio_slug', 'staff_estudio_slugs', 'staff_operadora_slug',
      'staff_barcode', 'staff_id_operacional', 'staff_id_tos', 'staff_horario_turno',
      'staff_skills', 'staff_live_no_estudio', 'staff_fim_treinamento',
      'staff_dealer_genero', 'staff_dealer_bio', 'staff_dealer_fotos',
      'cadastro_revisado_em', 'cadastro_revisao_tipo'
    ];
$$;

REVOKE ALL ON FUNCTION public._rh_prestador_patch_sanitizado(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._rh_prestador_patch_sanitizado(jsonb) TO authenticated;

-- p_id NULL = insert; p_historico opcional { tipo, detalhes, anexos }
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

    INSERT INTO public.rh_funcionarios VALUES (v_new.*);
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
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
  WHEN check_violation THEN
    IF SQLERRM ILIKE '%cpf%' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'cpf_invalido');
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_prestador_salvar(uuid, timestamptz, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_prestador_salvar(uuid, timestamptz, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.rh_prestador_salvar(uuid, timestamptz, jsonb, jsonb) IS
  'Gestão de Prestadores: INSERT/UPDATE atómico com lock de updated_at e histórico opcional na mesma transação.';

CREATE OR REPLACE FUNCTION public.rh_prestador_talks_salvar(
  p_funcionario_ids uuid[],
  p_detalhes jsonb,
  p_anexos jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public._rh_funcionario_perm('edit') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sem_permissao');
  END IF;

  IF p_funcionario_ids IS NULL OR cardinality(p_funcionario_ids) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
  END IF;

  FOREACH v_id IN ARRAY p_funcionario_ids LOOP
    INSERT INTO public.rh_funcionario_historico (
      rh_funcionario_id,
      tipo,
      detalhes,
      anexos
    ) VALUES (
      v_id,
      'rh_talks',
      coalesce(p_detalhes, '{}'::jsonb),
      coalesce(p_anexos, '[]'::jsonb)
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'erro');
END;
$$;

REVOKE ALL ON FUNCTION public.rh_prestador_talks_salvar(uuid[], jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_prestador_talks_salvar(uuid[], jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.rh_prestador_talks_salvar(uuid[], jsonb, jsonb) IS
  'Gestão de Prestadores: registra RH Talks para todos os participantes na mesma transação.';

COMMIT;
