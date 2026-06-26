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
  validarRgInput,
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

/** Chaves de campos da aba Dados cadastrais (exceto opcionais: nickname, complementos). */
export type RhCadastroCampoKey =
  | "nome"
  | "rg"
  | "cpf"
  | "data_nascimento"
  | "telefone"
  | "email"
  | "res_cep"
  | "res_logradouro"
  | "res_numero"
  | "res_cidade"
  | "res_estado"
  | "emerg_nome"
  | "emerg_parentesco"
  | "emerg_telefone"
  | "nome_empresa"
  | "cnpj"
  | "emp_cep"
  | "emp_logradouro"
  | "emp_numero"
  | "emp_cidade"
  | "emp_estado"
  | "banco"
  | "agencia"
  | "conta_corrente"
  | "pix";

const CAMPOS_CADASTRO_BASE: RhCadastroCampoKey[] = [
  "nome",
  "rg",
  "cpf",
  "data_nascimento",
  "telefone",
  "email",
  "res_cep",
  "res_logradouro",
  "res_numero",
  "res_cidade",
  "res_estado",
  "emerg_nome",
  "emerg_parentesco",
  "emerg_telefone",
  "banco",
  "agencia",
  "conta_corrente",
  "pix",
];

const CAMPOS_CADASTRO_PJ: RhCadastroCampoKey[] = [
  "nome_empresa",
  "cnpj",
  "emp_cep",
  "emp_logradouro",
  "emp_numero",
  "emp_cidade",
  "emp_estado",
];

function ufValida(uf: string): boolean {
  return ufsBrIncludes(uf.trim().toUpperCase());
}

function ufsBrIncludes(uf: string): uf is (typeof UFS_BR)[number] {
  return UFS_BR.includes(uf as (typeof UFS_BR)[number]);
}

function campoCadastralIncompleto(form: RhCadastroFormCompletudeInput, key: RhCadastroCampoKey): boolean {
  switch (key) {
    case "nome":
      return form.nome.trim().length === 0;
    case "rg":
      return form.rg.trim().length === 0 || !validarRgInput(form.rg);
    case "cpf": {
      const cpfD = somenteDigitos(form.cpf);
      return cpfD.length !== 11 || !validarCpfDigitos(cpfD);
    }
    case "data_nascimento":
      return form.data_nascimento.trim().length === 0 || !validarDataNascimentoOpcional(form.data_nascimento);
    case "telefone": {
      const telD = somenteDigitos(form.telefone);
      return telD.length < 10 || telD.length > 11;
    }
    case "email":
      return form.email.trim().length === 0 || !validarEmail(form.email);
    case "res_cep":
      return somenteDigitos(form.res_cep).length !== 8;
    case "res_logradouro":
      return form.res_logradouro.trim().length === 0;
    case "res_numero":
      return form.res_numero.trim().length === 0;
    case "res_cidade":
      return form.res_cidade.trim().length === 0;
    case "res_estado":
      return form.res_estado.trim().length === 0 || !ufValida(form.res_estado);
    case "emerg_nome":
      return form.emerg_nome.trim().length === 0;
    case "emerg_parentesco":
      return form.emerg_parentesco.trim().length === 0;
    case "emerg_telefone": {
      const telEmerg = somenteDigitos(form.emerg_telefone);
      return telEmerg.length < 10 || telEmerg.length > 11;
    }
    case "nome_empresa":
      return form.nome_empresa.trim().length === 0;
    case "cnpj": {
      const cnpjD = somenteDigitos(form.cnpj);
      return cnpjD.length !== 14 || !validarCnpjDigitos(cnpjD);
    }
    case "emp_cep":
      return somenteDigitos(form.emp_cep).length !== 8;
    case "emp_logradouro":
      return form.emp_logradouro.trim().length === 0;
    case "emp_numero":
      return form.emp_numero.trim().length === 0;
    case "emp_cidade":
      return form.emp_cidade.trim().length === 0;
    case "emp_estado":
      return form.emp_estado.trim().length === 0 || !ufValida(form.emp_estado);
    case "banco":
      return form.banco.trim().length === 0;
    case "agencia":
      return form.agencia.trim().length === 0;
    case "conta_corrente":
      return form.conta_corrente.trim().length === 0;
    case "pix":
      return form.pix.trim().length === 0;
    default:
      return false;
  }
}

