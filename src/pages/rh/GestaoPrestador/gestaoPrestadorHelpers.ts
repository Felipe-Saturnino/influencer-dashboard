import type { CSSProperties } from "react";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type {
  RhAreaAtuacao,
  RhFuncionario,
  RhFuncionarioTipoContrato,
  RhHistoricoAcaoTipo,
  RhOrigemContratacao,
} from "../../../types/rhFuncionario";
import type { RhOrgPrestadorVinculoOpcao, RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { fmtDataIsoPtBr } from "../../../components/rh/ListaHistoricoRh";
import { montarContatoEmergenciaLinha, montarEnderecoResumoLine } from "../../../lib/rhFuncionarioEndereco";
import {
  centavosInteirosDeStringMoeda,
  numeroDeCentavosStr,
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import { encontrarVinculoParaFuncionarioRow } from "../../../lib/rhOrganogramaTree";

export const NIVEIS = ["Junior", "Pleno", "Senior", "Especialista", "Gestor"] as const;

export const TIPOS_CONTRATO: { value: RhFuncionarioTipoContrato; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Estagio", label: "Estágio" },
  { value: "Temporario", label: "Temporário" },
];

export const ORIGENS_CONTRATACAO: { value: RhOrigemContratacao; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "indicacao", label: "Indicação" },
  { value: "site_vagas", label: "Site de Vagas" },
  { value: "instagram", label: "Instagram" },
  { value: "site_spin", label: "Site Spin" },
];

export function labelOrigemContratacao(v: RhOrigemContratacao | "" | null | undefined): string {
  if (!v) return "—";
  return ORIGENS_CONTRATACAO.find((o) => o.value === v)?.label ?? "—";
}

export function origemContratacaoDeRow(r: RhFuncionario): RhOrigemContratacao | "" {
  const v = r.origem_contratacao;
  return ORIGENS_CONTRATACAO.some((o) => o.value === v) ? (v as RhOrigemContratacao) : "";
}

/** Opção mínima de RH Talk publicado no Portal de RH (seleção na Gestão de Prestadores). */
export type RhPortalRhTalkOpcao = {
  id: string;
  numero: number | null;
  titulo: string;
  data_reuniao: string | null;
};

export function labelOpcaoRhTalkPortal(talk: RhPortalRhTalkOpcao): string {
  const num = talk.numero != null ? `#${talk.numero} — ` : "";
  const data = talk.data_reuniao ? fmtDataIsoPtBr(talk.data_reuniao.slice(0, 10)) : "—";
  return `${num}${talk.titulo.trim()} (${data})`;
}

export const PRESTADOR_STATUS_FILTRO_EXTRA = [
  { value: "ativo", label: "Ativos" },
  { value: "indisponivel", label: "Indisponíveis" },
  { value: "encerrado", label: "Encerrado" },
] as const;

export type FiltroTipoAcaoHistoricoPrestador =
  | "todos"
  | "revisao_contrato"
  | "indisponibilidade"
  | "alinhamento_formal"
  | "anotacao_rh";

export const FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS: { value: FiltroTipoAcaoHistoricoPrestador; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "revisao_contrato", label: "Revisão de Contrato" },
  { value: "indisponibilidade", label: "Indisponibilidade (saída e retorno)" },
  { value: "alinhamento_formal", label: "Alinhamento" },
  { value: "anotacao_rh", label: "Anotações" },
];

export function historicoPrestadorPassaFiltroTipo(tipo: string, filtro: FiltroTipoAcaoHistoricoPrestador): boolean {
  if (filtro === "todos") return true;
  if (filtro === "revisao_contrato") return tipo === "revisao_contrato";
  if (filtro === "indisponibilidade") {
    return tipo === "periodo_indisponibilidade" || tipo === "retorno_indisponibilidade";
  }
  if (filtro === "alinhamento_formal") return tipo === "alinhamento_formal";
  if (filtro === "anotacao_rh") return tipo === "anotacao_rh";
  return true;
}

/** Valores permitidos para o campo Escala (cadastro de prestador). */
export const ESCALAS_PERMITIDAS = ["5x2", "3x3", "4x2", "5x1"] as const;

export function labelAreaAtuacao(a: RhAreaAtuacao | "" | null | undefined): string {
  if (a === "estudio") return "Estúdio";
  if (a === "escritorio") return "Escritório";
  return "—";
}

export function remuneracaoHoraCentavosDeRow(f: RhFuncionario): string {
  const v = f.remuneracao_hora_centavos;
  if (v == null || Number.isNaN(Number(v))) return "";
  return String(Math.round(Number(v)));
}

