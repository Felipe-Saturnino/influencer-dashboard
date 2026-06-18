import { supabase } from "./supabase";
import type { RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../types/rhFuncionario";
import {
  RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL,
  agruparDocumentosPorCategoria,
  categoriasDocumentoObrigatorias,
  categoriasDocumentoPorTipoContrato,
} from "./rhPrestadorDocumentosCadastro";
import { listarDocumentosPrestador } from "./rhPrestadorSelfMediaDocs";
import {
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarDataNascimentoOpcional,
  validarEmail,
} from "./rhFuncionarioValidators";

const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

export type RhCadastroFormCompletudeInput = {
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  res_cep: string;
  res_logradouro: string;
  res_numero: string;
  res_complemento: string;
  res_cidade: string;
  res_estado: string;
  emerg_nome: string;
  emerg_parentesco: string;
  emerg_telefone: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  nome_empresa: string;
  cnpj: string;
  emp_cep: string;
  emp_logradouro: string;
  emp_numero: string;
  emp_complemento: string;
  emp_cidade: string;
  emp_estado: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  pix: string;
};

export type RhCadastroCompletudeExterna = {
  qtdFormacaoAcademica: number;
  qtdIdioma: number;
  qtdExperiencia: number;
  documentos: RhFuncionarioSelfMedia[];
};

export type RhCadastroCompletudeRevisao = {
  ok: boolean;
  pendencias: string[];
};

function reqCampo(pendencias: string[], condicao: boolean, mensagem: string) {
  if (!condicao) pendencias.push(mensagem);
}

/** Dados cadastrais — todos os campos editáveis da aba devem estar preenchidos e válidos. */
export function pendenciasDadosCadastraisCompletos(form: RhCadastroFormCompletudeInput): string[] {
  const p: string[] = [];
  reqCampo(p, form.nome.trim().length > 0, "Dados cadastrais: nome completo.");
  reqCampo(p, form.rg.trim().length > 0, "Dados cadastrais: RG.");
  const cpfD = somenteDigitos(form.cpf);
  reqCampo(p, cpfD.length === 11 && validarCpfDigitos(cpfD), "Dados cadastrais: CPF válido.");
  reqCampo(p, form.data_nascimento.trim().length > 0 && validarDataNascimentoOpcional(form.data_nascimento), "Dados cadastrais: data de nascimento.");
  const telD = somenteDigitos(form.telefone);
  reqCampo(p, telD.length >= 10 && telD.length <= 11, "Dados cadastrais: telefone.");
  reqCampo(p, form.email.trim().length > 0 && validarEmail(form.email), "Dados cadastrais: e-mail.");
  const cepRes = somenteDigitos(form.res_cep);
  reqCampo(p, cepRes.length === 8, "Dados cadastrais: CEP residencial.");
  reqCampo(p, form.res_logradouro.trim().length > 0, "Dados cadastrais: logradouro residencial.");
  reqCampo(p, form.res_numero.trim().length > 0, "Dados cadastrais: número residencial.");
  reqCampo(p, form.res_complemento.trim().length > 0, "Dados cadastrais: complemento residencial.");
  reqCampo(p, form.res_cidade.trim().length > 0, "Dados cadastrais: cidade residencial.");
  reqCampo(
    p,
    form.res_estado.trim().length > 0 && UFS_BR.includes(form.res_estado.trim().toUpperCase() as (typeof UFS_BR)[number]),
    "Dados cadastrais: UF residencial.",
  );
  reqCampo(p, form.emerg_nome.trim().length > 0, "Dados cadastrais: nome do contato de emergência.");
  reqCampo(p, form.emerg_parentesco.trim().length > 0, "Dados cadastrais: parentesco do contato de emergência.");
  const telEmerg = somenteDigitos(form.emerg_telefone);
  reqCampo(p, telEmerg.length >= 10 && telEmerg.length <= 11, "Dados cadastrais: telefone de emergência.");
  if (form.tipo_contrato === "PJ") {
    reqCampo(p, form.nome_empresa.trim().length > 0, "Dados cadastrais: nome da empresa (PJ).");
    const cnpjD = somenteDigitos(form.cnpj);
    reqCampo(p, cnpjD.length === 14 && validarCnpjDigitos(cnpjD), "Dados cadastrais: CNPJ válido (PJ).");
    const cepEmp = somenteDigitos(form.emp_cep);
    reqCampo(p, cepEmp.length === 8, "Dados cadastrais: CEP da empresa (PJ).");
    reqCampo(p, form.emp_logradouro.trim().length > 0, "Dados cadastrais: logradouro da empresa (PJ).");
    reqCampo(p, form.emp_numero.trim().length > 0, "Dados cadastrais: número da empresa (PJ).");
    reqCampo(p, form.emp_complemento.trim().length > 0, "Dados cadastrais: complemento da empresa (PJ).");
    reqCampo(p, form.emp_cidade.trim().length > 0, "Dados cadastrais: cidade da empresa (PJ).");
    reqCampo(
      p,
      form.emp_estado.trim().length > 0 && UFS_BR.includes(form.emp_estado.trim().toUpperCase() as (typeof UFS_BR)[number]),
      "Dados cadastrais: UF da empresa (PJ).",
    );
  }
  reqCampo(p, form.banco.trim().length > 0, "Dados cadastrais: banco.");
  reqCampo(p, form.agencia.trim().length > 0, "Dados cadastrais: agência.");
  reqCampo(p, form.conta_corrente.trim().length > 0, "Dados cadastrais: conta corrente.");
  reqCampo(p, form.pix.trim().length > 0, "Dados cadastrais: PIX.");
  return p;
}

export function pendenciasDocumentosCompletos(
  tipoContrato: RhFuncionarioTipoContrato,
  documentos: RhFuncionarioSelfMedia[],
): string[] {
  const obrigatorias = categoriasDocumentoObrigatorias(tipoContrato);
  const porCat = agruparDocumentosPorCategoria(documentos, categoriasDocumentoPorTipoContrato(tipoContrato));
  const p: string[] = [];
  for (const cat of obrigatorias) {
    if ((porCat[cat] ?? []).length === 0) {
      p.push(`Documentos: ${RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}.`);
    }
  }
  return p;
}

export function pendenciasFormacaoCompletos(qtdFormacao: number, qtdIdioma: number): string[] {
  const p: string[] = [];
  if (qtdFormacao < 1) p.push("Formação e Competências: ao menos 1 formação acadêmica.");
  if (qtdIdioma < 1) p.push("Formação e Competências: ao menos 1 idioma.");
  return p;
}

export function experienciaProfissionalObrigatoria(tipoContrato: RhFuncionarioTipoContrato): boolean {
  return tipoContrato !== "Estagio" && tipoContrato !== "Temporario";
}

export function pendenciasExperienciaCompletos(
  tipoContrato: RhFuncionarioTipoContrato,
  qtdExperiencia: number,
): string[] {
  if (!experienciaProfissionalObrigatoria(tipoContrato)) return [];
  if (qtdExperiencia >= 1) return [];
  return ["Experiência Profissional: ao menos 1 experiência."];
}

export function avaliarCompletudeCadastroRevisao(
  form: RhCadastroFormCompletudeInput,
  externo: RhCadastroCompletudeExterna,
): RhCadastroCompletudeRevisao {
  const pendencias = [
    ...pendenciasDadosCadastraisCompletos(form),
    ...pendenciasDocumentosCompletos(form.tipo_contrato, externo.documentos),
    ...pendenciasFormacaoCompletos(externo.qtdFormacaoAcademica, externo.qtdIdioma),
    ...pendenciasExperienciaCompletos(form.tipo_contrato, externo.qtdExperiencia),
  ];
  return { ok: pendencias.length === 0, pendencias };
}

export async function carregarCompletudeExternaCadastro(
  funcionarioId: string,
): Promise<{ data: RhCadastroCompletudeExterna | null; error: string | null }> {
  const [docRes, formRes, idiRes, expRes] = await Promise.all([
    listarDocumentosPrestador(funcionarioId),
    supabase
      .from("rh_funcionario_formacao")
      .select("id", { count: "exact", head: true })
      .eq("rh_funcionario_id", funcionarioId),
    supabase
      .from("rh_funcionario_idioma")
      .select("id", { count: "exact", head: true })
      .eq("rh_funcionario_id", funcionarioId),
    supabase
      .from("rh_funcionario_experiencia")
      .select("id", { count: "exact", head: true })
      .eq("rh_funcionario_id", funcionarioId),
  ]);

  if (docRes.error || formRes.error || idiRes.error || expRes.error) {
    return {
      data: null,
      error: "Não foi possível verificar a completude do cadastro. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  return {
    data: {
      documentos: docRes.rows,
      qtdFormacaoAcademica: formRes.count ?? 0,
      qtdIdioma: idiRes.count ?? 0,
      qtdExperiencia: expRes.count ?? 0,
    },
    error: null,
  };
}
