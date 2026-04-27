import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  History,
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { RH_BANCOS_BRASIL, rhBancoParaSelectValue } from "../../../constants/rhBancosBrasil";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  centavosDeStringMoeda,
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarMoedaDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  numeroDeCentavosStr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import { montarContatoEmergenciaLinha, montarEnderecoResumoLine } from "../../../lib/rhFuncionarioEndereco";
import { buscarEnderecoPorCep } from "../../../lib/rhViaCep";
import { opcoesTurnoPorEscalaRh, turnoRhCoerenteComEscala } from "../../../lib/rhEscalaTurnos";
import type {
  RhAreaAtuacao,
  RhFuncionario,
  RhFuncionarioHistorico,
  RhFuncionarioTipoContrato,
  RhHistoricoAcaoTipo,
  RhTipoTerminoPrestacao,
} from "../../../types/rhFuncionario";
import { uploadAnexosAcaoRh } from "../../../lib/rhPrestadorAcaoFiles";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgPrestadorVinculoOpcao, RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import { nomeLiderDoisPrimeirosParaTabela } from "../../../lib/rhOrganogramaLiderImediato";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { syncGamePresenterDealerFromRhFuncionario } from "../../../lib/rhGamePresenterDealerSync";
import { SelectOrganogramaTimes } from "../../../components/rh/SelectOrganogramaTimes";
import { ListaHistoricoRh, fmtDataIsoPtBr } from "../../../components/rh/ListaHistoricoRh";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader, useDialogTitleId } from "../../../components/OperacoesModal";
import { SkeletonTableRow, SortTableTh, type SortDir } from "../../../components/dashboard";

const NIVEIS = ["Junior", "Pleno", "Senior", "Especialista", "Gestor"] as const;

const TIPOS_CONTRATO: { value: RhFuncionarioTipoContrato; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Estagio", label: "Estágio" },
  { value: "Temporario", label: "Temporário" },
];

/** Valores permitidos para o campo Escala (cadastro de prestador). */
const ESCALAS_PERMITIDAS = ["5x2", "3x3", "4x2", "5x1"] as const;

function labelAreaAtuacao(a: RhAreaAtuacao | "" | null | undefined): string {
  if (a === "estudio") return "Estúdio";
  if (a === "escritorio") return "Escritório";
  return "—";
}

function remuneracaoHoraCentavosDeRow(f: RhFuncionario): string {
  const v = f.remuneracao_hora_centavos;
  if (v == null || Number.isNaN(Number(v))) return "";
  return String(Math.round(Number(v)));
}

function escalaEhPermitida(s: string): s is (typeof ESCALAS_PERMITIDAS)[number] {
  return (ESCALAS_PERMITIDAS as readonly string[]).includes(s.trim());
}

/** Valor do `<select>`: opção válida, placeholder de legado ou vazio (— Selecione —). */
function valorSelectEscala(raw: string): string | "__legacy__" {
  const t = raw.trim();
  if (escalaEhPermitida(raw)) return t;
  if (t) return "__legacy__";
  return "";
}

/** Ativos + indisponíveis (exclui encerrados). */
type FiltroStatusPrestador = "disponiveis" | RhFuncionario["status"];

function labelStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "Ativo";
  if (s === "indisponivel") return "Indisponível";
  return "Encerrado";
}

function corStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "#22c55e";
  if (s === "indisponivel") return "#f59e0b";
  return "#e84025";
}

type SliceContratacao = {
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
};

function sliceContratacaoDeForm(f: FormState): SliceContratacao {
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
  };
}

function sliceContratacaoDeRow(r: RhFuncionario): SliceContratacao {
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
  };
}