/** ISO YYYY-MM-DD: Data da Função se preenchida; senão Data de início. */
export function dataFuncaoOuInicioIso(row: RhFuncionario): string {
  const df = String(row.data_funcao ?? "").trim();
  if (df) return df.slice(0, 10);
  return String(row.data_inicio ?? "").trim().slice(0, 10);
}

export function textoDataFuncaoColunaTabela(row: RhFuncionario): string {
  return fmtDataIsoPtBr(dataFuncaoOuInicioIso(row));
}

export function areaAtuacaoTabela(row: RhFuncionario): RhAreaAtuacao {
  return row.area_atuacao === "estudio" || row.area_atuacao === "escritorio" ? row.area_atuacao : "escritorio";
}

/** Coluna «Remuneração»: mensal (escritório) ou por hora (estúdio), conforme área de atuação. */
export function textoRemuneracaoColunaTabela(row: RhFuncionario): { texto: string; title?: string } {
  if (areaAtuacaoTabela(row) === "estudio") {
    const rh = Number(row.remuneracao_hora_centavos ?? 0);
    if (rh > 0) return { texto: fmtBRL(rh / 100), title: "Remuneração por hora" };
    return { texto: "—" };
  }
  const sal = Number(row.salario);
  if (sal > 0) return { texto: fmtBRL(sal), title: "Remuneração mensal" };
  return { texto: "—" };
}

/** Valor numérico para ordenar remuneração (mensal em reais; hora em centavos). */
export function valorRemuneracaoOrdenacao(row: RhFuncionario): number {
  if (areaAtuacaoTabela(row) === "estudio") return Number(row.remuneracao_hora_centavos ?? 0);
  return Math.round(Number(row.salario) * 100);
}

export function escalaEhPermitida(s: string): s is (typeof ESCALAS_PERMITIDAS)[number] {
  return (ESCALAS_PERMITIDAS as readonly string[]).includes(s.trim());
}

/** Valor do `<select>`: opção válida, placeholder de legado ou vazio (— Selecione —). */
export function valorSelectEscala(raw: string): string | "__legacy__" {
  const t = raw.trim();
  if (escalaEhPermitida(raw)) return t;
  if (t) return "__legacy__";
  return "";
}

/** Ativos + indisponíveis (exclui encerrados). */
export type FiltroStatusPrestador = "disponiveis" | RhFuncionario["status"];

export function labelStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "Ativo";
  if (s === "indisponivel") return "Indisponível";
  return "Encerrado";
}

export function corStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "#22c55e";
  if (s === "indisponivel") return "#f59e0b";
  return "#e84025";
}

export type SliceContratacao = {
  org_diretoria_id: string | null;
  org_gerencia_id: string | null;
  org_time_id: string | null;
  setor: string;
  cargo: string;
  nivel: string;
  area_atuacao: RhAreaAtuacao | "";
  remuneracaoHoraCentavos: string;
  staff_turno: string;
  salarioCentavos: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  escala: string;
  data_funcao: string;
  email_spin: string;
  origem_contratacao: RhOrigemContratacao | "";
  quem_indicou: string;
};

export function sliceContratacaoDeForm(f: FormState): SliceContratacao {
  return {
    org_diretoria_id: f.org_diretoria_id,
    org_gerencia_id: f.org_gerencia_id,
    org_time_id: f.org_time_id,
    setor: f.setor.trim(),
    cargo: f.cargo.trim(),
    nivel: f.nivel.trim(),
    area_atuacao: (f.area_atuacao === "estudio" || f.area_atuacao === "escritorio" ? f.area_atuacao : "") as RhAreaAtuacao | "",
    remuneracaoHoraCentavos: f.remuneracaoHoraCentavos,
    staff_turno: (f.staff_turno ?? "").trim(),
    salarioCentavos: f.salarioCentavos,
    tipo_contrato: f.tipo_contrato,
    escala: f.escala.trim(),
    data_funcao: (f.data_funcao ?? "").trim().slice(0, 10),
    email_spin: (f.email_spin ?? "").trim(),
    origem_contratacao: f.origem_contratacao,
    quem_indicou: (f.quem_indicou ?? "").trim(),
  };
}