/** Campos obrigatórios da aba Dados cadastrais ainda vazios ou inválidos (UI — rótulo em vermelho). */
export function camposCadastraisIncompletos(form: RhCadastroFormCompletudeInput): Set<RhCadastroCampoKey> {
  const keys =
    form.tipo_contrato === "PJ" ? [...CAMPOS_CADASTRO_BASE, ...CAMPOS_CADASTRO_PJ] : CAMPOS_CADASTRO_BASE;
  return new Set(keys.filter((k) => campoCadastralIncompleto(form, k)));
}

function reqCampo(pendencias: string[], condicao: boolean, mensagem: string) {
  if (!condicao) pendencias.push(mensagem);
}

/** Dados cadastrais — todos os campos editáveis da aba devem estar preenchidos e válidos. */
export function pendenciasDadosCadastraisCompletos(form: RhCadastroFormCompletudeInput): string[] {
  const p: string[] = [];
  reqCampo(p, !campoCadastralIncompleto(form, "nome"), "Dados cadastrais: nome completo.");
  reqCampo(p, !campoCadastralIncompleto(form, "rg"), "Dados cadastrais: RG.");
  reqCampo(p, !campoCadastralIncompleto(form, "cpf"), "Dados cadastrais: CPF válido.");
  reqCampo(p, !campoCadastralIncompleto(form, "data_nascimento"), "Dados cadastrais: data de nascimento.");
  reqCampo(p, !campoCadastralIncompleto(form, "telefone"), "Dados cadastrais: telefone.");
  reqCampo(p, !campoCadastralIncompleto(form, "email"), "Dados cadastrais: e-mail.");
  reqCampo(p, !campoCadastralIncompleto(form, "res_cep"), "Dados cadastrais: CEP residencial.");
  reqCampo(p, !campoCadastralIncompleto(form, "res_logradouro"), "Dados cadastrais: logradouro residencial.");
  reqCampo(p, !campoCadastralIncompleto(form, "res_numero"), "Dados cadastrais: número residencial.");
  reqCampo(p, !campoCadastralIncompleto(form, "res_cidade"), "Dados cadastrais: cidade residencial.");
  reqCampo(p, !campoCadastralIncompleto(form, "res_estado"), "Dados cadastrais: UF residencial.");
  reqCampo(p, !campoCadastralIncompleto(form, "emerg_nome"), "Dados cadastrais: nome do contato de emergência.");
  reqCampo(p, !campoCadastralIncompleto(form, "emerg_parentesco"), "Dados cadastrais: parentesco do contato de emergência.");
  reqCampo(p, !campoCadastralIncompleto(form, "emerg_telefone"), "Dados cadastrais: telefone de emergência.");
  if (form.tipo_contrato === "PJ") {
    reqCampo(p, !campoCadastralIncompleto(form, "nome_empresa"), "Dados cadastrais: nome da empresa (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "cnpj"), "Dados cadastrais: CNPJ válido (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "emp_cep"), "Dados cadastrais: CEP da empresa (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "emp_logradouro"), "Dados cadastrais: logradouro da empresa (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "emp_numero"), "Dados cadastrais: número da empresa (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "emp_cidade"), "Dados cadastrais: cidade da empresa (PJ).");
    reqCampo(p, !campoCadastralIncompleto(form, "emp_estado"), "Dados cadastrais: UF da empresa (PJ).");
  }
  reqCampo(p, !campoCadastralIncompleto(form, "banco"), "Dados cadastrais: banco.");
  reqCampo(p, !campoCadastralIncompleto(form, "agencia"), "Dados cadastrais: agência.");
  reqCampo(p, !campoCadastralIncompleto(form, "conta_corrente"), "Dados cadastrais: conta corrente.");
  reqCampo(p, !campoCadastralIncompleto(form, "pix"), "Dados cadastrais: PIX.");
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

/** Carrega dados externos e avalia completude (fonte única para concluir revisão cadastral). */
export async function verificarCompletudeCadastroRevisao(
  funcionarioId: string,
  form: RhCadastroFormCompletudeInput,
): Promise<RhCadastroCompletudeRevisao & { externo: RhCadastroCompletudeExterna | null; error: string | null }> {
  const { data, error } = await carregarCompletudeExternaCadastro(funcionarioId);
  if (error || !data) {
    return { ok: false, pendencias: [], externo: null, error: error ?? "Erro ao verificar completude." };
  }
  const avaliacao = avaliarCompletudeCadastroRevisao(form, data);
  return { ...avaliacao, externo: data, error: null };
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