function labelSliceOrganograma(
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

function diffContratacaoSlices(
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
  return out;
}

const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

/** Cadastro considerado incompleto para o card de resumo (campos mínimos alinhados à validação de gravação). */
function prestadorCadastroIncompleto(r: RhFuncionario, temOrganograma: boolean): boolean {
  if (!r.nome?.trim()) return true;
  const cpf = somenteDigitos(r.cpf);
  if (cpf.length !== 11 || !validarCpfDigitos(cpf)) return true;
  if (!r.email?.trim() || !validarEmail(r.email)) return true;
  const tel = somenteDigitos(r.telefone);
  if (tel.length < 10 || tel.length > 11) return true;
  if (!r.rg?.trim()) return true;
  if (!r.res_logradouro?.trim() || !r.res_numero?.trim() || !r.res_cidade?.trim()) return true;
  const uf = (r.res_estado ?? "").trim().toUpperCase();
  if (uf.length !== 2 || !UFS_BR.includes(uf as (typeof UFS_BR)[number])) return true;
  const cep = somenteDigitos(r.res_cep ?? "");
  if (cep.length !== 8) return true;
  const en = (r.emerg_nome ?? "").trim();
  if (!en || en === "—") return true;
  const telE = somenteDigitos(r.emerg_telefone ?? "");
  if (telE.length < 10 || telE.length > 11) return true;
  if (temOrganograma) {
    if (!r.org_time_id && !r.org_gerencia_id && !r.org_diretoria_id && !r.setor?.trim()) return true;
  } else if (!r.setor?.trim()) return true;
  if (!r.cargo?.trim() || !r.nivel?.trim() || !r.escala?.trim()) return true;
  if (!escalaEhPermitida(r.escala)) return true;
  if (!r.data_inicio?.trim()) return true;
  if (r.tipo_contrato === "PJ") {
    const cnpj = somenteDigitos(r.cnpj);
    if (cnpj.length !== 14 || !validarCnpjDigitos(cnpj)) return true;
    if (cnpj === CNPJ_CONTEXTO_NAO_PJ) return true;
    const ne = (r.nome_empresa ?? "").trim();
    if (!ne || ne.includes("completar")) return true;
    if (!r.emp_logradouro?.trim() || !r.emp_numero?.trim() || !r.emp_cidade?.trim()) return true;
    const ufe = (r.emp_estado ?? "").trim().toUpperCase();
    if (ufe.length !== 2 || !UFS_BR.includes(ufe as (typeof UFS_BR)[number])) return true;
    const cepE = somenteDigitos(r.emp_cep ?? "");
    if (cepE.length !== 8) return true;
  }
  const bancoT = (r.banco ?? "").trim();
  if (!bancoT || bancoT === "—" || !r.agencia?.trim() || !r.conta_corrente?.trim() || r.conta_corrente.trim() === "0") return true;
  if (!String(r.pix ?? "").trim()) return true;
  const area: RhAreaAtuacao =
    r.area_atuacao === "estudio" || r.area_atuacao === "escritorio" ? r.area_atuacao : "escritorio";
  if (area === "estudio") {
    const hc = Number(r.remuneracao_hora_centavos ?? 0);
    if (hc <= 0) return true;
    if (!(r.staff_turno ?? "").trim()) return true;
  } else if (Number(r.salario) <= 0) {
    return true;
  }
  return false;
}

const blurSensivel: CSSProperties = {
  filter: "blur(7px)",
  userSelect: "none",
};

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

type FormState = {
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  /** E-mail corporativo Spin (opcional). */
  email_spin: string;
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

type AbaFuncModal =
  | "pessoais"
  | "contratacao"
  | "empresa"
  | "bancarios"
  | "documentos";

/** Aba do modal onde o campo aparece (para saltar à primeira com erro). */
function abaDoCampoRhModal(campo: string, formEhPJ: boolean): AbaFuncModal {
  const pessoal = new Set([
    "nome",
    "rg",
    "cpf",
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

type AbaPaginaRhFunc = "headcount" | "acoes_rh" | "anotacoes";

/** Colunas ordenáveis da tabela principal (todas as abas). */
type PrestadoresSortCol = "nome" | "diretoria" | "gerencia" | "cargo" | "lider" | "salario" | "status";

const ABAS_PAGINA_RH_FUNC: { key: AbaPaginaRhFunc; label: string }[] = [
  { key: "headcount", label: "Head Count" },
  { key: "acoes_rh", label: "Ações de RH" },
  { key: "anotacoes", label: "Anotações RH" },
];

/** CNPJ válido genérico para persistir quando o contrato não é PJ (aba de empresa oculta). */
const CNPJ_CONTEXTO_NAO_PJ = "00000000000191";

function estadoVazioForm(): FormState {
  return {
    nome: "",
    rg: "",
    cpf: "",
    telefone: "",
    email: "",
    email_spin: "",
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

function formDeFuncionario(f: RhFuncionario): FormState {
  const cents = Math.round(Number(f.salario) * 100).toString();
  const resLog = (f.res_logradouro ?? "").trim() || f.endereco_residencial;
  const empLog = (f.emp_logradouro ?? "").trim() || f.endereco_empresa;
  const emergNome = (f.emerg_nome ?? "").trim() || f.contato_emergencia;
  return {
    nome: f.nome,
    rg: formatarRgInput(f.rg),
    cpf: formatarCpfDigitos(f.cpf),
    telefone: formatarTelefoneBr(f.telefone),
    email: f.email,
    email_spin: (f.email_spin ?? "").trim(),
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

function tiposAcaoDisponiveis(status: RhFuncionario["status"]): { value: RhHistoricoAcaoTipo; label: string }[] {
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

function buildRhFuncionarioPayloadFromState(
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
    isEstudio && podeVerDadosSensiveis ? numeroDeCentavosStr(form.remuneracaoHoraCentavos) : isEstudio ? 0 : null;
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

  return {
    status: statusPrestador,
    nome: form.nome.trim(),
    rg: form.rg.trim(),
    cpf: somenteDigitos(form.cpf),
    telefone: somenteDigitos(form.telefone),
    email: form.email.trim().toLowerCase(),
    email_spin: form.email_spin.trim() ? form.email_spin.trim().toLowerCase() : null,
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

function RhFuncModalHeaderDetalhes({
  t,
  perm,
  editId,
  lista,
  modalVerExibirSensiveis,
  setModalVerExibirSensiveis,
  abrirEditar,
  fecharModalFuncionario,
  ctaGradient,
  brand,
}: {
  t: ReturnType<typeof useApp>["theme"];
  perm: ReturnType<typeof usePermission>;
  editId: string | null;
  lista: RhFuncionario[];
  modalVerExibirSensiveis: boolean;
  setModalVerExibirSensiveis: (v: boolean) => void;
  abrirEditar: (row: RhFuncionario) => void;
  fecharModalFuncionario: () => void;
  ctaGradient: (brand: ReturnType<typeof useDashboardBrand>) => string;
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const titleId = useDialogTitleId();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 900,
            color: t.text,
            fontFamily: FONT_TITLE,
          }}
        >
          Detalhes do Prestador
        </h2>
        <button
          type="button"
          onClick={() => setModalVerExibirSensiveis(!modalVerExibirSensiveis)}
          aria-label={modalVerExibirSensiveis ? "Ocultar dados sensíveis" : "Exibir dados sensíveis"}
          title={modalVerExibirSensiveis ? "Ocultar" : "Ver"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {modalVerExibirSensiveis ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {modalVerExibirSensiveis ? "Ocultar" : "Ver"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {perm.canEditarOk && editId ? (
          <button
            type="button"
            onClick={() => {
              const row = lista.find((x) => x.id === editId);
              if (row) abrirEditar(row);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              background: ctaGradient(brand),
            }}
          >
            Editar
          </button>
        ) : null}
        <button
          type="button"
          onClick={fecharModalFuncionario}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.textMuted,
          }}
          aria-label="Fechar modal"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default function RhPrestadoresPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_funcionarios");
  const permOrg = usePermission("rh_organograma");

  const podeVerDadosSensiveis = user?.role === "admin" || perm.canEditarOk;
  const [lista, setLista] = useState<RhFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroDiretoria, setFiltroDiretoria] = useState("");
  const [filtroGerencia, setFiltroGerencia] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroContrato, setFiltroContrato] = useState<RhFuncionarioTipoContrato | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusPrestador>("disponiveis");
  const [abaPagina, setAbaPagina] = useState<AbaPaginaRhFunc>("headcount");
  const [sortPrestadores, setSortPrestadores] = useState<{ col: PrestadoresSortCol; dir: SortDir }>({ col: "nome", dir: "asc" });

  const [modalForm, setModalForm] = useState<"fechado" | "novo" | "editar" | "ver">("fechado");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(estadoVazioForm);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [alertaValidacaoModal, setAlertaValidacaoModal] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [opcoesTimes, setOpcoesTimes] = useState<RhOrgTimeOpcao[]>([]);
  const [organogramaGrupos, setOrganogramaGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [abaModal, setAbaModal] = useState<AbaFuncModal>("pessoais");
  /** No modal Visualizar: false = dados sensíveis com blur (ocultar). */
  const [modalVerExibirSensiveis, setModalVerExibirSensiveis] = useState(false);
  const [tabelaSalarioVisivel, setTabelaSalarioVisivel] = useState(false);
  const [cepBuscaEmAndamento, setCepBuscaEmAndamento] = useState<null | "res" | "emp">(null);

  const [acaoModalRow, setAcaoModalRow] = useState<RhFuncionario | null>(null);
  const [acaoTipo, setAcaoTipo] = useState<"" | RhHistoricoAcaoTipo>("");
  const [acaoSalvando, setAcaoSalvando] = useState(false);
  const [acaoForm, setAcaoForm] = useState<FormState>(estadoVazioForm);
  const acaoBaselineRef = useRef<SliceContratacao | null>(null);
  const [acaoDtSaida, setAcaoDtSaida] = useState("");
  const [acaoDtRetorno, setAcaoDtRetorno] = useState("");
  const [acaoDtTermino, setAcaoDtTermino] = useState("");
  const [acaoTipoTermino, setAcaoTipoTermino] = useState<"" | RhTipoTerminoPrestacao>("");
  const [acaoObs, setAcaoObs] = useState("");
  const [acaoFiles, setAcaoFiles] = useState<File[]>([]);
  const [histModalRow, setHistModalRow] = useState<RhFuncionario | null>(null);
  const [histModalItems, setHistModalItems] = useState<RhFuncionarioHistorico[]>([]);
  const [histModalLoading, setHistModalLoading] = useState(false);

  const [rhTalksOpen, setRhTalksOpen] = useState(false);
  const [rtAssunto, setRtAssunto] = useState("");
  const [rtData, setRtData] = useState("");
  const [rtAta, setRtAta] = useState("");
  const [rtBusca, setRtBusca] = useState("");
  const [rtParticipantes, setRtParticipantes] = useState<RhFuncionario[]>([]);
  const [rtFiles, setRtFiles] = useState<File[]>([]);
  const [rtSalvando, setRtSalvando] = useState(false);

  const [anotacaoModalRow, setAnotacaoModalRow] = useState<RhFuncionario | null>(null);
  const [anVisibilidade, setAnVisibilidade] = useState<"Particular" | "Publico">("Publico");
  const [anAssunto, setAnAssunto] = useState("");
  const [anData, setAnData] = useState("");
  const [anAta, setAnAta] = useState("");
  const [anFiles, setAnFiles] = useState<File[]>([]);
  const [anSalvando, setAnSalvando] = useState(false);

  const [prestadorExcluirConfirm, setPrestadorExcluirConfirm] = useState<RhFuncionario | null>(null);
  const [excluindoPrestador, setExcluindoPrestador] = useState(false);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  useEffect(() => {
    if (permOrg.loading || permOrg.canView === "nao") {
      setOpcoesTimes([]);
      setOrganogramaGrupos([]);
      return;
    }
    let cancel = false;
    void (async () => {
      const { opcoes, grupos, error } = await carregarOpcoesTimesOrganograma();
      if (cancel) return;
      if (error) {
        setOpcoesTimes([]);
        setOrganogramaGrupos([]);
      } else {
        setOpcoesTimes(opcoes);
        setOrganogramaGrupos(grupos);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [permOrg.loading, permOrg.canView]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    const { data, error } = await supabase.from("rh_funcionarios").select("*").order("nome", { ascending: true }).limit(5000);
    if (error) setErroGlobal(error.message);
    setLista((data ?? []) as RhFuncionario[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setSortPrestadores({ col: "nome", dir: "asc" });
  }, [abaPagina]);

  useEffect(() => {
    if (!sucessoMsg) return;
    const id = window.setTimeout(() => setSucessoMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [sucessoMsg]);

  useEffect(() => {
    if (!histModalRow) {
      setHistModalItems([]);
      return;
    }
    setHistModalLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("rh_funcionario_historico")
        .select("*")
        .eq("rh_funcionario_id", histModalRow.id)
        .order("created_at", { ascending: false });
      if (error) setHistModalItems([]);
      else setHistModalItems((data ?? []) as RhFuncionarioHistorico[]);
      setHistModalLoading(false);
    })();
  }, [histModalRow]);

  useEffect(() => {
    if (!acaoModalRow) return;
    if (acaoTipo !== "revisao_contrato" && acaoTipo !== "reativacao_prestacao") return;
    setAcaoForm(formDeFuncionario(acaoModalRow));
    acaoBaselineRef.current = sliceContratacaoDeRow(acaoModalRow);
  }, [acaoTipo, acaoModalRow]);

  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    lista.forEach((r) => {
      if (r.setor.trim()) s.add(r.setor.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lista]);

  const opcoesVinculoFlat = useMemo(() => flattenVinculosDeGrupos(organogramaGrupos), [organogramaGrupos]);

  const diretoriasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesVinculoFlat.forEach((v) => u.add(v.diretoriaNome));
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesVinculoFlat]);

  const gerenciasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesVinculoFlat.forEach((v) => {
      if (!v.gerenciaNome) return;
      if (filtroDiretoria && v.diretoriaNome !== filtroDiretoria) return;
      u.add(v.gerenciaNome);
    });
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesVinculoFlat, filtroDiretoria]);

  useEffect(() => {
    if (filtroGerencia && !gerenciasOpcoes.includes(filtroGerencia)) setFiltroGerencia("");
  }, [filtroGerencia, gerenciasOpcoes]);

  const usarSelectOrganograma = useMemo(
    () => permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0,
    [permOrg.canView, permOrg.loading, opcoesVinculoFlat.length],
  );

  const opcaoOrgSelecionada = useMemo(
    () =>
      encontrarVinculoParaFuncionarioRow(
        {
          org_time_id: form.org_time_id,
          org_gerencia_id: form.org_gerencia_id,
          org_diretoria_id: form.org_diretoria_id,
        },
        opcoesVinculoFlat,
      ),
    [form.org_diretoria_id, form.org_gerencia_id, form.org_time_id, opcoesVinculoFlat],
  );

  const opcaoOrgAcaoForm = useMemo(
    () =>
      encontrarVinculoParaFuncionarioRow(
        {
          org_time_id: acaoForm.org_time_id,
          org_gerencia_id: acaoForm.org_gerencia_id,
          org_diretoria_id: acaoForm.org_diretoria_id,
        },
        opcoesVinculoFlat,
      ),
    [acaoForm.org_diretoria_id, acaoForm.org_gerencia_id, acaoForm.org_time_id, opcoesVinculoFlat],
  );

  const ehPJ = form.tipo_contrato === "PJ";
  const isEstudioContratacao = form.area_atuacao === "estudio";

  const abasModalDef = useMemo(() => {
    const tabs: { key: AbaFuncModal; label: string }[] = [
      { key: "pessoais", label: "Dados pessoais" },
      { key: "contratacao", label: "Dados de contratação" },
    ];
    if (ehPJ) tabs.push({ key: "empresa", label: "Dados da empresa" });
    tabs.push({ key: "bancarios", label: "Dados bancários" });
    if (modalForm === "editar" || modalForm === "ver") {
      tabs.push({ key: "documentos", label: "Documentos" });
    }
    return tabs;
  }, [ehPJ, modalForm]);

  useEffect(() => {
    if (modalForm === "fechado") return;
    const keys = abasModalDef.map((x) => x.key);
    if (!keys.includes(abaModal)) setAbaModal(keys[0] ?? "pessoais");
  }, [modalForm, abasModalDef, abaModal]);

  const errosPorAbaModal = useMemo(() => {
    const c: Record<AbaFuncModal, number> = {
      pessoais: 0,
      contratacao: 0,
      empresa: 0,
      bancarios: 0,
      documentos: 0,
    };
    for (const k of Object.keys(fieldErr)) {
      c[abaDoCampoRhModal(k, ehPJ)] += 1;
    }
    return c;
  }, [fieldErr, ehPJ]);

  const filtrada = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const digits = somenteDigitos(busca);
    return lista.filter((r) => {
      if (filtroStatus === "disponiveis") {
        if (r.status === "encerrado") return false;
      } else if (r.status !== filtroStatus) return false;
      if (filtroContrato !== "todos" && r.tipo_contrato !== filtroContrato) return false;
      if (filtroSetor && r.setor.trim() !== filtroSetor) return false;
      if (filtroDiretoria) {
        const o = encontrarVinculoParaFuncionarioRow(r, opcoesVinculoFlat);
        if (!o || o.diretoriaNome !== filtroDiretoria) return false;
      }
      if (filtroGerencia) {
        const o = encontrarVinculoParaFuncionarioRow(r, opcoesVinculoFlat);
        if (!o || o.gerenciaNome !== filtroGerencia) return false;
      }
      if (!b) return true;
      if (digits.length === 11 && r.cpf === digits) return true;
      if (r.nome.toLowerCase().includes(b)) return true;
      if (r.email.toLowerCase().includes(b)) return true;
      if (r.cpf.includes(digits) && digits.length >= 3) return true;
      return false;
    });
  }, [lista, busca, filtroSetor, filtroContrato, filtroStatus, filtroDiretoria, filtroGerencia, opcoesVinculoFlat]);

  const resumoPrestadoresCards = useMemo(() => {
    const temOrganograma = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
    const total = filtrada.length;
    let ativo = 0;
    let indisponivel = 0;
    let encerrado = 0;
    for (const r of filtrada) {
      if (r.status === "ativo") ativo += 1;
      else if (r.status === "indisponivel") indisponivel += 1;
      else encerrado += 1;
    }
    const incompletos = filtrada.filter((r) => prestadorCadastroIncompleto(r, temOrganograma));
    return { total, porStatus: { ativo, indisponivel, encerrado }, incompletos };
  }, [filtrada, permOrg.canView, permOrg.loading, opcoesVinculoFlat.length]);

  const sugestoesParticipantesRhTalks = useMemo(() => {
    const q = rtBusca.trim().toLowerCase();
    if (!q) return [];
    const ids = new Set(rtParticipantes.map((p) => p.id));
    return lista
      .filter((f) => !ids.has(f.id))
      .filter((f) => f.nome.toLowerCase().includes(q))
      .slice(0, 12);
  }, [lista, rtBusca, rtParticipantes]);

  const abrirNovo = () => {
    setForm(estadoVazioForm());
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(null);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("novo");
  };

  const abrirEditar = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("editar");
  };

  const abrirVer = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("ver");
  };

  const orgMetaLinha = useCallback(
    (row: RhFuncionario) => {
      const o = encontrarVinculoParaFuncionarioRow(row, opcoesVinculoFlat);
      if (o) {
        return {
          diretoria: o.diretoriaNome,
          gerencia: o.nivel === "diretoria" ? "—" : o.gerenciaNome || "—",
        };
      }
      if (row.org_time_id) {
        const t = opcoesTimes.find((x) => x.timeId === row.org_time_id);
        if (t) return { diretoria: t.diretoriaNome, gerencia: t.gerenciaNome };
      }
      return { diretoria: "—", gerencia: "—" };
    },
    [opcoesTimes, opcoesVinculoFlat],
  );

  const liderImediatoLinha = useCallback(
    (row: RhFuncionario) => {
      const o = encontrarVinculoParaFuncionarioRow(row, opcoesVinculoFlat);
      if (o) return o.gestorNome;
      if (row.org_time_id) return opcoesTimes.find((x) => x.timeId === row.org_time_id)?.gestorNome ?? "—";
      return "—";
    },
    [opcoesTimes, opcoesVinculoFlat],
  );

  const onSortPrestadores = useCallback((col: PrestadoresSortCol) => {
    setSortPrestadores((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  }, []);

  const filtradaOrdenada = useMemo(() => {
    const { col, dir } = sortPrestadores;
    const mult = dir === "asc" ? 1 : -1;
    const rows = [...filtrada];
    rows.sort((a, b) => {
      switch (col) {
        case "nome":
          return mult * a.nome.localeCompare(b.nome, "pt-BR");
        case "diretoria": {
          const ad = orgMetaLinha(a).diretoria;
          const bd = orgMetaLinha(b).diretoria;
          return mult * ad.localeCompare(bd, "pt-BR");
        }
        case "gerencia": {
          const ag = orgMetaLinha(a).gerencia;
          const bg = orgMetaLinha(b).gerencia;
          return mult * ag.localeCompare(bg, "pt-BR");
        }
        case "cargo":
          return mult * a.cargo.localeCompare(b.cargo, "pt-BR");
        case "lider":
          return mult * liderImediatoLinha(a).localeCompare(liderImediatoLinha(b), "pt-BR");
        case "salario":
          return mult * (Number(a.salario) - Number(b.salario));
        case "status": {
          const ord: Record<string, number> = { ativo: 0, indisponivel: 1, encerrado: 2 };
          const oa = ord[a.status] ?? 99;
          const ob = ord[b.status] ?? 99;
          if (oa !== ob) return mult * (oa - ob);
          return mult * a.nome.localeCompare(b.nome, "pt-BR");
        }
        default:
          return 0;
      }
    });
    return rows;
  }, [filtrada, sortPrestadores, orgMetaLinha, liderImediatoLinha]);

  const inserirHistorico = useCallback(
    async (
      funcionarioId: string,
      tipo: string,
      detalhes: Record<string, unknown>,
      anexos: { name: string; path: string; publicUrl: string }[],
    ) => {
      const { error } = await supabase.from("rh_funcionario_historico").insert({
        rh_funcionario_id: funcionarioId,
        tipo,
        detalhes: { ...detalhes, usuario_label: user?.email ?? String(user?.id ?? "—") },
        anexos,
      });
      return error;
    },
    [user?.email, user?.id],
  );

  const fecharModalRegistrarAcao = () => {
    if (acaoSalvando) return;
    setAcaoModalRow(null);
    setAcaoTipo("");
    setAcaoDtSaida("");
    setAcaoDtRetorno("");
    setAcaoDtTermino("");
    setAcaoTipoTermino("");
    setAcaoObs("");
    setAcaoFiles([]);
    acaoBaselineRef.current = null;
    setAcaoForm(estadoVazioForm());
  };

  const abrirModalRegistrarAcao = (row: RhFuncionario) => {
    setAcaoModalRow(row);
    setAcaoTipo("");
    setAcaoDtSaida("");
    setAcaoDtRetorno("");
    setAcaoDtTermino("");
    setAcaoTipoTermino("");
    setAcaoObs("");
    setAcaoFiles([]);
    acaoBaselineRef.current = null;
    setAcaoForm(formDeFuncionario(row));
  };

  const fecharModalHistorico = () => {
    setHistModalRow(null);
    setHistModalItems([]);
  };

  const abrirModalHistorico = (row: RhFuncionario) => {
    setHistModalRow(row);
  };

  const fecharModalRhTalks = () => {
    if (rtSalvando) return;
    setRhTalksOpen(false);
    setRtAssunto("");
    setRtData("");
    setRtAta("");
    setRtBusca("");
    setRtParticipantes([]);
    setRtFiles([]);
  };

  const abrirModalRhTalks = () => {
    setRhTalksOpen(true);
    setRtAssunto("");
    setRtData("");
    setRtAta("");
    setRtBusca("");
    setRtParticipantes([]);
    setRtFiles([]);
  };

  const fecharModalRegistrarAnotacao = () => {
    if (anSalvando) return;
    setAnotacaoModalRow(null);
    setAnVisibilidade("Publico");
    setAnAssunto("");
    setAnData("");
    setAnAta("");
    setAnFiles([]);
  };

  const abrirModalRegistrarAnotacao = (row: RhFuncionario) => {
    setAnotacaoModalRow(row);
    setAnVisibilidade("Publico");
    setAnAssunto("");
    setAnData("");
    setAnAta("");
    setAnFiles([]);
  };

  const salvarRhTalks = async () => {
    if (!perm.canEditarOk) {
      setErroGlobal("Sem permissão para registrar.");
      return;
    }
    const assunto = rtAssunto.trim();
    const ata = rtAta.trim();
    if (!assunto) {
      setErroGlobal("Informe o assunto do RH Talks.");
      return;
    }
    if (!rtData.trim()) {
      setErroGlobal("Informe a data do RH Talks.");
      return;
    }
    if (rtParticipantes.length === 0) {
      setErroGlobal("Adicione pelo menos um participante.");
      return;
    }
    if (!ata) {
      setErroGlobal("Informe a ata da reunião.");
      return;
    }
    setRtSalvando(true);
    setErroGlobal(null);
    try {
      let anexosDb: { name: string; path: string; publicUrl: string }[] = [];
      if (rtFiles.length > 0) {
        const firstId = rtParticipantes[0]!.id;
        const up = await uploadAnexosAcaoRh(firstId, rtFiles);
        if (!up.ok) {
          setErroGlobal(up.message);
          setRtSalvando(false);
          return;
        }
        anexosDb = up.anexos;
      }
      const participantesPayload = rtParticipantes.map((p) => ({ id: p.id, nome: p.nome.trim() || p.nome }));
      const detalhes: Record<string, unknown> = {
        assunto,
        data_rh_talks: rtData.trim().slice(0, 10),
        ata,
        participantes: participantesPayload,
      };
      for (const p of rtParticipantes) {
        const err = await inserirHistorico(p.id, "rh_talks", detalhes, anexosDb);
        if (err) throw err;
      }
      setSucessoMsg("RH Talks registrado para os participantes.");
      fecharModalRhTalks();
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErroGlobal(msg);
    } finally {
      setRtSalvando(false);
    }
  };

  const salvarAnotacaoRh = async () => {
    if (!anotacaoModalRow || !perm.canEditarOk) {
      setErroGlobal(anotacaoModalRow ? "Sem permissão para registrar." : "Selecione um prestador.");
      return;
    }
    const assunto = anAssunto.trim();
    const ata = anAta.trim();
    if (!assunto) {
      setErroGlobal("Informe o assunto.");
      return;
    }
    if (!anData.trim()) {
      setErroGlobal("Informe a data da conversa.");
      return;
    }
    if (!ata) {
      setErroGlobal("Informe a ata da reunião.");
      return;
    }
    setAnSalvando(true);
    setErroGlobal(null);
    const fid = anotacaoModalRow.id;
    try {
      let anexosDb: { name: string; path: string; publicUrl: string }[] = [];
      if (anFiles.length > 0) {
        const up = await uploadAnexosAcaoRh(fid, anFiles);
        if (!up.ok) {
          setErroGlobal(up.message);
          setAnSalvando(false);
          return;
        }
        anexosDb = up.anexos;
      }
      const tipoLabel = anVisibilidade === "Particular" ? "Particular" : "Público";
      const detalhes: Record<string, unknown> = {
        tipo_visibilidade: tipoLabel,
        assunto,
        data_conversa: anData.trim().slice(0, 10),
        ata_reuniao: ata,
      };
      const err = await inserirHistorico(fid, "anotacao_rh", detalhes, anexosDb);
      if (err) throw err;
      setSucessoMsg("Anotação registrada.");
      fecharModalRegistrarAnotacao();
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErroGlobal(msg);
    } finally {
      setAnSalvando(false);
    }
  };

  const handleCepBlur = (qual: "res" | "emp", cepRaw: string) => {
    void (async () => {
      const d = somenteDigitos(cepRaw);
      if (d.length !== 8) return;
      setCepBuscaEmAndamento(qual);
      const r = await buscarEnderecoPorCep(cepRaw);
      setCepBuscaEmAndamento(null);
      if (!r.ok) {
        setErroGlobal(r.message);
        return;
      }
      setErroGlobal(null);
      if (qual === "res") {
        setForm((s) => ({
          ...s,
          res_logradouro: s.res_logradouro.trim() || r.logradouro,
          res_cidade: s.res_cidade.trim() || r.cidade,
          res_estado: (s.res_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      } else {
        setForm((s) => ({
          ...s,
          emp_logradouro: s.emp_logradouro.trim() || r.logradouro,
          emp_cidade: s.emp_cidade.trim() || r.cidade,
          emp_estado: (s.emp_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      }
    })();
  };

  /** Só quando há texto e a escala não está na lista permitida (cadastro legado). */
  function msgEscalaLegadaInvalida(): string {
    const leg = form.escala.trim();
    return `A escala «${leg}» já não é aceita. Escolha 5x2, 3x3, 4x2 ou 5x1.`;
  }

  function obterErrosFormulario(): Record<string, string> {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, label: string, v: string) => {
      if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
    };

    const usarOrg = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
    const temOrgVinculo = Boolean(form.org_time_id || form.org_gerencia_id || form.org_diretoria_id);

    /** Novo prestador: só os campos mínimos; demais na edição posterior. */
    if (modalForm === "novo") {
      req("nome", "Nome completo", form.nome);
      req("rg", "RG", form.rg);
      req("telefone", "Telefone", form.telefone);
      req("email", "E-mail", form.email);
      if (usarOrg) {
        if (!temOrgVinculo) e.org_time_id = "Selecione o organograma.";
      } else {
        req("setor", "Setor", form.setor);
      }
      req("cargo", "Função", form.cargo);
      req("nivel", "Nível", form.nivel);
      req("data_inicio", "Data de início", form.data_inicio);
      if (form.area_atuacao !== "estudio" && form.area_atuacao !== "escritorio") {
        e.area_atuacao = "Selecione a área de atuação.";
      }
      if (!form.escala.trim()) e.escala = "Escala é obrigatória.";
      else if (!escalaEhPermitida(form.escala)) e.escala = msgEscalaLegadaInvalida();

      const cpfD = somenteDigitos(form.cpf);
      if (cpfD.length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
      else if (!validarCpfDigitos(cpfD)) e.cpf = "CPF inválido.";

      if (form.email.trim() && !validarEmail(form.email)) e.email = "E-mail inválido.";
      if (form.email_spin.trim() && !validarEmail(form.email_spin.trim())) {
        e.email_spin = "E-mail Spin inválido.";
      }

      const telD = somenteDigitos(form.telefone);
      if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";

      if (podeVerDadosSensiveis) {
        if (form.area_atuacao === "estudio") {
          const rh = numeroDeCentavosStr(form.remuneracaoHoraCentavos);
          if (rh <= 0) e.remuneracaoHoraCentavos = "Informe a remuneração por hora.";
          if (!form.staff_turno.trim()) e.staff_turno = "Selecione o turno.";
        } else if (form.area_atuacao === "escritorio") {
          const sal = numeroDeCentavosStr(form.salarioCentavos);
          if (sal <= 0) e.salarioCentavos = "Informe a remuneração mensal.";
        }
      }

      return e;
    }

    req("nome", "Nome completo", form.nome);
    req("rg", "RG", form.rg);
    req("telefone", "Telefone", form.telefone);
    req("email", "E-mail", form.email);
    req("res_logradouro", "Logradouro (residencial)", form.res_logradouro);
    req("res_numero", "Número (residencial)", form.res_numero);
    req("res_cidade", "Cidade (residencial)", form.res_cidade);
    if (!form.res_estado.trim()) e.res_estado = "UF (residencial) é obrigatória.";
    else if (!UFS_BR.includes(form.res_estado.trim().toUpperCase() as (typeof UFS_BR)[number])) {
      e.res_estado = "UF inválida.";
    }
    const cepRes = somenteDigitos(form.res_cep);
    if (cepRes.length > 0 && cepRes.length !== 8) e.res_cep = "CEP residencial deve ter 8 dígitos.";
    req("emerg_nome", "Nome do contato de emergência", form.emerg_nome);
    req("emerg_telefone", "Telefone do contato de emergência", form.emerg_telefone);
    if (usarOrg) {
      if (!temOrgVinculo && !form.setor.trim()) {
        e.setor = "Informe o setor ou selecione um nível do organograma.";
      }
    } else {
      req("setor", "Setor", form.setor);
    }
    req("cargo", "Função", form.cargo);
    req("nivel", "Nível", form.nivel);
    req("data_inicio", "Data de início", form.data_inicio);
    if (!form.escala.trim()) e.escala = "Escala é obrigatória.";
    else if (!escalaEhPermitida(form.escala)) e.escala = msgEscalaLegadaInvalida();
    if (form.tipo_contrato === "PJ") {
      req("nome_empresa", "Nome da empresa", form.nome_empresa);
      req("emp_logradouro", "Logradouro da empresa", form.emp_logradouro);
      req("emp_numero", "Número da empresa", form.emp_numero);
      req("emp_cidade", "Cidade da empresa", form.emp_cidade);
      if (!form.emp_estado.trim()) e.emp_estado = "UF da empresa é obrigatória.";
      else if (!UFS_BR.includes(form.emp_estado.trim().toUpperCase() as (typeof UFS_BR)[number])) {
        e.emp_estado = "UF inválida.";
      }
      const cepEmp = somenteDigitos(form.emp_cep);
      if (cepEmp.length > 0 && cepEmp.length !== 8) e.emp_cep = "CEP da empresa deve ter 8 dígitos.";
    }
    if (podeVerDadosSensiveis) {
      req("banco", "Banco", form.banco);
      req("agencia", "Agência", form.agencia);
      req("conta_corrente", "Conta corrente", form.conta_corrente);
      req("pix", "PIX", form.pix);
    }

    const cpfD = somenteDigitos(form.cpf);
    if (cpfD.length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
    else if (!validarCpfDigitos(cpfD)) e.cpf = "CPF inválido.";

    if (form.tipo_contrato === "PJ") {
      const cnpjD = somenteDigitos(form.cnpj);
      if (cnpjD.length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
      else if (!validarCnpjDigitos(cnpjD)) e.cnpj = "CNPJ inválido.";
    }

    if (form.email.trim() && !validarEmail(form.email)) e.email = "E-mail inválido.";
    if (form.email_spin.trim() && !validarEmail(form.email_spin.trim())) {
      e.email_spin = "E-mail Spin inválido.";
    }

    const telD = somenteDigitos(form.telefone);
    if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";

    const telEmerg = somenteDigitos(form.emerg_telefone);
    if (telEmerg.length < 10 || telEmerg.length > 11) e.emerg_telefone = "Telefone de emergência inválido.";

    if (podeVerDadosSensiveis) {
      if (form.area_atuacao === "estudio") {
        const rh = numeroDeCentavosStr(form.remuneracaoHoraCentavos);
        if (rh <= 0) e.remuneracaoHoraCentavos = "Informe a remuneração por hora.";
        if (!form.staff_turno.trim()) e.staff_turno = "Selecione o turno.";
      } else {
        const sal = numeroDeCentavosStr(form.salarioCentavos);
        if (sal <= 0) e.salarioCentavos = "Informe a remuneração mensal.";
      }
    }

    return e;
  }

  const montarPayload = (statusPrestador: RhFuncionario["status"]) =>
    buildRhFuncionarioPayloadFromState(form, statusPrestador, podeVerDadosSensiveis, modalForm === "novo");

  const salvar = async (opts?: { outro?: boolean }) => {
    if (modalForm === "ver") return;
    setAlertaValidacaoModal(null);
    const errosVal = obterErrosFormulario();
    if (Object.keys(errosVal).length > 0) {
      setFieldErr(errosVal);
      const ordemAbas = abasModalDef.map((tb) => tb.key);
      for (const aba of ordemAbas) {
        if (Object.keys(errosVal).some((k) => abaDoCampoRhModal(k, ehPJ) === aba)) {
          setAbaModal(aba);
          break;
        }
      }
      const n = Object.keys(errosVal).length;
      const linhas = Object.values(errosVal).map((msg) => `• ${msg}`);
      setAlertaValidacaoModal(
        `Não foi possível salvar (${n} ${n === 1 ? "pendência" : "pendências"}). Revise os campos destacados abaixo:\n${linhas.join("\n")}`,
      );
      return;
    }
    setFieldErr({});
    setSalvando(true);
    setErroGlobal(null);
    const payload = montarPayload("ativo");
    const cadastrarOutro = opts?.outro === true;

    if (modalForm === "novo") {
      const { data: criado, error } = await supabase.from("rh_funcionarios").insert(payload).select("*").single();
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      if (criado) await syncGamePresenterDealerFromRhFuncionario(criado as RhFuncionario);
      setSucessoMsg("Funcionário cadastrado.");
      await carregar();
      if (cadastrarOutro) {
        setForm(estadoVazioForm());
        setFieldErr({});
        setAlertaValidacaoModal(null);
        setAbaModal("pessoais");
      } else {
        setModalForm("fechado");
        setAbaModal("pessoais");
        setAlertaValidacaoModal(null);
      }
      return;
    }

    if (modalForm === "editar" && editId) {
      const atual = lista.find((x) => x.id === editId);
      const payloadEdit = montarPayload(atual?.status ?? "ativo");
      const salarioFinal = podeVerDadosSensiveis ? payloadEdit.salario : (atual?.salario ?? 0);
      const mesclado =
        !podeVerDadosSensiveis && atual
          ? {
              ...payloadEdit,
              salario: salarioFinal,
              area_atuacao: atual.area_atuacao ?? "escritorio",
              remuneracao_hora_centavos: atual.remuneracao_hora_centavos ?? null,
              staff_turno: atual.staff_turno ?? null,
              banco: atual.banco,
              agencia: atual.agencia,
              conta_corrente: atual.conta_corrente,
              pix: atual.pix,
            }
          : { ...payloadEdit, salario: salarioFinal };
      const { data: atualizadoRh, error } = await supabase.from("rh_funcionarios").update(mesclado).eq("id", editId).select("*").single();
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      if (atualizadoRh) await syncGamePresenterDealerFromRhFuncionario(atualizadoRh as RhFuncionario);
      setSucessoMsg("Dados atualizados.");
      setModalForm("fechado");
      setAbaModal("pessoais");
      setAlertaValidacaoModal(null);
      await carregar();
      return;
    }

    setSalvando(false);
    if (modalForm === "editar" && !editId) {
      setErroGlobal("Não foi possível identificar o registo a atualizar. Feche o modal e abra novamente.");
    }
  };

  const salvarAcaoRh = async () => {
    if (!acaoModalRow || !acaoTipo) {
      setErroGlobal("Selecione o tipo de ação.");
      return;
    }
    setAcaoSalvando(true);
    setErroGlobal(null);
    const fid = acaoModalRow.id;
    let anexosDb: { name: string; path: string; publicUrl: string }[] = [];
    if (acaoFiles.length > 0 && acaoTipo !== "reativacao_prestacao") {
      const up = await uploadAnexosAcaoRh(fid, acaoFiles);
      if (!up.ok) {
        setErroGlobal(up.message);
        setAcaoSalvando(false);
        return;
      }
      anexosDb = up.anexos;
    }
    const fmtSal = (c: string) => fmtBRL(numeroDeCentavosStr(c));
    try {
      switch (acaoTipo) {
        case "revisao_contrato": {
          const usarST = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
          const temOrgAcao = Boolean(acaoForm.org_time_id || acaoForm.org_gerencia_id || acaoForm.org_diretoria_id);
          if (usarST && !temOrgAcao) {
            setErroGlobal("Selecione o organograma.");
            setAcaoSalvando(false);
            return;
          }
          if (!usarST && !acaoForm.setor.trim()) {
            setErroGlobal("Informe o setor.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.cargo.trim() || !acaoForm.nivel.trim() || !acaoForm.escala.trim()) {
            setErroGlobal("Preencha função, nível e escala.");
            setAcaoSalvando(false);
            return;
          }
          if (!escalaEhPermitida(acaoForm.escala)) {
            setErroGlobal("Selecione uma escala válida: 5x2, 3x3, 4x2 ou 5x1.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.data_funcao.trim()) {
            setErroGlobal("Informe a data da Função.");
            setAcaoSalvando(false);
            return;
          }
          const areaAc: RhAreaAtuacao =
            acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
              ? acaoForm.area_atuacao
              : "escritorio";
          const isEstudioAc = areaAc === "estudio";
          if (podeVerDadosSensiveis) {
            if (isEstudioAc) {
              if (numeroDeCentavosStr(acaoForm.remuneracaoHoraCentavos) <= 0) {
                setErroGlobal("Informe a remuneração por hora.");
                setAcaoSalvando(false);
                return;
              }
              if (!acaoForm.staff_turno.trim()) {
                setErroGlobal("Selecione o turno.");
                setAcaoSalvando(false);
                return;
              }
            } else if (numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
              setErroGlobal("Informe a remuneração mensal.");
              setAcaoSalvando(false);
              return;
            }
          }
          if (acaoForm.email_spin.trim() && !validarEmail(acaoForm.email_spin.trim())) {
            setErroGlobal("E-mail Spin inválido.");
            setAcaoSalvando(false);
            return;
          }
          const antes = acaoBaselineRef.current ?? sliceContratacaoDeRow(acaoModalRow);
          const depois = sliceContratacaoDeForm(acaoForm);
          const diff = diffContratacaoSlices(antes, depois, opcoesVinculoFlat, opcoesTimes, fmtSal);
          if (diff.length === 0) {
            setErroGlobal("Nenhuma alteração para registrar.");
            setAcaoSalvando(false);
            return;
          }
          const sal = !podeVerDadosSensiveis
            ? acaoModalRow.salario
            : isEstudioAc
              ? 0
              : numeroDeCentavosStr(acaoForm.salarioCentavos);
          const remuneracao_hora_centavos = !podeVerDadosSensiveis
            ? acaoModalRow.remuneracao_hora_centavos ?? null
            : isEstudioAc
              ? numeroDeCentavosStr(acaoForm.remuneracaoHoraCentavos)
              : null;
          const staff_turno = !podeVerDadosSensiveis
            ? acaoModalRow.staff_turno ?? null
            : isEstudioAc
              ? acaoForm.staff_turno.trim() || null
              : null;
          const df = acaoForm.data_funcao.trim().slice(0, 10);
          const { error: eUp } = await supabase
            .from("rh_funcionarios")
            .update({
              org_diretoria_id: acaoForm.org_diretoria_id || null,
              org_gerencia_id: acaoForm.org_gerencia_id || null,
              org_time_id: acaoForm.org_time_id || null,
              setor: acaoForm.setor.trim(),
              cargo: acaoForm.cargo.trim(),
              nivel: acaoForm.nivel.trim(),
              area_atuacao: areaAc,
              remuneracao_hora_centavos,
              staff_turno,
              salario: sal,
              tipo_contrato: acaoForm.tipo_contrato,
              escala: acaoForm.escala.trim(),
              data_funcao: df,
              email_spin: acaoForm.email_spin.trim() ? acaoForm.email_spin.trim().toLowerCase() : null,
            })
            .eq("id", fid);
          if (eUp) throw eUp;
          const errH = await inserirHistorico(fid, "revisao_contrato", { alteracoes: diff }, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "periodo_indisponibilidade": {
          if (!acaoDtSaida.trim()) {
            setErroGlobal("Informe a data de saída.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoDtRetorno.trim()) {
            setErroGlobal("Informe a data de retorno.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          if (acaoDtRetorno < acaoDtSaida) {
            setErroGlobal("A data de retorno não pode ser anterior à data de saída.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ status: "indisponivel" }).eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = { data_saida: acaoDtSaida, data_retorno: acaoDtRetorno.trim(), observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "periodo_indisponibilidade", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "retorno_indisponibilidade": {
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ status: "ativo" }).eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = { observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "retorno_indisponibilidade", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "termino_prestacao": {
          if (!acaoDtTermino.trim()) {
            setErroGlobal("Informe a data de término.");
            setAcaoSalvando(false);
            return;
          }
          if (acaoTipoTermino !== "voluntario" && acaoTipoTermino !== "nao_voluntario") {
            setErroGlobal("Selecione o tipo de término.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase
            .from("rh_funcionarios")
            .update({ status: "encerrado", data_desligamento: acaoDtTermino })
            .eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = {
            data_termino: acaoDtTermino,
            tipo_termino: acaoTipoTermino,
            observacao: acaoObs.trim(),
          };
          const errH = await inserirHistorico(fid, "termino_prestacao", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "alinhamento_formal": {
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const det: Record<string, unknown> = { observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "alinhamento_formal", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "reativacao_prestacao": {
          const usarSTR = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
          const temOrgReat = Boolean(acaoForm.org_time_id || acaoForm.org_gerencia_id || acaoForm.org_diretoria_id);
          if (usarSTR && !temOrgReat) {
            setErroGlobal("Selecione o organograma.");
            setAcaoSalvando(false);
            return;
          }
          if (!usarSTR && !acaoForm.setor.trim()) {
            setErroGlobal("Informe o setor.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.cargo.trim() || !acaoForm.nivel.trim() || !acaoForm.escala.trim() || !acaoForm.data_inicio.trim()) {
            setErroGlobal("Preencha função, nível, escala e data de início.");
            setAcaoSalvando(false);
            return;
          }
          if (!escalaEhPermitida(acaoForm.escala)) {
            setErroGlobal("Selecione uma escala válida: 5x2, 3x3, 4x2 ou 5x1.");
            setAcaoSalvando(false);
            return;
          }
          if (!(acaoForm.observacao_rh ?? "").trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          if (podeVerDadosSensiveis) {
            const areaReat: RhAreaAtuacao =
              acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
                ? acaoForm.area_atuacao
                : "escritorio";
            if (areaReat === "estudio") {
              if (numeroDeCentavosStr(acaoForm.remuneracaoHoraCentavos) <= 0) {
                setErroGlobal("Informe a remuneração por hora.");
                setAcaoSalvando(false);
                return;
              }
              if (!acaoForm.staff_turno.trim()) {
                setErroGlobal("Selecione o turno.");
                setAcaoSalvando(false);
                return;
              }
            } else if (numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
              setErroGlobal("Informe a remuneração mensal.");
              setAcaoSalvando(false);
              return;
            }
          }
          const rowAntes = lista.find((x) => x.id === fid) ?? acaoModalRow;
          const base = buildRhFuncionarioPayloadFromState(acaoForm, "ativo", podeVerDadosSensiveis);
          const mesclado =
            !podeVerDadosSensiveis && acaoModalRow
              ? {
                  ...base,
                  salario: acaoModalRow.salario,
                  banco: acaoModalRow.banco,
                  agencia: acaoModalRow.agencia,
                  conta_corrente: acaoModalRow.conta_corrente,
                  pix: acaoModalRow.pix,
                }
              : base;
          const antes = acaoBaselineRef.current ?? sliceContratacaoDeRow(acaoModalRow);
          const depois = sliceContratacaoDeForm(acaoForm);
          const diffContrato = diffContratacaoSlices(antes, depois, opcoesVinculoFlat, opcoesTimes, fmtSal);
          const obsAntes = (rowAntes.observacao_rh ?? "").trim();
          const obsDepois = (acaoForm.observacao_rh ?? "").trim();
          const alteracoesReativacao: { campo: string; antes: string; depois: string }[] = [
            {
              campo: "Status",
              antes: labelStatusPrestador(rowAntes.status),
              depois: labelStatusPrestador("ativo"),
            },
          ];
          if (rowAntes.data_desligamento && String(rowAntes.data_desligamento).trim()) {
            alteracoesReativacao.push({
              campo: "Data de desligamento",
              antes: fmtDataIsoPtBr(rowAntes.data_desligamento),
              depois: "—",
            });
          }
          if (obsAntes !== obsDepois) {
            alteracoesReativacao.push({
              campo: "Observação",
              antes: obsAntes || "—",
              depois: obsDepois || "—",
            });
          }
          const diff = [...alteracoesReativacao, ...diffContrato];
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ ...mesclado, data_desligamento: null }).eq("id", fid);
          if (eUp) throw eUp;
          const errH = await inserirHistorico(fid, "reativacao_prestacao", { alteracoes: diff }, []);
          if (errH) throw errH;
          break;
        }
        default:
          break;
      }
      setSucessoMsg("Ação registrada.");
      fecharModalRegistrarAcao();
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErroGlobal(msg);
    } finally {
      setAcaoSalvando(false);
    }
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, overflow: "hidden", boxShadow: cardShadow }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <caption style={{ display: "none" }}>Carregando gestão de prestadores</caption>
            <thead>
              <tr>
                {["Nome", "Diretoria", "Gerência", "Função", "Líder imediato", "Remuneração Mensal", "Status", "Ações"].map((h) => (
                  <th key={h} scope="col" style={getThStyle(t)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonTableRow cols={8} />
              <SkeletonTableRow cols={8} />
              <SkeletonTableRow cols={8} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const leitura = modalForm === "ver";
  const snapshotEdicao = modalForm === "editar" && editId ? lista.find((x) => x.id === editId) ?? null : null;
  const bloquearOrgEdit = Boolean(
    usarSelectOrganograma &&
      (snapshotEdicao?.org_time_id || snapshotEdicao?.org_gerencia_id || snapshotEdicao?.org_diretoria_id),
  );
  const bloquearSetorManualEdit = Boolean(!usarSelectOrganograma && snapshotEdicao && snapshotEdicao.setor.trim());
  const bloquearCargoEdit = Boolean(snapshotEdicao?.cargo.trim());
  const bloquearNivelEdit = Boolean(snapshotEdicao?.nivel.trim());
  const bloquearSalarioEdit = Boolean(podeVerDadosSensiveis && snapshotEdicao && Number(snapshotEdicao.salario) > 0);
  const bloquearTipoContratoEdit = Boolean(snapshotEdicao && String(snapshotEdicao.tipo_contrato).length > 0);
  const bloquearEscalaEdit = Boolean(snapshotEdicao?.escala.trim());
  const desabilitarCampos = leitura || salvando;
  const sensivelBlurDoc = leitura && !modalVerExibirSensiveis;
  const sensivelBlurFinanceiro = leitura && !modalVerExibirSensiveis && podeVerDadosSensiveis;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box",
  };

  const astReq = <span style={{ color: "#e84025", fontWeight: 700 }} aria-hidden> *</span>;
  const lbl = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
    </label>
  );
  const lblReq = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {astReq}
    </label>
  );
  /** `obrigatorioNoNovo`: no fluxo «Novo Prestador» (cadastro mínimo), asterisco só onde a validação exige. */
  const lblReqCad = (htmlFor: string, text: string, obrigatorioNoNovo = true) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {!leitura && (modalForm !== "novo" || obrigatorioNoNovo) ? astReq : null}
    </label>
  );

  const tabActiveBgModal = brand.useBrand
    ? "var(--brand-action-12)"
    : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)";
  const idTabModal = (k: AbaFuncModal) => `rh-func-tab-${k}`;
  const idPanelModal = (k: AbaFuncModal) => `rh-func-panel-${k}`;
  const fecharModalFuncionario = () => {
    if (salvando) return;
    setModalForm("fechado");
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setAlertaValidacaoModal(null);
    setFieldErr({});
    setErroGlobal(null);
  };

  const executarExclusaoPrestador = async () => {
    if (!prestadorExcluirConfirm) return;
    setExcluindoPrestador(true);
    setErroGlobal(null);
    const fid = prestadorExcluirConfirm.id;
    try {
      const { error } = await supabase.from("rh_funcionarios").delete().eq("id", fid);
      if (error) throw error;
      if (editId === fid) fecharModalFuncionario();
      setPrestadorExcluirConfirm(null);
      setSucessoMsg("Prestador excluído.");
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao excluir.";
      setErroGlobal(msg);
    } finally {
      setExcluindoPrestador(false);
    }
  };

  const tabActiveBgPagina = brand.useBrand
    ? "var(--brand-action-12)"
    : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)";
  const idTabPagina = (k: AbaPaginaRhFunc) => `rh-gest-func-pag-${k}`;
  const panelPaginaRhId = "rh-gest-func-panel-pag";
  const legendaTabelaPorAba =
    abaPagina === "headcount"
      ? "Head count — colaboradores filtrados"
      : abaPagina === "acoes_rh"
        ? "Ações de RH — colaboradores filtrados"
        : "Anotações RH — colaboradores filtrados";
  const preencherAcoesHeadcount = abaPagina === "headcount";
  const tabelaAcoesRh = abaPagina === "acoes_rh";
  const tabelaAnotacoesRh = abaPagina === "anotacoes";
  const tabelaSemSalario = tabelaAcoesRh || tabelaAnotacoesRh;
  const colunasTabela = tabelaSemSalario ? 7 : 8;
  const thStyleSort = getThStyle(t);
  const thStyleSortRight = getThStyle(t, { textAlign: "right" });

  const btnIconTabela: CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const btnIconTabelaCta: CSSProperties = {
    ...btnIconTabela,
    border: "none",
    color: "#fff",
    fontWeight: 700,
    background: ctaGradient(brand),
  };
  const btnIconTabelaPerigo: CSSProperties = {
    ...btnIconTabela,
    border: "1px solid rgba(232,64,37,0.45)",
    color: "#e84025",
  };

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<UserCircle2 size={16} aria-hidden />}
        title="Gestão de Prestadores"
        subtitle="Cadastro, head count e fluxos de RH."
      />

      {erroGlobal && modalForm === "fechado" ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erroGlobal}
        </div>
      ) : null}

      {sucessoMsg ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} color="#22c55e" aria-hidden />
          {sucessoMsg}
        </div>
      ) : null}

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          background: t.cardBg,
          padding: "14px 16px",
          marginBottom: 16,
          boxShadow: cardShadow,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 12,
            alignItems: "end",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {lbl("rh-filtro-dir", "Diretoria")}
            <select
              id="rh-filtro-dir"
              value={filtroDiretoria}
              onChange={(ev) => setFiltroDiretoria(ev.target.value)}
              aria-label="Filtrar por diretoria"
              style={inputStyle}
            >
              <option value="">Todas</option>
              {diretoriasOpcoes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            {lbl("rh-filtro-ger", "Gerência")}
            <select
              id="rh-filtro-ger"
              value={filtroGerencia}
              onChange={(ev) => setFiltroGerencia(ev.target.value)}
              aria-label="Filtrar por gerência"
              style={inputStyle}
            >
              <option value="">Todas</option>
              {gerenciasOpcoes.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            {lbl("rh-func-setor", "Setor")}
            <select
              id="rh-func-setor"
              value={filtroSetor}
              onChange={(ev) => setFiltroSetor(ev.target.value)}
              aria-label="Filtrar por setor"
              style={inputStyle}
            >
              <option value="">Todos</option>
              {setoresUnicos.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            {lbl("rh-func-contrato", "Tipo de contrato")}
            <select
              id="rh-func-contrato"
              value={filtroContrato}
              onChange={(ev) => setFiltroContrato(ev.target.value as typeof filtroContrato)}
              aria-label="Filtrar por tipo de contrato"
              style={inputStyle}
            >
              <option value="todos">Todos</option>
              {TIPOS_CONTRATO.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 0 }}>
            {lbl("rh-func-status", "Status")}
            <select
              id="rh-func-status"
              value={filtroStatus}
              onChange={(ev) => setFiltroStatus(ev.target.value as FiltroStatusPrestador)}
              aria-label="Filtrar por status"
              style={inputStyle}
            >
              <option value="disponiveis">Todos disponíveis</option>
              <option value="ativo">Ativos</option>
              <option value="indisponivel">Indisponíveis</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
        </div>
        <div style={{ width: "100%" }}>
          {lbl("rh-func-busca", "Pesquisar por nome, CPF ou e-mail")}
          <input
            id="rh-func-busca"
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Nome, CPF ou e-mail"
            aria-label="Pesquisar por nome, CPF ou e-mail"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="app-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div
          style={{
            background: brand.useBrand ? brand.blockBg : t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: 20,
            boxShadow: cardShadow,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: brand.useBrand ? brand.secondary : t.textMuted,
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: FONT.body,
              marginBottom: 6,
            }}
          >
            <Users size={13} aria-hidden style={{ color: brand.useBrand ? brand.secondary : t.textMuted }} />
            Total de Prestadores
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
            {resumoPrestadoresCards.total}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Ativos</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: corStatusPrestador("ativo"), fontFamily: FONT.body }}>
                {resumoPrestadoresCards.porStatus.ativo}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Indisponíveis</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: corStatusPrestador("indisponivel"), fontFamily: FONT.body }}>
                {resumoPrestadoresCards.porStatus.indisponivel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Encerrados</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: corStatusPrestador("encerrado"), fontFamily: FONT.body }}>
                {resumoPrestadoresCards.porStatus.encerrado}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: brand.useBrand ? brand.blockBg : t.cardBg,
            border: "1px solid rgba(232, 64, 37, 0.25)",
            borderRadius: 18,
            padding: 20,
            boxShadow: cardShadow,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: "#e84025",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: FONT.body,
              marginBottom: 6,
            }}
          >
            <AlertCircle size={13} aria-hidden />
            Cadastro incompleto
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#e84025", fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
            {resumoPrestadoresCards.incompletos.length}
          </div>
          {resumoPrestadoresCards.incompletos.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#22c55e", fontFamily: FONT.body }}>
              <CheckCircle2 size={14} aria-hidden />
              Todos os cadastros filtrados estão completos.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {resumoPrestadoresCards.incompletos.map((row) =>
                perm.canEditarOk ? (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => abrirEditar(row)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                      fontSize: 13,
                      color: "var(--brand-action, #7c3aed)",
                      fontFamily: FONT.body,
                      textDecoration: "underline",
                      fontWeight: 500,
                    }}
                  >
                    {row.nome}
                  </button>
                ) : (
                  <span key={row.id} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                    {row.nome}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Módulos de gestão de colaboradores"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          flexWrap: "wrap",
          paddingBottom: 2,
        }}
      >
        {ABAS_PAGINA_RH_FUNC.map((tb) => {
          const ativa = abaPagina === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              id={idTabPagina(tb.key)}
              aria-selected={ativa}
              aria-controls={panelPaginaRhId}
              tabIndex={ativa ? 0 : -1}
              onClick={() => setAbaPagina(tb.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                flexShrink: 0,
                border: `1px solid ${ativa ? brand.primary : t.cardBorder}`,
                background: ativa ? tabActiveBgPagina : (t.inputBg ?? t.cardBg),
                color: ativa ? brand.primary : t.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelPaginaRhId} aria-labelledby={idTabPagina(abaPagina)}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          {abaPagina === "headcount" && perm.canCriarOk && podeVerDadosSensiveis ? (
            <button
              type="button"
              onClick={abrirNovo}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                background: ctaGradient(brand),
              }}
            >
              <Plus size={16} aria-hidden />
              Novo Prestador
            </button>
          ) : null}
          {abaPagina === "anotacoes" && perm.canEditarOk ? (
            <button
              type="button"
              onClick={() => abrirModalRhTalks()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                background: ctaGradient(brand),
              }}
            >
              RH Talks
            </button>
          ) : null}
        </div>

        <div className="app-table-wrap">
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, overflow: "hidden", boxShadow: cardShadow }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: tabelaSemSalario ? 680 : 820,
            }}
          >
            <caption style={{ display: "none" }}>{legendaTabelaPorAba}</caption>
            <thead>
              <tr>
                <SortTableTh<PrestadoresSortCol>
                  label="Nome"
                  col="nome"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                <SortTableTh<PrestadoresSortCol>
                  label="Diretoria"
                  col="diretoria"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                <SortTableTh<PrestadoresSortCol>
                  label="Gerência"
                  col="gerencia"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                <SortTableTh<PrestadoresSortCol>
                  label="Função"
                  col="cargo"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                <SortTableTh<PrestadoresSortCol>
                  label="Líder imediato"
                  col="lider"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                {!tabelaSemSalario ? (
                  <SortTableTh<PrestadoresSortCol>
                    label="Remuneração Mensal"
                    col="salario"
                    sortCol={sortPrestadores.col}
                    sortDir={sortPrestadores.dir}
                    onSort={onSortPrestadores}
                    thStyle={thStyleSortRight}
                    align="right"
                    endAdornment={
                      podeVerDadosSensiveis ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTabelaSalarioVisivel((v) => !v);
                          }}
                          aria-label={
                            tabelaSalarioVisivel
                              ? "Ocultar valores de remuneração mensal na tabela"
                              : "Exibir valores de remuneração mensal na tabela"
                          }
                          title={tabelaSalarioVisivel ? "Ocultar" : "Ver"}
                          style={{
                            padding: 4,
                            borderRadius: 8,
                            border: `1px solid ${t.cardBorder}`,
                            background: t.inputBg,
                            cursor: "pointer",
                            color: t.textMuted,
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {tabelaSalarioVisivel ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                        </button>
                      ) : null
                    }
                  />
                ) : null}
                <SortTableTh<PrestadoresSortCol>
                  label="Status"
                  col="status"
                  sortCol={sortPrestadores.col}
                  sortDir={sortPrestadores.dir}
                  onSort={onSortPrestadores}
                  thStyle={thStyleSort}
                  align="left"
                />
                <th scope="col" style={thStyleSortRight}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonTableRow cols={colunasTabela} />
                  <SkeletonTableRow cols={colunasTabela} />
                </>
              ) : filtrada.length === 0 ? (
                <tr>
                  <td colSpan={colunasTabela} style={{ ...getTdStyle(t), textAlign: "center", padding: "40px 16px", color: t.textMuted }}>
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                filtradaOrdenada.map((row, i) => {
                  const { diretoria, gerencia } = orgMetaLinha(row);
                  const liderCompleto = liderImediatoLinha(row);
                  const lider = nomeLiderDoisPrimeirosParaTabela(liderCompleto);
                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          ...getTdStyle(t),
                          textAlign: "left",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          background: zebraStripe(i),
                        }}
                        title={row.nome}
                      >
                        {row.nome}
                      </td>
                      <td style={{ ...getTdStyle(t), background: zebraStripe(i), maxWidth: 140 }} title={diretoria}>
                        {diretoria}
                      </td>
                      <td style={{ ...getTdStyle(t), background: zebraStripe(i), maxWidth: 140 }} title={gerencia}>
                        {gerencia}
                      </td>
                      <td style={{ ...getTdStyle(t), background: zebraStripe(i) }}>{row.cargo}</td>
                      <td
                        style={{ ...getTdStyle(t), background: zebraStripe(i), maxWidth: 140 }}
                        title={liderCompleto !== "—" ? liderCompleto : undefined}
                      >
                        {lider}
                      </td>
                      {!tabelaSemSalario ? (
                        <td
                          style={getTdNumStyle(t, {
                            background: zebraStripe(i),
                            ...(podeVerDadosSensiveis && !tabelaSalarioVisivel ? blurSensivel : {}),
                          })}
                        >
                          {podeVerDadosSensiveis ? fmtBRL(Number(row.salario)) : "—"}
                        </td>
                      ) : null}
                      <td style={{ ...getTdStyle(t, { background: zebraStripe(i) }) }}>
                        <span style={{ fontWeight: 700, color: corStatusPrestador(row.status) }}>{labelStatusPrestador(row.status)}</span>
                      </td>
                      <td style={{ ...getTdStyle(t, { textAlign: "right", background: zebraStripe(i) }) }}>
                        {preencherAcoesHeadcount || tabelaAcoesRh || tabelaAnotacoesRh ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => abrirVer(row)}
                              style={btnIconTabela}
                              aria-label={`Visualizar ${row.nome}`}
                            >
                              <Eye size={14} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirModalHistorico(row)}
                              style={btnIconTabela}
                              aria-label={`Histórico de ${row.nome}`}
                            >
                              <History size={14} aria-hidden />
                            </button>
                            {preencherAcoesHeadcount && perm.canEditarOk ? (
                              <button type="button" onClick={() => abrirEditar(row)} style={btnIconTabela} aria-label={`Editar ${row.nome}`}>
                                <Pencil size={14} aria-hidden />
                              </button>
                            ) : null}
                            {tabelaAcoesRh && perm.canEditarOk ? (
                              <button
                                type="button"
                                onClick={() => abrirModalRegistrarAcao(row)}
                                style={btnIconTabelaCta}
                                aria-label={`Registrar ação de RH para ${row.nome}`}
                              >
                                <ClipboardList size={14} aria-hidden />
                              </button>
                            ) : null}
                            {tabelaAnotacoesRh && perm.canEditarOk ? (
                              <button
                                type="button"
                                onClick={() => abrirModalRegistrarAnotacao(row)}
                                style={btnIconTabelaCta}
                                aria-label={`Registrar anotação de RH para ${row.nome}`}
                              >
                                <StickyNote size={14} aria-hidden />
                              </button>
                            ) : null}
                            {perm.canExcluirOk ? (
                              <button
                                type="button"
                                onClick={() => setPrestadorExcluirConfirm(row)}
                                style={btnIconTabelaPerigo}
                                aria-label={`Excluir ${row.nome}`}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {(modalForm === "novo" || modalForm === "editar" || modalForm === "ver") && (
        <ModalBase maxWidth={720} onClose={fecharModalFuncionario}>
          {modalForm === "ver" ? (
            <RhFuncModalHeaderDetalhes
              t={t}
              perm={perm}
              editId={editId}
              lista={lista}
              modalVerExibirSensiveis={modalVerExibirSensiveis}
              setModalVerExibirSensiveis={setModalVerExibirSensiveis}
              abrirEditar={abrirEditar}
              fecharModalFuncionario={fecharModalFuncionario}
              ctaGradient={ctaGradient}
              brand={brand}
            />
          ) : (
            <ModalHeader
              title={modalForm === "novo" ? "Novo Prestador" : "Editar Prestador"}
              onClose={fecharModalFuncionario}
            />
          )}

          <div
            role="tablist"
            aria-label="Seções do cadastro"
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "nowrap",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 2,
            }}
          >
            {abasModalDef.map((tb) => {
              const ativa = abaModal === tb.key;
              return (
                <button
                  key={tb.key}
                  type="button"
                  role="tab"
                  id={idTabModal(tb.key)}
                  aria-selected={ativa}
                  aria-controls={idPanelModal(tb.key)}
                  tabIndex={ativa ? 0 : -1}
                  onClick={() => setAbaModal(tb.key)}
                  aria-label={
                    modalForm !== "ver" && errosPorAbaModal[tb.key] > 0
                      ? `${tb.label}, ${errosPorAbaModal[tb.key]} erro(s) nesta secção`
                      : tb.label
                  }
                  style={{
                    padding: "7px 14px",
                    borderRadius: 20,
                    flexShrink: 0,
                    border: `1px solid ${ativa ? brand.primary : t.cardBorder}`,
                    background: ativa ? tabActiveBgModal : (t.inputBg ?? t.cardBg),
                    color: ativa ? brand.primary : t.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  {tb.label}
                  {modalForm !== "ver" && errosPorAbaModal[tb.key] > 0 ? (
                    <span style={{ color: "#e84025", fontWeight: 800 }} aria-hidden>
                      {" "}
                      · {errosPorAbaModal[tb.key]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {(modalForm === "novo" || modalForm === "editar" || modalForm === "ver") && erroGlobal ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(232,64,37,0.12)",
                border: "1px solid rgba(232,64,37,0.35)",
                color: "#e84025",
                fontSize: 13,
                fontFamily: FONT.body,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} color="#e84025" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erroGlobal}</span>
            </div>
          ) : null}

          {modalForm !== "ver" && alertaValidacaoModal ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(232,64,37,0.12)",
                border: "1px solid rgba(232,64,37,0.35)",
                color: "#e84025",
                fontSize: 12,
                fontFamily: FONT.body,
                whiteSpace: "pre-line",
                lineHeight: 1.45,
              }}
            >
              {alertaValidacaoModal}
            </div>
          ) : null}

          <div
            role="tabpanel"
            id={idPanelModal(abaModal)}
            aria-labelledby={idTabModal(abaModal)}
            style={{ minHeight: 100 }}
          >
            {abaModal === "pessoais" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-nome", "Nome completo")}
                  <input
                    id="f-nome"
                    disabled={desabilitarCampos}
                    value={form.nome}
                    onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-rg", "RG")}
                  <input
                    id="f-rg"
                    disabled={desabilitarCampos}
                    value={form.rg}
                    onChange={(e) => setForm((s) => ({ ...s, rg: formatarRgInput(e.target.value) }))}
                    placeholder="00.000.000-0"
                    style={{ ...inputStyle, ...(sensivelBlurDoc ? blurSensivel : {}) }}
                  />
                  {fieldErr.rg ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.rg}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cpf", "CPF")}
                  <input
                    id="f-cpf"
                    disabled={desabilitarCampos || modalForm === "editar"}
                    value={form.cpf}
                    onChange={(e) => setForm((s) => ({ ...s, cpf: formatarCpfDigitos(e.target.value) }))}
                    placeholder="000.000.000-00"
                    style={{ ...inputStyle, ...(sensivelBlurDoc ? blurSensivel : {}) }}
                    title={modalForm === "editar" ? "CPF não pode ser alterado" : undefined}
                  />
                  {fieldErr.cpf ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cpf}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-tel", "Telefone")}
                  <input
                    id="f-tel"
                    disabled={desabilitarCampos}
                    value={form.telefone}
                    onChange={(e) => setForm((s) => ({ ...s, telefone: formatarTelefoneBr(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                  {fieldErr.telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.telefone}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-email", "E-mail")}
                  <input
                    id="f-email"
                    type="email"
                    disabled={desabilitarCampos}
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.email ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Endereço residencial
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-res-cep", "CEP")}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="f-res-cep"
                      disabled={desabilitarCampos}
                      value={form.res_cep}
                      onChange={(e) => setForm((s) => ({ ...s, res_cep: formatarCepDigitos(e.target.value) }))}
                      onBlur={(e) => handleCepBlur("res", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {cepBuscaEmAndamento === "res" ? <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ color: t.textMuted }} /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    Insira o CEP para preencher o endereço
                  </div>
                  {fieldErr.res_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cep}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-res-log", "Logradouro", false)}
                  <input
                    id="f-res-log"
                    disabled={desabilitarCampos}
                    value={form.res_logradouro}
                    onChange={(e) => setForm((s) => ({ ...s, res_logradouro: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-num", "Número", false)}
                  <input
                    id="f-res-num"
                    disabled={desabilitarCampos}
                    value={form.res_numero}
                    onChange={(e) => setForm((s) => ({ ...s, res_numero: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-res-compl", "Complemento")}
                  <input
                    id="f-res-compl"
                    disabled={desabilitarCampos}
                    value={form.res_complemento}
                    onChange={(e) => setForm((s) => ({ ...s, res_complemento: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-cid", "Cidade", false)}
                  <input
                    id="f-res-cid"
                    disabled={desabilitarCampos}
                    value={form.res_cidade}
                    onChange={(e) => setForm((s) => ({ ...s, res_cidade: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-uf", "Estado (UF)", false)}
                  <select
                    id="f-res-uf"
                    disabled={desabilitarCampos}
                    value={form.res_estado}
                    onChange={(e) => setForm((s) => ({ ...s, res_estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    style={inputStyle}
                    aria-label="UF residencial"
                  >
                    <option value="">—</option>
                    {UFS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldErr.res_estado ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_estado}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Contato de emergência
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emerg-nome", "Nome")}
                  <input
                    id="f-emerg-nome"
                    disabled={desabilitarCampos}
                    value={form.emerg_nome}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_nome: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emerg_nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_nome}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emerg-parent", "Parentesco")}
                  <input
                    id="f-emerg-parent"
                    disabled={desabilitarCampos}
                    value={form.emerg_parentesco}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_parentesco: e.target.value }))}
                    placeholder="Ex.: Cônjuge, irmã(o)"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emerg-tel", "Telefone", false)}
                  <input
                    id="f-emerg-tel"
                    disabled={desabilitarCampos}
                    value={form.emerg_telefone}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_telefone: formatarTelefoneBr(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                  {fieldErr.emerg_telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_telefone}</div> : null}
                </div>
              </div>
            ) : null}

            {abaModal === "contratacao" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {usarSelectOrganograma ? (
                    <>
                      {!leitura ? (
                        <>
                          {lblReqCad("f-org-time", "Organograma")}
                          <SelectOrganogramaTimes
                            id="f-org-time"
                            disabled={desabilitarCampos || bloquearOrgEdit}
                            value={form.org_time_id ?? form.org_gerencia_id ?? form.org_diretoria_id ?? ""}
                            grupos={organogramaGrupos}
                            onPick={(id, op) => {
                              if (!id || !op) {
                                setForm((s) => ({ ...s, org_diretoria_id: null, org_gerencia_id: null, org_time_id: null, setor: "" }));
                                return;
                              }
                              if (op.nivel === "time") {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: null,
                                  org_gerencia_id: null,
                                  org_time_id: op.timeId,
                                  setor: op.setorNome,
                                }));
                              } else if (op.nivel === "gerencia") {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: null,
                                  org_gerencia_id: op.gerenciaId,
                                  org_time_id: null,
                                  setor: op.setorNome,
                                }));
                              } else {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: op.diretoriaId,
                                  org_gerencia_id: null,
                                  org_time_id: null,
                                  setor: op.setorNome,
                                }));
                              }
                            }}
                            aria-label="Organograma"
                            style={inputStyle}
                          />
                          {fieldErr.org_time_id ? (
                            <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.org_time_id}</div>
                          ) : null}
                        </>
                      ) : null}
                      {opcaoOrgSelecionada || (leitura && form.setor.trim()) ? (
                        <div
                          style={{
                            marginTop: leitura ? 0 : 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${t.cardBorder}`,
                            background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                            fontSize: 12,
                            color: t.textMuted,
                            lineHeight: 1.6,
                          }}
                        >
                          {opcaoOrgSelecionada ? (
                            <>
                              <div>
                                <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoOrgSelecionada.diretoriaNome}
                              </div>
                              {opcaoOrgSelecionada.nivel !== "diretoria" ? (
                                <div>
                                  <strong style={{ color: t.text }}>Gerência:</strong> {opcaoOrgSelecionada.gerenciaNome || "—"}
                                </div>
                              ) : null}
                              {opcaoOrgSelecionada.nivel === "time" ? (
                                <div>
                                  <strong style={{ color: t.text }}>Time:</strong> {opcaoOrgSelecionada.timeNome}
                                </div>
                              ) : null}
                              <div>
                                <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoOrgSelecionada.gestorNome}
                              </div>
                            </>
                          ) : (
                            <div>
                              <strong style={{ color: t.text }}>Setor:</strong> {form.setor}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {lblReqCad("f-setor", "Setor")}
                      <input
                        id="f-setor"
                        disabled={desabilitarCampos || bloquearSetorManualEdit}
                        value={form.setor}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            setor: e.target.value,
                            org_diretoria_id: null,
                            org_gerencia_id: null,
                            org_time_id: null,
                          }))
                        }
                        style={inputStyle}
                        list="lista-setores"
                      />
                      <datalist id="lista-setores">
                        {setoresUnicos.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                      {permOrg.canView !== "nao" && !permOrg.loading && organogramaGrupos.length === 0 && opcoesVinculoFlat.length === 0 ? (
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                          Nenhuma estrutura ativa no organograma. Cadastre diretorias em RH → Organograma ou informe o setor manualmente.
                        </div>
                      ) : null}
                    </>
                  )}
                  {fieldErr.setor ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.setor}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cargo", "Função")}
                  <input id="f-cargo" disabled={desabilitarCampos || bloquearCargoEdit} value={form.cargo} onChange={(e) => setForm((s) => ({ ...s, cargo: e.target.value }))} style={inputStyle} />
                  {fieldErr.cargo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cargo}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-nivel", "Nível")}
                  <select
                    id="f-nivel"
                    disabled={desabilitarCampos || bloquearNivelEdit}
                    value={form.nivel}
                    onChange={(e) => setForm((s) => ({ ...s, nivel: e.target.value }))}
                    style={inputStyle}
                    aria-label="Nível profissional"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lblReqCad("f-tipo", "Tipo de contrato", false)}
                    <select
                      id="f-tipo"
                      disabled={desabilitarCampos || bloquearTipoContratoEdit}
                      value={form.tipo_contrato}
                      onChange={(e) => setForm((s) => ({ ...s, tipo_contrato: e.target.value as RhFuncionarioTipoContrato }))}
                      style={inputStyle}
                      aria-label="Tipo de contrato"
                    >
                      {TIPOS_CONTRATO.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {leitura ? lbl("f-area-atuacao", "Área de atuação") : lblReqCad("f-area-atuacao", "Área de atuação", true)}
                    <select
                      id="f-area-atuacao"
                      disabled={desabilitarCampos}
                      value={form.area_atuacao}
                      onChange={(e) => {
                        const v = e.target.value as "" | RhAreaAtuacao;
                        setForm((s) => {
                          if (v === "escritorio") {
                            const esc = !s.escala.trim() || !escalaEhPermitida(s.escala) ? "5x2" : s.escala;
                            return {
                              ...s,
                              area_atuacao: v,
                              escala: esc,
                              remuneracaoHoraCentavos: "",
                              staff_turno: "",
                            };
                          }
                          if (v === "estudio") {
                            return { ...s, area_atuacao: v, salarioCentavos: "" };
                          }
                          return { ...s, area_atuacao: v };
                        });
                      }}
                      style={inputStyle}
                      aria-label="Área de atuação"
                      aria-required={!leitura}
                    >
                      {modalForm === "novo" ? (
                        <option value="">— Selecione —</option>
                      ) : null}
                      <option value="escritorio">Escritório</option>
                      <option value="estudio">Estúdio</option>
                    </select>
                    {fieldErr.area_atuacao ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.area_atuacao}</div>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("f-email-spin", "E-mail Spin")}
                  <input
                    id="f-email-spin"
                    type="email"
                    disabled={desabilitarCampos}
                    value={form.email_spin}
                    onChange={(e) => setForm((s) => ({ ...s, email_spin: e.target.value }))}
                    placeholder="exemplo@spingaming.com.br"
                    autoComplete="email"
                    style={inputStyle}
                    aria-label="E-mail corporativo Spin"
                  />
                  {fieldErr.email_spin ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email_spin}</div> : null}
                </div>
                {podeVerDadosSensiveis ? (
                  isEstudioContratacao ? (
                    <div style={{ marginBottom: 10 }}>
                      {lblReqCad("f-rem-hora", "Remuneração por hora")}
                      <input
                        id="f-rem-hora"
                        disabled={desabilitarCampos}
                        inputMode="numeric"
                        autoComplete="off"
                        value={form.remuneracaoHoraCentavos ? formatarMoedaDigitos(form.remuneracaoHoraCentavos) : ""}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, remuneracaoHoraCentavos: centavosDeStringMoeda(e.target.value) }))
                        }
                        placeholder="R$ 0,00"
                        style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      />
                      {fieldErr.remuneracaoHoraCentavos ? (
                        <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.remuneracaoHoraCentavos}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      {lblReqCad("f-sal", "Remuneração Mensal")}
                      <input
                        id="f-sal"
                        disabled={desabilitarCampos || bloquearSalarioEdit}
                        inputMode="numeric"
                        autoComplete="off"
                        value={form.salarioCentavos ? formatarMoedaDigitos(form.salarioCentavos) : ""}
                        onChange={(e) => setForm((s) => ({ ...s, salarioCentavos: centavosDeStringMoeda(e.target.value) }))}
                        placeholder="R$ 0,00"
                        style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      />
                      {fieldErr.salarioCentavos ? (
                        <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.salarioCentavos}</div>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração (mensal ou por hora) e dados bancários: visíveis apenas para administrador ou quem tem permissão de edição nesta página.
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-ini", "Data de início")}
                  <input
                    id="f-ini"
                    type="date"
                    disabled={desabilitarCampos}
                    value={form.data_inicio}
                    onChange={(e) => setForm((s) => ({ ...s, data_inicio: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.data_inicio ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_inicio}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-escala", "Escala")}
                  <select
                    id="f-escala"
                    disabled={desabilitarCampos || bloquearEscalaEdit}
                    value={valorSelectEscala(form.escala)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((s) => {
                        const escalaNova = v === "__legacy__" ? s.escala : v;
                        return {
                          ...s,
                          escala: escalaNova,
                          staff_turno: turnoRhCoerenteComEscala(escalaNova, s.staff_turno),
                        };
                      });
                    }}
                    style={inputStyle}
                    aria-label="Escala de trabalho"
                  >
                    <option value="">— Selecione —</option>
                    {valorSelectEscala(form.escala) === "__legacy__" ? (
                      <option value="__legacy__">
                        {form.escala.trim()} (cadastro antigo — escolha 5x2, 3x3, 4x2 ou 5x1)
                      </option>
                    ) : null}
                    {ESCALAS_PERMITIDAS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
                </div>
                {isEstudioContratacao ? (
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-turno-estudio", "Turno")}
                    <select
                      id="f-turno-estudio"
                      disabled={desabilitarCampos}
                      value={turnoRhCoerenteComEscala(form.escala, form.staff_turno)}
                      onChange={(e) => setForm((s) => ({ ...s, staff_turno: e.target.value }))}
                      style={inputStyle}
                      aria-label="Turno"
                      aria-required={!leitura}
                    >
                      <option value="">— Selecione —</option>
                      {opcoesTurnoPorEscalaRh(form.escala).map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>
                    {fieldErr.staff_turno ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.staff_turno}</div>
                    ) : null}
                  </div>
                ) : null}
                {!leitura && modalForm !== "novo" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lbl("f-dt-funcao", "Data da Função")}
                    <input
                      id="f-dt-funcao"
                      type="date"
                      disabled={desabilitarCampos}
                      value={form.data_funcao}
                      onChange={(e) => setForm((s) => ({ ...s, data_funcao: e.target.value }))}
                      style={inputStyle}
                      aria-label="Data da Função"
                    />
                  </div>
                ) : null}
                {leitura && form.data_funcao.trim() ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>Data da Função</div>
                    <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>{fmtDataIsoPtBr(form.data_funcao)}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {abaModal === "empresa" && ehPJ ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-empnome", "Nome da empresa", false)}
                  <input
                    id="f-empnome"
                    disabled={desabilitarCampos}
                    value={form.nome_empresa}
                    onChange={(e) => setForm((s) => ({ ...s, nome_empresa: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.nome_empresa ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome_empresa}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cnpj", "CNPJ", false)}
                  <input
                    id="f-cnpj"
                    disabled={desabilitarCampos}
                    value={form.cnpj}
                    onChange={(e) => setForm((s) => ({ ...s, cnpj: formatarCnpjDigitos(e.target.value) }))}
                    placeholder="00.000.000/0000-00"
                    style={inputStyle}
                  />
                  {fieldErr.cnpj ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cnpj}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Endereço da empresa
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emp-cep", "CEP")}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="f-emp-cep"
                      disabled={desabilitarCampos}
                      value={form.emp_cep}
                      onChange={(e) => setForm((s) => ({ ...s, emp_cep: formatarCepDigitos(e.target.value) }))}
                      onBlur={(e) => handleCepBlur("emp", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {cepBuscaEmAndamento === "emp" ? <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ color: t.textMuted }} /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    Insira o CEP para preencher o endereço
                  </div>
                  {fieldErr.emp_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cep}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-emp-log", "Logradouro", false)}
                  <input
                    id="f-emp-log"
                    disabled={desabilitarCampos}
                    value={form.emp_logradouro}
                    onChange={(e) => setForm((s) => ({ ...s, emp_logradouro: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-num", "Número", false)}
                  <input
                    id="f-emp-num"
                    disabled={desabilitarCampos}
                    value={form.emp_numero}
                    onChange={(e) => setForm((s) => ({ ...s, emp_numero: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emp-compl", "Complemento")}
                  <input
                    id="f-emp-compl"
                    disabled={desabilitarCampos}
                    value={form.emp_complemento}
                    onChange={(e) => setForm((s) => ({ ...s, emp_complemento: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-cid", "Cidade", false)}
                  <input
                    id="f-emp-cid"
                    disabled={desabilitarCampos}
                    value={form.emp_cidade}
                    onChange={(e) => setForm((s) => ({ ...s, emp_cidade: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-uf", "Estado (UF)", false)}
                  <select
                    id="f-emp-uf"
                    disabled={desabilitarCampos}
                    value={form.emp_estado}
                    onChange={(e) => setForm((s) => ({ ...s, emp_estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    style={inputStyle}
                    aria-label="UF da empresa"
                  >
                    <option value="">—</option>
                    {UFS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldErr.emp_estado ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_estado}</div> : null}
                </div>
              </div>
            ) : null}

            {abaModal === "bancarios" ? (
              podeVerDadosSensiveis ? (
                <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-banco", "Banco", false)}
                    <select
                      id="f-banco"
                      disabled={desabilitarCampos}
                      value={rhBancoParaSelectValue(form.banco)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__legacy__") return;
                        setForm((s) => ({ ...s, banco: v }));
                      }}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      aria-label="Banco"
                    >
                      <option value="">— Selecione —</option>
                      {rhBancoParaSelectValue(form.banco) === "__legacy__" ? (
                        <option value="__legacy__">
                          {form.banco.trim()} (cadastro fora da lista — selecione o banco equivalente)
                        </option>
                      ) : null}
                      {RH_BANCOS_BRASIL.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    {fieldErr.banco ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.banco}</div> : null}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-ag", "Agência", false)}
                    <input
                      id="f-ag"
                      disabled={desabilitarCampos}
                      value={form.agencia}
                      onChange={(e) => setForm((s) => ({ ...s, agencia: formatarAgencia(e.target.value) }))}
                      placeholder="0000-0"
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.agencia ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.agencia}</div> : null}
                  </div>
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReqCad("f-cc", "Conta corrente", false)}
                    <input
                      id="f-cc"
                      disabled={desabilitarCampos}
                      value={form.conta_corrente}
                      onChange={(e) => setForm((s) => ({ ...s, conta_corrente: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.conta_corrente ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.conta_corrente}</div>
                    ) : null}
                  </div>
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReqCad("f-pix", "PIX", false)}
                    <input
                      id="f-pix"
                      disabled={desabilitarCampos}
                      value={form.pix}
                      onChange={(e) => setForm((s) => ({ ...s, pix: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.pix ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.pix}</div> : null}
                  </div>
                </div>
              ) : (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: t.textMuted }}>Dados bancários ocultos para o seu perfil.</p>
              )
            ) : null}

            {abaModal === "documentos" ? <div style={{ minHeight: 120 }} aria-hidden /> : null}
          </div>

          {!leitura ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "flex-end",
                alignItems: "center",
                marginTop: 8,
              }}
            >
                {modalForm === "novo" ? (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void salvar({ outro: true })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      cursor: salvando ? "wait" : "pointer",
                      fontFamily: FONT.body,
                      fontSize: 13,
                    }}
                  >
                    Salvar e cadastrar outro
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvar({ outro: false })}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: salvando ? "wait" : "pointer",
                    fontFamily: FONT.body,
                    fontSize: 13,
                    background: ctaGradient(brand),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {salvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                  Salvar
                </button>
            </div>
          ) : null}
        </ModalBase>
      )}

      {acaoModalRow ? (
        <ModalBase maxWidth={680} onClose={fecharModalRegistrarAcao}>
          <ModalHeader title="Registrar Ação" onClose={fecharModalRegistrarAcao} />
          <div style={{ padding: "0 4px 8px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{acaoModalRow.nome}</strong>
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("acao-tipo", "Tipo de ação")}
              <select
                id="acao-tipo"
                value={acaoTipo}
                onChange={(e) => {
                  setAcaoTipo((e.target.value || "") as "" | RhHistoricoAcaoTipo);
                  setAcaoTipoTermino("");
                  setAcaoFiles([]);
                }}
                style={inputStyle}
                aria-label="Tipo de ação"
              >
                <option value="">— Selecione —</option>
                {tiposAcaoDisponiveis(acaoModalRow.status).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {acaoTipo === "periodo_indisponibilidade" ? (
              <div className="app-grid-2-tight">
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-dt-saida", "Data de saída")}
                  <input
                    id="acao-dt-saida"
                    type="date"
                    value={acaoDtSaida}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAcaoDtSaida(v);
                      setAcaoDtRetorno((r) => (r && v && r < v ? "" : r));
                    }}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-dt-ret", "Data de retorno")}
                  <input
                    id="acao-dt-ret"
                    type="date"
                    value={acaoDtRetorno}
                    min={acaoDtSaida || undefined}
                    onChange={(e) => setAcaoDtRetorno(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-obs", "Observação")}
                  <textarea id="acao-obs" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "retorno_indisponibilidade" ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-obs-r", "Observação")}
                  <textarea id="acao-obs-r" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "termino_prestacao" ? (
              <div className="app-grid-2-tight">
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-dt-term", "Data de término")}
                  <input id="acao-dt-term" type="date" value={acaoDtTermino} onChange={(e) => setAcaoDtTermino(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-tipo-term", "Tipo de término")}
                  <select
                    id="acao-tipo-term"
                    value={acaoTipoTermino}
                    onChange={(e) => setAcaoTipoTermino((e.target.value || "") as "" | RhTipoTerminoPrestacao)}
                    style={inputStyle}
                    aria-label="Tipo de término"
                    aria-required
                  >
                    <option value="">— Selecione —</option>
                    <option value="voluntario">Voluntário</option>
                    <option value="nao_voluntario">Não voluntário</option>
                  </select>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-obs-t", "Observação")}
                  <textarea id="acao-obs-t" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "alinhamento_formal" ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-obs-a", "Observação")}
                  <textarea id="acao-obs-a" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "revisao_contrato" || acaoTipo === "reativacao_prestacao" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {usarSelectOrganograma ? (
                    <>
                      {lblReq("acao-org", "Organograma")}
                      <SelectOrganogramaTimes
                        id="acao-org"
                        value={acaoForm.org_time_id ?? acaoForm.org_gerencia_id ?? acaoForm.org_diretoria_id ?? ""}
                        grupos={organogramaGrupos}
                        onPick={(id, op) => {
                          if (!id || !op) {
                            setAcaoForm((s) => ({ ...s, org_diretoria_id: null, org_gerencia_id: null, org_time_id: null, setor: "" }));
                            return;
                          }
                          if (op.nivel === "time") {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: null,
                              org_gerencia_id: null,
                              org_time_id: op.timeId,
                              setor: op.setorNome,
                            }));
                          } else if (op.nivel === "gerencia") {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: null,
                              org_gerencia_id: op.gerenciaId,
                              org_time_id: null,
                              setor: op.setorNome,
                            }));
                          } else {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: op.diretoriaId,
                              org_gerencia_id: null,
                              org_time_id: null,
                              setor: op.setorNome,
                            }));
                          }
                        }}
                        aria-label="Organograma"
                        style={inputStyle}
                      />
                      {opcaoOrgAcaoForm ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${t.cardBorder}`,
                            background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                            fontSize: 12,
                            color: t.textMuted,
                            lineHeight: 1.6,
                          }}
                        >
                          <div>
                            <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoOrgAcaoForm.diretoriaNome}
                          </div>
                          {opcaoOrgAcaoForm.nivel !== "diretoria" ? (
                            <div>
                              <strong style={{ color: t.text }}>Gerência:</strong> {opcaoOrgAcaoForm.gerenciaNome || "—"}
                            </div>
                          ) : null}
                          {opcaoOrgAcaoForm.nivel === "time" ? (
                            <div>
                              <strong style={{ color: t.text }}>Time:</strong> {opcaoOrgAcaoForm.timeNome}
                            </div>
                          ) : null}
                          <div>
                            <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoOrgAcaoForm.gestorNome}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {lblReq("acao-setor", "Setor")}
                      <input
                        id="acao-setor"
                        value={acaoForm.setor}
                        onChange={(e) =>
                          setAcaoForm((s) => ({
                            ...s,
                            setor: e.target.value,
                            org_diretoria_id: null,
                            org_gerencia_id: null,
                            org_time_id: null,
                          }))
                        }
                        style={inputStyle}
                      />
                    </>
                  )}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-cargo", "Função")}
                  <input
                    id="acao-cargo"
                    value={acaoForm.cargo}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, cargo: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-nivel", "Nível")}
                  <select
                    id="acao-nivel"
                    value={acaoForm.nivel}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, nivel: e.target.value }))}
                    style={inputStyle}
                    aria-label="Nível"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lblReq("acao-tipo", "Tipo de contrato")}
                    <select
                      id="acao-tipo-ct"
                      value={acaoForm.tipo_contrato}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, tipo_contrato: e.target.value as RhFuncionarioTipoContrato }))}
                      style={inputStyle}
                      aria-label="Tipo de contrato"
                    >
                      {TIPOS_CONTRATO.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {lblReq("acao-area-atuacao", "Área de atuação")}
                    <select
                      id="acao-area-atuacao"
                      value={
                        acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
                          ? acaoForm.area_atuacao
                          : "escritorio"
                      }
                      onChange={(e) => {
                        const v = e.target.value as RhAreaAtuacao;
                        setAcaoForm((s) => {
                          if (v === "escritorio") {
                            const esc = !s.escala.trim() || !escalaEhPermitida(s.escala) ? "5x2" : s.escala;
                            return {
                              ...s,
                              area_atuacao: v,
                              escala: esc,
                              remuneracaoHoraCentavos: "",
                              staff_turno: "",
                            };
                          }
                          if (v === "estudio") {
                            return { ...s, area_atuacao: v, salarioCentavos: "" };
                          }
                          return { ...s, area_atuacao: v };
                        });
                      }}
                      style={inputStyle}
                      aria-label="Área de atuação"
                    >
                      <option value="escritorio">Escritório</option>
                      <option value="estudio">Estúdio</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("acao-email-spin", "E-mail Spin")}
                  <input
                    id="acao-email-spin"
                    type="email"
                    value={acaoForm.email_spin}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, email_spin: e.target.value }))}
                    placeholder="exemplo@spingaming.com.br"
                    autoComplete="email"
                    style={inputStyle}
                    aria-label="E-mail corporativo Spin"
                  />
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body, lineHeight: 1.45 }}>
                    Opcional. Usado para vincular o login do utilizador ao cadastro em «Dados de Cadastro» quando for diferente do e-mail pessoal.
                  </div>
                </div>
                {podeVerDadosSensiveis ? (
                  acaoForm.area_atuacao === "estudio" ? (
                    <div style={{ marginBottom: 10 }}>
                      {lblReq("acao-rem-hora", "Remuneração por hora")}
                      <input
                        id="acao-rem-hora"
                        inputMode="numeric"
                        value={acaoForm.remuneracaoHoraCentavos ? formatarMoedaDigitos(acaoForm.remuneracaoHoraCentavos) : ""}
                        onChange={(e) =>
                          setAcaoForm((s) => ({ ...s, remuneracaoHoraCentavos: centavosDeStringMoeda(e.target.value) }))
                        }
                        placeholder="R$ 0,00"
                        style={inputStyle}
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      {lblReq("acao-sal", "Remuneração Mensal")}
                      <input
                        id="acao-sal"
                        inputMode="numeric"
                        value={acaoForm.salarioCentavos ? formatarMoedaDigitos(acaoForm.salarioCentavos) : ""}
                        onChange={(e) => setAcaoForm((s) => ({ ...s, salarioCentavos: centavosDeStringMoeda(e.target.value) }))}
                        placeholder="R$ 0,00"
                        style={inputStyle}
                      />
                    </div>
                  )
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração (mensal ou por hora): visível apenas para quem tem permissão de edição.
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-escala", "Escala")}
                  <select
                    id="acao-escala"
                    value={valorSelectEscala(acaoForm.escala)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAcaoForm((s) => {
                        const escalaNova = v === "__legacy__" ? s.escala : v;
                        return {
                          ...s,
                          escala: escalaNova,
                          staff_turno: turnoRhCoerenteComEscala(escalaNova, s.staff_turno),
                        };
                      });
                    }}
                    style={inputStyle}
                    aria-label="Escala de trabalho"
                  >
                    <option value="">— Selecione —</option>
                    {valorSelectEscala(acaoForm.escala) === "__legacy__" ? (
                      <option value="__legacy__">
                        {acaoForm.escala.trim()} (cadastro antigo — escolha 5x2, 3x3, 4x2 ou 5x1)
                      </option>
                    ) : null}
                    {ESCALAS_PERMITIDAS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                {acaoForm.area_atuacao === "estudio" ? (
                  <div style={{ marginBottom: 10 }}>
                    {lblReq("acao-turno-estudio", "Turno")}
                    <select
                      id="acao-turno-estudio"
                      value={turnoRhCoerenteComEscala(acaoForm.escala, acaoForm.staff_turno)}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, staff_turno: e.target.value }))}
                      style={inputStyle}
                      aria-label="Turno"
                    >
                      <option value="">— Selecione —</option>
                      {opcoesTurnoPorEscalaRh(acaoForm.escala).map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {acaoTipo === "revisao_contrato" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-dt-funcao", "Data da Função")}
                    <input
                      id="acao-dt-funcao"
                      type="date"
                      value={acaoForm.data_funcao}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, data_funcao: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ) : null}
                {acaoTipo === "reativacao_prestacao" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-dt-ini", "Data de início")}
                    <input
                      id="acao-dt-ini"
                      type="date"
                      value={acaoForm.data_inicio}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, data_inicio: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ) : null}
                {acaoTipo === "reativacao_prestacao" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-obs-rh", "Observação")}
                    <textarea
                      id="acao-obs-rh"
                      value={acaoForm.observacao_rh}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, observacao_rh: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={acaoSalvando}
                onClick={fecharModalRegistrarAcao}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: acaoSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={acaoSalvando || !acaoTipo}
                onClick={() => void salvarAcaoRh()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: acaoSalvando || !acaoTipo ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {acaoSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {rhTalksOpen ? (
        <ModalBase maxWidth={640} onClose={fecharModalRhTalks}>
          <ModalHeader title="RH Talks" onClose={fecharModalRhTalks} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12 }}>
              {lblReq("rt-assunto", "Assunto do RH Talks")}
              <input
                id="rt-assunto"
                value={rtAssunto}
                onChange={(e) => setRtAssunto(e.target.value)}
                style={inputStyle}
                aria-label="Assunto do RH Talks"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("rt-data", "Data do RH Talks")}
              <input id="rt-data" type="date" value={rtData} onChange={(e) => setRtData(e.target.value)} style={inputStyle} aria-label="Data do RH Talks" />
            </div>
            <div style={{ marginBottom: 10 }}>
              {lblReq("rt-busca", "Participantes")}
              <input
                id="rt-busca"
                type="search"
                value={rtBusca}
                onChange={(e) => setRtBusca(e.target.value)}
                placeholder="Digite o nome para buscar"
                style={inputStyle}
                aria-label="Pesquisar funcionários para adicionar como participantes"
              />
              {rtBusca.trim() ? (
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 200,
                    overflow: "auto",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                  }}
                >
                  {sugestoesParticipantesRhTalks.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: t.textMuted }}>Nenhum resultado para esta pesquisa.</div>
                  ) : (
                    sugestoesParticipantesRhTalks.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setRtParticipantes((prev) => [...prev, f])}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          border: "none",
                          borderBottom: `1px solid ${t.cardBorder}`,
                          background: "transparent",
                          color: t.text,
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: FONT.body,
                        }}
                      >
                        {f.nome}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Digite o nome para ver sugestões de participantes.
                </div>
              )}
              {rtParticipantes.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {rtParticipantes.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 20,
                        border: `1px solid ${t.cardBorder}`,
                        background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)",
                        fontSize: 12,
                        color: t.text,
                        fontFamily: FONT.body,
                      }}
                    >
                      {p.nome}
                      <button
                        type="button"
                        onClick={() => setRtParticipantes((prev) => prev.filter((x) => x.id !== p.id))}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: t.textMuted,
                          lineHeight: 1,
                        }}
                        aria-label={`Remover ${p.nome} dos participantes`}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("rt-ata", "Ata da reunião")}
              <textarea
                id="rt-ata"
                value={rtAta}
                onChange={(e) => setRtAta(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                aria-label="Ata da reunião"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="rt-anexo" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
                Anexo (opcional)
              </label>
              <input
                id="rt-anexo"
                type="file"
                onChange={(e) => setRtFiles(Array.from(e.target.files ?? []))}
                style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                aria-label="Anexo opcional"
              />
              {rtFiles.length > 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{rtFiles.map((f) => f.name).join(", ")}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={rtSalvando}
                onClick={fecharModalRhTalks}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: rtSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rtSalvando}
                onClick={() => void salvarRhTalks()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: rtSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {rtSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {anotacaoModalRow ? (
        <ModalBase maxWidth={640} onClose={fecharModalRegistrarAnotacao}>
          <ModalHeader title="Registrar Anotação" onClose={fecharModalRegistrarAnotacao} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{anotacaoModalRow.nome}</strong>
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-tipo", "Tipo")}
              <select
                id="an-tipo"
                value={anVisibilidade}
                onChange={(e) => setAnVisibilidade(e.target.value as "Particular" | "Publico")}
                style={inputStyle}
                aria-label="Tipo da anotação"
              >
                <option value="Publico">Público</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-assunto", "Assunto")}
              <input id="an-assunto" value={anAssunto} onChange={(e) => setAnAssunto(e.target.value)} style={inputStyle} aria-label="Assunto" />
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-data", "Data da conversa")}
              <input
                id="an-data"
                type="date"
                value={anData}
                onChange={(e) => setAnData(e.target.value)}
                style={inputStyle}
                aria-label="Data da conversa"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-ata", "Ata da reunião")}
              <textarea
                id="an-ata"
                value={anAta}
                onChange={(e) => setAnAta(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                aria-label="Ata da reunião"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="an-anexo" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
                Anexo
              </label>
              <input
                id="an-anexo"
                type="file"
                onChange={(e) => setAnFiles(Array.from(e.target.files ?? []))}
                style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                aria-label="Anexo"
              />
              {anFiles.length > 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{anFiles.map((f) => f.name).join(", ")}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={anSalvando}
                onClick={fecharModalRegistrarAnotacao}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: anSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={anSalvando}
                onClick={() => void salvarAnotacaoRh()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: anSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {anSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {histModalRow ? (
        <ModalBase maxWidth={720} onClose={fecharModalHistorico}>
          <ModalHeader title="Histórico" onClose={fecharModalHistorico} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{histModalRow.nome}</strong>
            </div>
            <ListaHistoricoRh items={histModalItems} loading={histModalLoading} t={t} />
          </div>
        </ModalBase>
      ) : null}

      {prestadorExcluirConfirm ? (
        <ModalBase
          maxWidth={440}
          onClose={() => {
            if (!excluindoPrestador) setPrestadorExcluirConfirm(null);
          }}
        >
          <ModalHeader
            title="Excluir prestador?"
            onClose={() => {
              if (!excluindoPrestador) setPrestadorExcluirConfirm(null);
            }}
          />
          <div style={{ padding: "0 4px 8px", fontFamily: FONT.body }}>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: t.text, lineHeight: 1.5 }}>
              Esta ação remove permanentemente o cadastro de{" "}
              <strong>{prestadorExcluirConfirm.nome}</strong> (CPF {somenteDigitos(prestadorExcluirConfirm.cpf)}). Não é possível desfazer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={excluindoPrestador}
                onClick={() => setPrestadorExcluirConfirm(null)}
                style={{ ...inputStyle, width: "auto", cursor: excluindoPrestador ? "not-allowed" : "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindoPrestador}
                onClick={() => void executarExclusaoPrestador()}
                style={{
                  ...inputStyle,
                  width: "auto",
                  border: "none",
                  background: "#e84025",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: excluindoPrestador ? "wait" : "pointer",
                }}
              >
                {excluindoPrestador ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Excluir
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

    </div>
  );
}