export function sliceContratacaoDeRow(r: RhFuncionario): SliceContratacao {
  const cents = Math.round(Number(r.salario) * 100).toString();
  const df = r.data_funcao ? String(r.data_funcao).slice(0, 10) : "";
  const area: RhAreaAtuacao =
    r.area_atuacao === "estudio" || r.area_atuacao === "escritorio" ? r.area_atuacao : "escritorio";
  return {
    org_diretoria_id: r.org_diretoria_id ?? null,
    org_gerencia_id: r.org_gerencia_id ?? null,
    org_time_id: r.org_time_id ?? null,
    setor: r.setor.trim(),
    cargo: r.cargo.trim(),
    nivel: r.nivel.trim(),
    area_atuacao: area,
    remuneracaoHoraCentavos: remuneracaoHoraCentavosDeRow(r),
    staff_turno: (r.staff_turno ?? "").trim(),
    salarioCentavos: cents,
    tipo_contrato: r.tipo_contrato,
    escala: r.escala.trim(),
    data_funcao: df,
    email_spin: (r.email_spin ?? "").trim(),
    origem_contratacao: origemContratacaoDeRow(r),
    quem_indicou: (r.quem_indicou ?? "").trim(),
  };
}

export function labelSliceOrganograma(
  slice: SliceContratacao,
  vinculos: RhOrgPrestadorVinculoOpcao[],
  opcoesTimes: RhOrgTimeOpcao[],
): string {
  const v = encontrarVinculoParaFuncionarioRow(
    {
      org_time_id: slice.org_time_id,
      org_gerencia_id: slice.org_gerencia_id,
      org_diretoria_id: slice.org_diretoria_id,
    },
    vinculos,
  );
  if (v) return v.label;
  if (slice.org_time_id) {
    return opcoesTimes.find((o) => o.timeId === slice.org_time_id)?.label || slice.setor.trim() || "—";
  }
  return slice.setor.trim() || "—";
}

export function diffContratacaoSlices(
  antes: SliceContratacao,
  depois: SliceContratacao,
  vinculos: RhOrgPrestadorVinculoOpcao[],
  opcoesTimes: RhOrgTimeOpcao[],
  fmtSal: (cents: string) => string,
): { campo: string; antes: string; depois: string }[] {
  const out: { campo: string; antes: string; depois: string }[] = [];
  const orgAntes = labelSliceOrganograma(antes, vinculos, opcoesTimes) || antes.setor || "—";
  const orgDepois = labelSliceOrganograma(depois, vinculos, opcoesTimes) || depois.setor || "—";
  if (orgAntes !== orgDepois || antes.setor !== depois.setor) {
    out.push({ campo: "Organograma", antes: orgAntes, depois: orgDepois });
  }
  if (antes.cargo !== depois.cargo) out.push({ campo: "Função", antes: antes.cargo || "—", depois: depois.cargo || "—" });
  if (antes.nivel !== depois.nivel) out.push({ campo: "Nível", antes: antes.nivel, depois: depois.nivel });
  if (antes.area_atuacao !== depois.area_atuacao) {
    out.push({
      campo: "Área de atuação",
      antes: labelAreaAtuacao(antes.area_atuacao),
      depois: labelAreaAtuacao(depois.area_atuacao),
    });
  }
  if (antes.salarioCentavos !== depois.salarioCentavos) {
    out.push({
      campo: "Remuneração mensal",
      antes: fmtSal(antes.salarioCentavos),
      depois: fmtSal(depois.salarioCentavos),
    });
  }
  if (antes.remuneracaoHoraCentavos !== depois.remuneracaoHoraCentavos) {
    out.push({
      campo: "Remuneração por hora",
      antes: fmtSal(antes.remuneracaoHoraCentavos),
      depois: fmtSal(depois.remuneracaoHoraCentavos),
    });
  }
  if (antes.staff_turno.trim() !== depois.staff_turno.trim()) {
    out.push({
      campo: "Turno",
      antes: antes.staff_turno.trim() || "—",
      depois: depois.staff_turno.trim() || "—",
    });
  }
  if (antes.tipo_contrato !== depois.tipo_contrato) {
    out.push({ campo: "Tipo de contrato", antes: antes.tipo_contrato, depois: depois.tipo_contrato });
  }
  if (antes.escala !== depois.escala) out.push({ campo: "Escala", antes: antes.escala, depois: depois.escala });
  if (antes.data_funcao !== depois.data_funcao) {
    out.push({
      campo: "Data da Função",
      antes: fmtDataIsoPtBr(antes.data_funcao),
      depois: fmtDataIsoPtBr(depois.data_funcao),
    });
  }
  if (antes.email_spin !== depois.email_spin) {
    out.push({
      campo: "E-mail Spin",
      antes: antes.email_spin.trim() ? antes.email_spin : "—",
      depois: depois.email_spin.trim() ? depois.email_spin : "—",
    });
  }
  if (antes.origem_contratacao !== depois.origem_contratacao) {
    out.push({
      campo: "Origem",
      antes: labelOrigemContratacao(antes.origem_contratacao),
      depois: labelOrigemContratacao(depois.origem_contratacao),
    });
  }
  if (antes.quem_indicou !== depois.quem_indicou) {
    out.push({
      campo: "Quem indicou?",
      antes: antes.quem_indicou.trim() || "—",
      depois: depois.quem_indicou.trim() || "—",
    });
  }
  return out;
}

