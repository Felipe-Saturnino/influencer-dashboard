import type { PermissaoValor } from "../types";
import type { Permissoes } from "../hooks/usePermission";
import type { RhFuncionario, RhFuncionarioHistorico, RhFuncionarioTipoContrato } from "../types/rhFuncionario";
import { montarContatoEmergenciaLinha, montarEnderecoResumoLine } from "./rhFuncionarioEndereco";
import { somenteDigitos } from "./rhFuncionarioValidators";

const CNPJ_CONTEXTO_NAO_PJ = "00000000000191";

export type RhDadosCadastroFormPayload = {
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

export function dadosCadastroVistaCompleta(canView: PermissaoValor): boolean {
  return canView === "sim";
}

export function ehProprioCadastroDados(meuPrestadorId: string | null, funcionarioId: string | null): boolean {
  return Boolean(meuPrestadorId && funcionarioId && meuPrestadorId === funcionarioId);
}

/** Vista «apenas próprio» (Ver ≠ Sim): o registro carregado é sempre o do login. */
export function dadosCadastroVisualizaProprioCadastro(
  vistaCompleta: boolean,
  meuPrestadorId: string | null,
  funcionarioId: string | null,
): boolean {
  if (!vistaCompleta) return Boolean(funcionarioId);
  return ehProprioCadastroDados(meuPrestadorId, funcionarioId);
}

export function podeEditarFuncionarioDadosCadastro(
  perm: Pick<Permissoes, "canEditar" | "canEditarOk">,
  meuPrestadorId: string | null,
  funcionarioId: string | null,
  opts?: { vistaApenasProprio?: boolean },
): boolean {
  if (!perm.canEditarOk || !funcionarioId) return false;
  if (perm.canEditar === "sim") return true;
  if (perm.canEditar === "proprios") {
    if (opts?.vistaApenasProprio) return true;
    return ehProprioCadastroDados(meuPrestadorId, funcionarioId);
  }
  return false;
}

/** Anotação «Particular» oculta na aba Histórico apenas para o próprio prestador. */
export function historicoVisivelAbaDadosCadastro(
  h: RhFuncionarioHistorico,
  visualizandoProprioCadastro: boolean,
): boolean {
  if (!visualizandoProprioCadastro) return true;
  if (h.tipo !== "anotacao_rh") return true;
  const d = h.detalhes;
  if (!d || typeof d !== "object" || Array.isArray(d)) return true;
  const tv = String((d as Record<string, unknown>).tipo_visibilidade ?? "").trim().toLowerCase();
  return tv !== "particular";
}

export function buildPayloadCadastralDadosCadastro(
  form: RhDadosCadastroFormPayload,
  statusPrestador: RhFuncionario["status"],
): Record<string, unknown> {
  const isPj = form.tipo_contrato === "PJ";
  const cnpjFinal = isPj ? somenteDigitos(form.cnpj) : CNPJ_CONTEXTO_NAO_PJ;
  const endResLinha = montarEnderecoResumoLine({
    cep: form.res_cep,
    logradouro: form.res_logradouro,
    numero: form.res_numero,
    complemento: form.res_complemento,
    cidade: form.res_cidade,
    estado: form.res_estado,
  });
  const endEmpLinha = montarEnderecoResumoLine({
    cep: form.emp_cep,
    logradouro: form.emp_logradouro,
    numero: form.emp_numero,
    complemento: form.emp_complemento,
    cidade: form.emp_cidade,
    estado: form.emp_estado,
  });
  const emergLinha = montarContatoEmergenciaLinha(
    form.emerg_nome.trim(),
    form.emerg_parentesco,
    somenteDigitos(form.emerg_telefone),
  );
  return {
    status: statusPrestador,
    nome: form.nome.trim(),
    rg: form.rg.trim(),
    cpf: somenteDigitos(form.cpf),
    telefone: somenteDigitos(form.telefone),
    email: form.email.trim().toLowerCase(),
    data_nascimento: form.data_nascimento.trim() ? form.data_nascimento.trim().slice(0, 10) : null,
    endereco_residencial: endResLinha,
    res_cep: somenteDigitos(form.res_cep),
    res_logradouro: form.res_logradouro.trim(),
    res_numero: form.res_numero.trim(),
    res_complemento: form.res_complemento.trim(),
    res_cidade: form.res_cidade.trim(),
    res_estado: form.res_estado.trim().toUpperCase().slice(0, 2),
    contato_emergencia: emergLinha,
    emerg_nome: form.emerg_nome.trim(),
    emerg_parentesco: form.emerg_parentesco.trim(),
    emerg_telefone: somenteDigitos(form.emerg_telefone),
    nome_empresa: isPj ? form.nome_empresa.trim() : form.nome_empresa.trim() || "—",
    cnpj: cnpjFinal,
    endereco_empresa: isPj ? endEmpLinha : "—",
    emp_cep: isPj ? somenteDigitos(form.emp_cep) : "",
    emp_logradouro: isPj ? form.emp_logradouro.trim() : "",
    emp_numero: isPj ? form.emp_numero.trim() : "",
    emp_complemento: isPj ? form.emp_complemento.trim() : "",
    emp_cidade: isPj ? form.emp_cidade.trim() : "",
    emp_estado: isPj ? form.emp_estado.trim().toUpperCase().slice(0, 2) : "",
    banco: form.banco.trim(),
    agencia: somenteDigitos(form.agencia),
    conta_corrente: form.conta_corrente.trim(),
    pix: form.pix.trim() || null,
  };
}
