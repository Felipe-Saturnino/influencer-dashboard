-- Histórico em rh_funcionario_historico para atualizações feitas pelo próprio prestador
-- na página «Dados de Cadastro» (quando o login coincide com o e-mail ou E-mail Spin do registo).

BEGIN;

CREATE OR REPLACE FUNCTION public._rh_hist_fmt_cell(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN val IS NULL OR btrim(val) = '' THEN '—'
    ELSE left(btrim(val), 400)
  END;
$$;

REVOKE ALL ON FUNCTION public._rh_hist_fmt_cell(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rh_funcionarios_log_historico_dados_cadastro_self()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alteracoes jsonb := '[]'::jsonb;
  usuario_lbl text;
  rec record;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Só o próprio colaborador (antes do UPDATE); quem edita outro registo não passa aqui
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email, '')))
        OR (
          trim(coalesce(OLD.email_spin, '')) <> ''
          AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email_spin, '')))
        )
      )
  ) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(trim(p.name), ''), nullif(trim(p.email), ''), 'Utilizador')
  INTO usuario_lbl
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF usuario_lbl IS NULL THEN
    usuario_lbl := 'Utilizador';
  END IF;

  -- Campos relevantes (exclui id, created_at, created_by, updated_at, updated_by)
  FOR rec IN
    SELECT * FROM (VALUES
      ('Status', OLD.status::text, NEW.status::text),
      ('Nome completo', OLD.nome::text, NEW.nome::text),
      ('RG', OLD.rg::text, NEW.rg::text),
      ('CPF', OLD.cpf::text, NEW.cpf::text),
      ('Telefone', OLD.telefone::text, NEW.telefone::text),
      ('E-mail', OLD.email::text, NEW.email::text),
      ('E-mail Spin', coalesce(OLD.email_spin::text, ''), coalesce(NEW.email_spin::text, '')),
      ('Endereço residencial (resumo)', OLD.endereco_residencial::text, NEW.endereco_residencial::text),
      ('CEP residencial', coalesce(OLD.res_cep::text, ''), coalesce(NEW.res_cep::text, '')),
      ('Logradouro (residencial)', coalesce(OLD.res_logradouro::text, ''), coalesce(NEW.res_logradouro::text, '')),
      ('Número (residencial)', coalesce(OLD.res_numero::text, ''), coalesce(NEW.res_numero::text, '')),
      ('Complemento (residencial)', coalesce(OLD.res_complemento::text, ''), coalesce(NEW.res_complemento::text, '')),
      ('Cidade (residencial)', coalesce(OLD.res_cidade::text, ''), coalesce(NEW.res_cidade::text, '')),
      ('UF (residencial)', coalesce(OLD.res_estado::text, ''), coalesce(NEW.res_estado::text, '')),
      ('Contato de emergência (resumo)', OLD.contato_emergencia::text, NEW.contato_emergencia::text),
      ('Nome emergência', coalesce(OLD.emerg_nome::text, ''), coalesce(NEW.emerg_nome::text, '')),
      ('Parentesco emergência', coalesce(OLD.emerg_parentesco::text, ''), coalesce(NEW.emerg_parentesco::text, '')),
      ('Telefone emergência', coalesce(OLD.emerg_telefone::text, ''), coalesce(NEW.emerg_telefone::text, '')),
      ('Setor', OLD.setor::text, NEW.setor::text),
      ('Diretoria (organograma)', coalesce(OLD.org_diretoria_id::text, ''), coalesce(NEW.org_diretoria_id::text, '')),
      ('Gerência (organograma)', coalesce(OLD.org_gerencia_id::text, ''), coalesce(NEW.org_gerencia_id::text, '')),
      ('Time (organograma)', coalesce(OLD.org_time_id::text, ''), coalesce(NEW.org_time_id::text, '')),
      ('Função', OLD.cargo::text, NEW.cargo::text),
      ('Nível', OLD.nivel::text, NEW.nivel::text),
      ('Remuneração', OLD.salario::text, NEW.salario::text),
      ('Data de início', coalesce(OLD.data_inicio::text, ''), coalesce(NEW.data_inicio::text, '')),
      ('Data da função', coalesce(OLD.data_funcao::text, ''), coalesce(NEW.data_funcao::text, '')),
      ('Data de desligamento', coalesce(OLD.data_desligamento::text, ''), coalesce(NEW.data_desligamento::text, '')),
      ('Escala', OLD.escala::text, NEW.escala::text),
      ('Tipo de contrato', OLD.tipo_contrato::text, NEW.tipo_contrato::text),
      ('Nome da empresa', OLD.nome_empresa::text, NEW.nome_empresa::text),
      ('CNPJ', OLD.cnpj::text, NEW.cnpj::text),
      ('Endereço empresa (resumo)', OLD.endereco_empresa::text, NEW.endereco_empresa::text),
      ('CEP empresa', coalesce(OLD.emp_cep::text, ''), coalesce(NEW.emp_cep::text, '')),
      ('Logradouro empresa', coalesce(OLD.emp_logradouro::text, ''), coalesce(NEW.emp_logradouro::text, '')),
      ('Número empresa', coalesce(OLD.emp_numero::text, ''), coalesce(NEW.emp_numero::text, '')),
      ('Complemento empresa', coalesce(OLD.emp_complemento::text, ''), coalesce(NEW.emp_complemento::text, '')),
      ('Cidade empresa', coalesce(OLD.emp_cidade::text, ''), coalesce(NEW.emp_cidade::text, '')),
      ('UF empresa', coalesce(OLD.emp_estado::text, ''), coalesce(NEW.emp_estado::text, '')),
      ('Banco', OLD.banco::text, NEW.banco::text),
      ('Agência', OLD.agencia::text, NEW.agencia::text),
      ('Conta corrente', OLD.conta_corrente::text, NEW.conta_corrente::text),
      ('PIX', coalesce(OLD.pix::text, ''), coalesce(NEW.pix::text, '')),
      ('Observação RH', coalesce(OLD.observacao_rh::text, ''), coalesce(NEW.observacao_rh::text, '')),
      ('Staff — apelido', coalesce(OLD.staff_nickname::text, ''), coalesce(NEW.staff_nickname::text, '')),
      ('Staff — operadora', coalesce(OLD.staff_operadora_slug::text, ''), coalesce(NEW.staff_operadora_slug::text, '')),
      ('Staff — código de barras', coalesce(OLD.staff_barcode::text, ''), coalesce(NEW.staff_barcode::text, '')),
      ('Staff — ID operacional', coalesce(OLD.staff_id_operacional::text, ''), coalesce(NEW.staff_id_operacional::text, '')),
      ('Staff — skills (JSON)', coalesce(OLD.staff_skills::text, ''), coalesce(NEW.staff_skills::text, ''))
    ) AS t(campo, antes, depois)
  LOOP
    IF rec.antes IS DISTINCT FROM rec.depois THEN
      alteracoes := alteracoes || jsonb_build_array(
        jsonb_build_object(
          'campo', rec.campo,
          'antes', public._rh_hist_fmt_cell(rec.antes),
          'depois', public._rh_hist_fmt_cell(rec.depois)
        )
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(alteracoes) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.rh_funcionario_historico (rh_funcionario_id, tipo, detalhes, created_by)
  VALUES (
    NEW.id,
    'dados_cadastro_self',
    jsonb_build_object(
      'usuario_label', usuario_lbl,
      'alteracoes', alteracoes
    ),
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_funcionarios_hist_dados_cadastro_self ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_funcionarios_hist_dados_cadastro_self
  AFTER UPDATE ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.rh_funcionarios_log_historico_dados_cadastro_self();

COMMENT ON FUNCTION public.rh_funcionarios_log_historico_dados_cadastro_self() IS
  'Regista em rh_funcionario_historico alterações ao cadastro quando o utilizador é o próprio colaborador (e-mail ou E-mail Spin), com ou sem permissão global rh_funcionarios.';

COMMIT;