export const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

function logradouroResidencialRow(r: RhFuncionario): string {
  return (r.res_logradouro ?? "").trim() || (r.endereco_residencial ?? "").trim();
}

function logradouroEmpresaRow(r: RhFuncionario): string {
  return (r.emp_logradouro ?? "").trim() || (r.endereco_empresa ?? "").trim();
}

function nomeEmergenciaRow(r: RhFuncionario): string {
  return (r.emerg_nome ?? "").trim() || (r.contato_emergencia ?? "").trim();
}

/**
 * Motivos pelos quais o prestador aparece no card «Cadastro incompleto».
 * Alinhado a `formDeFuncionario` (fallback de campos legados) e à validação de gravação.
 */
export function motivosPrestadorCadastroIncompleto(r: RhFuncionario, temOrganograma: boolean): string[] {
  const p: string[] = [];

  if (!r.nome?.trim()) p.push("Nome completo");
  const cpf = somenteDigitos(r.cpf ?? "");
  if (cpf.length !== 11 || !validarCpfDigitos(cpf)) p.push("CPF válido");
  if (!r.email?.trim() || !validarEmail(r.email)) p.push("E-mail pessoal válido");
  const tel = somenteDigitos(r.telefone ?? "");
  if (tel.length < 10 || tel.length > 11) p.push("Telefone");
  if (!r.rg?.trim()) p.push("RG");

  if (!logradouroResidencialRow(r)) p.push("Logradouro residencial");
  if (!(r.res_numero ?? "").trim()) p.push("Número residencial");
  if (!(r.res_cidade ?? "").trim()) p.push("Cidade residencial");
  const uf = (r.res_estado ?? "").trim().toUpperCase();
  if (uf.length !== 2 || !UFS_BR.includes(uf as (typeof UFS_BR)[number])) p.push("UF residencial");
  const cep = somenteDigitos(r.res_cep ?? "");
  if (cep.length !== 8) p.push("CEP residencial");

  const en = nomeEmergenciaRow(r);
  if (!en || en === "—") p.push("Nome do contato de emergência");
  const telE = somenteDigitos(r.emerg_telefone ?? "");
  if (telE.length < 10 || telE.length > 11) p.push("Telefone de emergência");

  if (temOrganograma) {
    if (!r.org_time_id && !r.org_gerencia_id && !r.org_diretoria_id && !r.setor?.trim()) {
      p.push("Organograma ou setor");
    }
  } else if (!r.setor?.trim()) {
    p.push("Setor");
  }

  if (!r.cargo?.trim()) p.push("Função");
  if (!r.nivel?.trim()) p.push("Nível");
  if (!r.escala?.trim()) p.push("Escala");
  else if (!escalaEhPermitida(r.escala)) p.push("Escala (fora da lista 5x2, 3x3, 4x2 ou 5x1)");
  if (!r.data_inicio?.trim()) p.push("Data de início");

  if (r.tipo_contrato === "PJ") {
    const cnpj = somenteDigitos(r.cnpj ?? "");
    if (cnpj.length !== 14 || !validarCnpjDigitos(cnpj) || cnpj === CNPJ_CONTEXTO_NAO_PJ) p.push("CNPJ válido (PJ)");
    const ne = (r.nome_empresa ?? "").trim();
    if (!ne || ne.includes("completar")) p.push("Nome da empresa (PJ)");
    if (!logradouroEmpresaRow(r)) p.push("Logradouro da empresa (PJ)");
    if (!(r.emp_numero ?? "").trim()) p.push("Número da empresa (PJ)");
    if (!(r.emp_cidade ?? "").trim()) p.push("Cidade da empresa (PJ)");
    const ufe = (r.emp_estado ?? "").trim().toUpperCase();
    if (ufe.length !== 2 || !UFS_BR.includes(ufe as (typeof UFS_BR)[number])) p.push("UF da empresa (PJ)");
    const cepE = somenteDigitos(r.emp_cep ?? "");
    if (cepE.length !== 8) p.push("CEP da empresa (PJ)");
  }

  const bancoT = (r.banco ?? "").trim();
  if (!bancoT || bancoT === "—") p.push("Banco");
  if (!(r.agencia ?? "").trim()) p.push("Agência");
  const conta = (r.conta_corrente ?? "").trim();
  if (!conta || conta === "0") p.push("Conta corrente");
  if (!String(r.pix ?? "").trim()) p.push("PIX");

  const area: RhAreaAtuacao =
    r.area_atuacao === "estudio" || r.area_atuacao === "escritorio" ? r.area_atuacao : "escritorio";
  if (area === "estudio") {
    const hc = Number(r.remuneracao_hora_centavos ?? 0);
    if (hc <= 0) p.push("Remuneração por hora (estúdio)");
    if (!(r.staff_turno ?? "").trim()) p.push("Turno (estúdio)");
  } else if (Number(r.salario) <= 0) {
    p.push("Remuneração mensal (escritório)");
  }

  return p;
}

/** Cadastro considerado incompleto para o card de resumo (campos mínimos alinhados à validação de gravação). */
export function prestadorCadastroIncompleto(r: RhFuncionario, temOrganograma: boolean): boolean {
  return motivosPrestadorCadastroIncompleto(r, temOrganograma).length > 0;
}

export const blurSensivel: CSSProperties = {
  filter: "blur(7px)",
  userSelect: "none",
};

export function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return getCtaCriarGradient(brand);
}

export type FormState = {
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  /** E-mail corporativo Spin (opcional). */
  email_spin: string;
  /** YYYY-MM-DD opcional. */
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
  setor: string;
  org_diretoria_id: string | null;
  org_gerencia_id: string | null;
  org_time_id: string | null;
  cargo: string;
  nivel: string;
  /** Vazio no «Novo» até o utilizador escolher. */
  area_atuacao: "" | RhAreaAtuacao;
  remuneracaoHoraCentavos: string;
  staff_turno: string;
  salarioCentavos: string;
  data_inicio: string;
  data_funcao: string;
  origem_contratacao: RhOrigemContratacao | "";
  quem_indicou: string;
  escala: string;
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
  observacao_rh: string;
};

export type AbaFuncModal =
  | "pessoais"
  | "contratacao"
  | "empresa"
  | "bancarios"
  | "documentos"
  | "carreira"
  | "acesso_plataforma";

/** Aba do modal onde o campo aparece (para saltar à primeira com erro). */
export function abaDoCampoRhModal(campo: string, formEhPJ: boolean): AbaFuncModal {
  const pessoal = new Set([
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
    "emerg_telefone",
  ]);
  if (pessoal.has(campo)) return "pessoais";
  const contr = new Set([
    "org_time_id",
    "setor",
    "cargo",
    "nivel",
    "tipo_contrato",
    "area_atuacao",
    "email_spin",
    "salarioCentavos",
    "remuneracaoHoraCentavos",
    "staff_turno",
    "data_inicio",
    "escala",
    "origem_contratacao",
    "quem_indicou",
  ]);
  if (contr.has(campo)) return "contratacao";
  const emp = new Set([
    "nome_empresa",
    "cnpj",
    "emp_cep",
    "emp_logradouro",
    "emp_numero",
    "emp_cidade",
    "emp_estado",
  ]);
  if (formEhPJ && emp.has(campo)) return "empresa";
  const banc = new Set(["banco", "agencia", "conta_corrente", "pix"]);
  if (banc.has(campo)) return "bancarios";
  return "pessoais";
}

export type AbaPaginaRhFunc = "headcount" | "acoes_rh" | "anotacoes";

/** Colunas ordenáveis da tabela principal (todas as abas). */
export type PrestadoresSortCol = "nome" | "cargo" | "lider" | "data_funcao" | "salario" | "status";

export const ABAS_PAGINA_RH_FUNC: { key: AbaPaginaRhFunc; label: string }[] = [
  { key: "headcount", label: "Head Count" },
  { key: "acoes_rh", label: "Ações de RH" },
  { key: "anotacoes", label: "Anotações RH" },
];

/** CNPJ válido genérico para persistir quando o contrato não é PJ (aba de empresa oculta). */
export const CNPJ_CONTEXTO_NAO_PJ = "00000000000191";

export function estadoVazioForm(): FormState {
  return {
    nome: "",
    rg: "",
    cpf: "",
    telefone: "",
    email: "",
    email_spin: "",
    data_nascimento: "",
    res_cep: "",
    res_logradouro: "",
    res_numero: "",
    res_complemento: "",
    res_cidade: "",
    res_estado: "",
    emerg_nome: "",
    emerg_parentesco: "",
    emerg_telefone: "",
    setor: "",
    org_diretoria_id: null,
    org_gerencia_id: null,
    org_time_id: null,
    cargo: "",
    nivel: "Junior",
    area_atuacao: "",
    remuneracaoHoraCentavos: "",
    staff_turno: "",
    salarioCentavos: "",
    data_inicio: "",
    data_funcao: "",
    origem_contratacao: "",
    quem_indicou: "",
    escala: "",
    tipo_contrato: "PJ",
    nome_empresa: "",
    cnpj: "",
    emp_cep: "",
    emp_logradouro: "",
    emp_numero: "",
    emp_complemento: "",
    emp_cidade: "",
    emp_estado: "",
    banco: "",
    agencia: "",
    conta_corrente: "",
    pix: "",
    observacao_rh: "",
  };
}

export function formDeFuncionario(f: RhFuncionario): FormState {
  const cents = Math.round(Number(f.salario) * 100).toString();
  const resLog = (f.res_logradouro ?? "").trim() || f.endereco_residencial;
  const empLog = (f.emp_logradouro ?? "").trim() || f.endereco_empresa;
  const emergNome = (f.emerg_nome ?? "").trim() || f.contato_emergencia;
  return {
    nome: f.nome,
    rg: formatarRgInput(f.rg),
    cpf: formatarCpfDigitos(f.cpf ?? ""),
    telefone: formatarTelefoneBr(f.telefone),
    email: f.email,
    email_spin: (f.email_spin ?? "").trim(),
    data_nascimento: f.data_nascimento ? String(f.data_nascimento).slice(0, 10) : "",
    res_cep: formatarCepDigitos(f.res_cep ?? ""),
    res_logradouro: resLog,
    res_numero: f.res_numero ?? "",
    res_complemento: f.res_complemento ?? "",
    res_cidade: f.res_cidade ?? "",
    res_estado: (f.res_estado ?? "").toUpperCase().slice(0, 2),
    emerg_nome: emergNome,
    emerg_parentesco: f.emerg_parentesco ?? "",
    emerg_telefone: formatarTelefoneBr(f.emerg_telefone ?? ""),
    setor: f.setor,
    org_diretoria_id: f.org_diretoria_id ?? null,
    org_gerencia_id: f.org_gerencia_id ?? null,
    org_time_id: f.org_time_id ?? null,
    cargo: f.cargo,
    nivel: f.nivel,
    area_atuacao:
      f.area_atuacao === "estudio" || f.area_atuacao === "escritorio" ? f.area_atuacao : "escritorio",
    remuneracaoHoraCentavos: remuneracaoHoraCentavosDeRow(f),
    staff_turno: (f.staff_turno ?? "").trim(),
    salarioCentavos: cents,
    data_inicio: f.data_inicio,
    data_funcao: f.data_funcao ? String(f.data_funcao).slice(0, 10) : "",
    origem_contratacao: origemContratacaoDeRow(f),
    quem_indicou: (f.quem_indicou ?? "").trim(),
    escala: f.escala,
    tipo_contrato: f.tipo_contrato,
    nome_empresa: f.nome_empresa,
    cnpj: formatarCnpjDigitos(f.cnpj),
    emp_cep: formatarCepDigitos(f.emp_cep ?? ""),
    emp_logradouro: empLog,
    emp_numero: f.emp_numero ?? "",
    emp_complemento: f.emp_complemento ?? "",
    emp_cidade: f.emp_cidade ?? "",
    emp_estado: (f.emp_estado ?? "").toUpperCase().slice(0, 2),
    banco: f.banco,
    agencia: formatarAgencia(f.agencia),
    conta_corrente: f.conta_corrente,
    pix: f.pix ?? "",
    observacao_rh: f.observacao_rh ?? "",
  };
}

export function tiposAcaoDisponiveis(status: RhFuncionario["status"]): { value: RhHistoricoAcaoTipo; label: string }[] {
  const out: { value: RhHistoricoAcaoTipo; label: string }[] = [];
  if (status !== "encerrado") {
    out.push({ value: "revisao_contrato", label: "Revisão de Contrato" });
  }
  if (status === "ativo") {
    out.push({ value: "periodo_indisponibilidade", label: "Período de Indisponibilidade" });
    out.push({ value: "termino_prestacao", label: "Término da Prestação" });
  }
  if (status === "indisponivel") {
    out.push({ value: "retorno_indisponibilidade", label: "Retorno de Indisponibilidade" });
    out.push({ value: "termino_prestacao", label: "Término da Prestação" });
  }
  if (status === "encerrado") {
    out.push({ value: "reativacao_prestacao", label: "Reativação da Prestação" });
  }
  if (status !== "encerrado") {
    out.push({ value: "alinhamento_formal", label: "Alinhamento Formal" });
  }
  return out;
}

export function buildRhFuncionarioPayloadFromState(
  form: FormState,
  statusPrestador: RhFuncionario["status"],
  podeVerDadosSensiveis: boolean,
  cadastroMinimoNovo = false,
): Omit<RhFuncionario, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "data_desligamento"> & {
  status: RhFuncionario["status"];
  data_desligamento?: string | null;
} {
  const area: RhAreaAtuacao =
    form.area_atuacao === "estudio" || form.area_atuacao === "escritorio" ? form.area_atuacao : "escritorio";
  const isEstudio = area === "estudio";
  const sal = isEstudio ? 0 : podeVerDadosSensiveis ? numeroDeCentavosStr(form.salarioCentavos) : 0;
  const remuneracao_hora_centavos =
    isEstudio && podeVerDadosSensiveis
      ? centavosInteirosDeStringMoeda(form.remuneracaoHoraCentavos)
      : isEstudio
        ? 0
        : null;
  const staff_turno = isEstudio ? (form.staff_turno.trim() || null) : null;
  const isPj = form.tipo_contrato === "PJ";
  let cnpjFinal = isPj ? somenteDigitos(form.cnpj) : CNPJ_CONTEXTO_NAO_PJ;
  if (cadastroMinimoNovo && isPj && (cnpjFinal.length !== 14 || !validarCnpjDigitos(cnpjFinal))) {
    cnpjFinal = CNPJ_CONTEXTO_NAO_PJ;
  }

  const endResLinhaRaw = montarEnderecoResumoLine({
    cep: form.res_cep,
    logradouro: form.res_logradouro,
    numero: form.res_numero,
    complemento: form.res_complemento,
    cidade: form.res_cidade,
    estado: form.res_estado,
  });
  let endResLinha = endResLinhaRaw;
  if (cadastroMinimoNovo && (!form.res_logradouro.trim() || endResLinhaRaw === "—")) {
    endResLinha = "Cadastro inicial — completar endereço residencial.";
  }

  let endEmpLinha = montarEnderecoResumoLine({
    cep: form.emp_cep,
    logradouro: form.emp_logradouro,
    numero: form.emp_numero,
    complemento: form.emp_complemento,
    cidade: form.emp_cidade,
    estado: form.emp_estado,
  });
  if (cadastroMinimoNovo && isPj && (!form.emp_logradouro.trim() || endEmpLinha === "—")) {
    endEmpLinha = "Cadastro inicial — dados da empresa a completar.";
  }

  let emergNome = form.emerg_nome.trim();
  let emergTel = somenteDigitos(form.emerg_telefone);
  if (cadastroMinimoNovo) {
    if (!emergNome) emergNome = "—";
    if (emergTel.length < 10) emergTel = somenteDigitos(form.telefone);
  }
  const emergLinha = montarContatoEmergenciaLinha(emergNome, form.emerg_parentesco, emergTel);

  let nomeEmpresa = isPj ? form.nome_empresa.trim() : form.nome_empresa.trim() || "—";
  if (cadastroMinimoNovo && isPj && !nomeEmpresa) {
    nomeEmpresa = "Cadastro PJ — completar na Gestão de Prestadores.";
  }

  let bancoV = form.banco.trim();
  let agenciaV = somenteDigitos(form.agencia);
  let contaV = form.conta_corrente.trim();
  const pixV = form.pix.trim() || null;
  if (cadastroMinimoNovo && podeVerDadosSensiveis) {
    if (!bancoV) bancoV = "—";
    if (!agenciaV) agenciaV = "0";
    if (!contaV) contaV = "0";
  }

  const cpfDigits = somenteDigitos(form.cpf);
  return {
    status: statusPrestador,
    nome: form.nome.trim(),
    rg: form.rg.trim(),
    cpf: cpfDigits.length === 0 ? null : cpfDigits,
    telefone: somenteDigitos(form.telefone),
    email: form.email.trim().toLowerCase(),
    email_spin: form.email_spin.trim() ? form.email_spin.trim().toLowerCase() : null,
    data_nascimento: form.data_nascimento.trim() ? form.data_nascimento.trim().slice(0, 10) : null,
    endereco_residencial: endResLinha,
    res_cep: somenteDigitos(form.res_cep),
    res_logradouro: form.res_logradouro.trim(),
    res_numero: form.res_numero.trim(),
    res_complemento: form.res_complemento.trim(),
    res_cidade: form.res_cidade.trim(),
    res_estado: form.res_estado.trim().toUpperCase().slice(0, 2),
    contato_emergencia: emergLinha,
    emerg_nome: emergNome,
    emerg_parentesco: form.emerg_parentesco.trim(),
    emerg_telefone: emergTel,
    setor: form.setor.trim(),
    org_diretoria_id: form.org_diretoria_id || null,
    org_gerencia_id: form.org_gerencia_id || null,
    org_time_id: form.org_time_id || null,
    cargo: form.cargo.trim(),
    nivel: form.nivel.trim(),
    area_atuacao: area,
    remuneracao_hora_centavos,
    staff_turno,
    salario: sal,
    data_inicio: form.data_inicio,
    data_funcao: form.data_funcao.trim() ? form.data_funcao.trim().slice(0, 10) : null,
    origem_contratacao: form.origem_contratacao || null,
    quem_indicou:
      form.origem_contratacao === "indicacao" && form.quem_indicou.trim() ? form.quem_indicou.trim() : null,
    escala: form.escala.trim(),
    tipo_contrato: form.tipo_contrato,
    nome_empresa: nomeEmpresa,
    cnpj: cnpjFinal,
    endereco_empresa: isPj ? endEmpLinha : "—",
    emp_cep: isPj ? somenteDigitos(form.emp_cep) : "",
    emp_logradouro: isPj ? form.emp_logradouro.trim() : "",
    emp_numero: isPj ? form.emp_numero.trim() : "",
    emp_complemento: isPj ? form.emp_complemento.trim() : "",
    emp_cidade: isPj ? form.emp_cidade.trim() : "",
    emp_estado: isPj ? form.emp_estado.trim().toUpperCase().slice(0, 2) : "",
    banco: bancoV,
    agencia: agenciaV,
    conta_corrente: contaV,
    pix: pixV,
    observacao_rh: form.observacao_rh.trim() || null,
  };
}

/** Colunas da listagem/KPIs — sem fotos/skills de dealer (payload pesado). Cadastro incompleto ainda precisa de CPF/endereço/banco. */
export const PRESTADOR_LISTA_SELECT = [
  "id",
  "status",
  "nome",
  "rg",
  "cpf",
  "telefone",
  "email",
  "email_spin",
  "data_nascimento",
  "endereco_residencial",
  "res_cep",
  "res_logradouro",
  "res_numero",
  "res_complemento",
  "res_cidade",
  "res_estado",
  "contato_emergencia",
  "emerg_nome",
  "emerg_parentesco",
  "emerg_telefone",
  "setor",
  "org_diretoria_id",
  "org_gerencia_id",
  "org_time_id",
  "cargo",
  "nivel",
  "area_atuacao",
  "remuneracao_hora_centavos",
  "salario",
  "data_inicio",
  "data_funcao",
  "origem_contratacao",
  "quem_indicou",
  "data_desligamento",
  "observacao_rh",
  "escala",
  "tipo_contrato",
  "nome_empresa",
  "cnpj",
  "endereco_empresa",
  "emp_cep",
  "emp_logradouro",
  "emp_numero",
  "emp_complemento",
  "emp_cidade",
  "emp_estado",
  "banco",
  "agencia",
  "conta_corrente",
  "pix",
  "staff_turno",
  "cadastro_revisado_em",
  "cadastro_revisao_tipo",
  "created_at",
  "updated_at",
].join(", ");

export const PRESTADOR_TABELA_VAZIO = "Nenhum prestador encontrado.";
export const PRESTADOR_HISTORICO_VAZIO = "Nenhum registro no histórico.";

/** Insert/update em `rh_funcionarios`: mensagens amigáveis sem expor infra na UI. */
export function mensagemErroSupabaseRhFuncionarioSalvar(error: {
  code?: string;
  message?: string;
  details?: string;
}): string {
  const raw = error.message ?? "";
  const det = typeof error.details === "string" ? error.details : "";
  const lower = `${raw} ${det}`.toLowerCase();

  if (error.code === "23514" && lower.includes("rh_funcionarios_cpf_digits")) {
    return "CPF Inválido";
  }

  const duplicidadeCpf =
    error.code === "23505" &&
    (lower.includes("rh_funcionarios_cpf_unique") ||
      lower.includes("key (cpf)") ||
      (lower.includes("duplicate") && lower.includes("cpf")));
  if (duplicidadeCpf) {
    return "Já existe um prestador cadastrado com este CPF.";
  }

  if (raw.trim() || det.trim()) {
    console.error("[GestaoPrestador] salvar:", error);
  }
  return "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";
}

