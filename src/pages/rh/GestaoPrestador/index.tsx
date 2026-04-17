import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  ExternalLink,
  History,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  StickyNote,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
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
import type {
  RhFuncionario,
  RhFuncionarioHistorico,
  RhFuncionarioTipoContrato,
  RhHistoricoAcaoTipo,
} from "../../../types/rhFuncionario";
import { uploadAnexosAcaoRh } from "../../../lib/rhPrestadorAcaoFiles";
import type { RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader, useDialogTitleId } from "../../../components/OperacoesModal";
import { SkeletonTableRow } from "../../../components/dashboard/SkeletonCard";

const NIVEIS = ["Junior", "Pleno", "Senior", "Especialista", "Gestor"] as const;

const TIPOS_CONTRATO: { value: RhFuncionarioTipoContrato; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Estagio", label: "Estágio" },
  { value: "Temporario", label: "Temporário" },
];

const ESCALAS_SUGEST = ["5x2", "6x1", "12x36", "12x48", "8x6", "Comercial"];

/** Ativos + indisponíveis (exclui encerrados). */
type FiltroStatusPrestador = "disponiveis" | RhFuncionario["status"];

const HIST_TIPO_LABEL: Record<string, string> = {
  revisao_contrato: "Revisão de Contrato",
  periodo_indisponibilidade: "Período de Indisponibilidade",
  retorno_indisponibilidade: "Retorno de Indisponibilidade",
  alinhamento_formal: "Alinhamento Formal",
  termino_prestacao: "Término da Prestação",
  reativacao_prestacao: "Reativação da Prestação",
  rh_talks: "RH Talks",
  anotacao_rh: "Anotação do RH",
};

/** Fundo e borda suaves por tipo de ação (modal Histórico). */
const HIST_TIPO_SURFACE: Record<string, { bg: string; border: string }> = {
  revisao_contrato: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.38)" },
  periodo_indisponibilidade: { bg: "rgba(245, 158, 11, 0.14)", border: "rgba(245, 158, 11, 0.42)" },
  retorno_indisponibilidade: { bg: "rgba(167, 139, 250, 0.16)", border: "rgba(167, 139, 250, 0.42)" },
  alinhamento_formal: { bg: "rgba(249, 115, 22, 0.14)", border: "rgba(249, 115, 22, 0.4)" },
  termino_prestacao: { bg: "rgba(232, 64, 37, 0.1)", border: "rgba(232, 64, 37, 0.36)" },
  reativacao_prestacao: { bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.4)" },
  /** Cinza semântico (neutro) — RH Talks */
  rh_talks: { bg: "rgba(107, 114, 128, 0.14)", border: "rgba(107, 114, 128, 0.42)" },
  /** Tom próprio para anotações (diferente do cinza dos Talks) */
  anotacao_rh: { bg: "rgba(100, 116, 139, 0.12)", border: "rgba(100, 116, 139, 0.38)" },
};

function cardStyleHistoricoPorTipo(tipo: string, t: { cardBorder: string; inputBg: string }): CSSProperties {
  const c = HIST_TIPO_SURFACE[tipo];
  return {
    marginBottom: 14,
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${c?.border ?? t.cardBorder}`,
    background: c?.bg ?? t.inputBg,
    fontFamily: FONT.body,
    fontSize: 13,
  };
}

function ListaHistoricoRh({
  items,
  loading,
  t,
}: {
  items: RhFuncionarioHistorico[];
  loading: boolean;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  if (loading) {
    return (
      <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
        Carregando histórico…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Sem dados para o período selecionado.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((h) => {
        const anexos = Array.isArray(h.anexos)
          ? (h.anexos as { name?: string; publicUrl: string }[]).filter((a) => a?.publicUrl)
          : [];
        const det = h.detalhes ?? {};
        const titulo = HIST_TIPO_LABEL[h.tipo] ?? h.tipo;
        const quando = new Date(h.created_at).toLocaleString("pt-BR");
        return (
          <li key={h.id} style={cardStyleHistoricoPorTipo(h.tipo, t)}>
            <div style={{ fontWeight: 800, color: t.text, marginBottom: 6 }}>{titulo}</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
              {quando}
              {det.usuario_label ? ` · ${String(det.usuario_label)}` : ""}
            </div>
            {"alteracoes" in det && Array.isArray(det.alteracoes) ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: t.text }}>
                {(det.alteracoes as { campo: string; antes: string; depois: string }[]).map((alt, j) => (
                  <li key={j} style={{ marginBottom: 4 }}>
                    <strong>{alt.campo}:</strong> {alt.antes} → {alt.depois}
                  </li>
                ))}
              </ul>
            ) : null}
            {h.tipo === "periodo_indisponibilidade" && "data_saida" in det ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <div>
                  <strong>Data de saída:</strong> {String(det.data_saida ?? "—")}
                </div>
                {det.data_retorno ? (
                  <div>
                    <strong>Data de retorno:</strong> {String(det.data_retorno)}
                  </div>
                ) : null}
                {det.observacao ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Observação:</strong> {String(det.observacao)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "termino_prestacao" && "data_termino" in det ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <div>
                  <strong>Data de término:</strong> {String(det.data_termino ?? "—")}
                </div>
                {det.observacao ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Observação:</strong> {String(det.observacao)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "retorno_indisponibilidade" && det.observacao ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <strong>Observação:</strong> {String(det.observacao)}
              </div>
            ) : null}
            {h.tipo === "alinhamento_formal" && det.observacao ? (
              <div style={{ color: t.text, marginTop: 6 }}>
                <strong>Observação:</strong> {String(det.observacao)}
              </div>
            ) : null}
            {h.tipo === "rh_talks" ? (
              <div style={{ color: t.text, marginTop: 6, lineHeight: 1.5 }}>
                {det.assunto ? (
                  <div>
                    <strong>Assunto:</strong> {String(det.assunto)}
                  </div>
                ) : null}
                {det.data_rh_talks ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Data do RH Talks:</strong> {fmtDataIsoPtBr(String(det.data_rh_talks))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {h.tipo === "anotacao_rh" ? (
              <div style={{ color: t.text, marginTop: 6, lineHeight: 1.5 }}>
                {det.tipo_visibilidade ? (
                  <div>
                    <strong>Tipo:</strong> {String(det.tipo_visibilidade)}
                  </div>
                ) : null}
                {det.assunto ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Assunto:</strong> {String(det.assunto)}
                  </div>
                ) : null}
                {det.data_conversa ? (
                  <div style={{ marginTop: 4 }}>
                    <strong>Data da conversa:</strong> {fmtDataIsoPtBr(String(det.data_conversa))}
                  </div>
                ) : null}
                {det.ata_reuniao ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Ata da reunião:</strong>
                    <pre
                      style={{
                        margin: "6px 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        color: t.text,
                        maxHeight: 220,
                        overflow: "auto",
                        padding: 8,
                        borderRadius: 8,
                        background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                      }}
                    >
                      {String(det.ata_reuniao)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
            {anexos.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
                {anexos.map((a, k) => (
                  <a
                    key={k}
                    href={a.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--brand-action, #7c3aed)",
                      fontWeight: 600,
                    }}
                  >
                    <Paperclip size={14} aria-hidden />
                    {a.name || "Anexo"}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

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

/** Formata `YYYY-MM-DD` ou ISO para exibição pt-BR; vazio → "—". */
function fmtDataIsoPtBr(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return "—";
  const s = String(iso).slice(0, 10);
  const p = s.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
  return s;
}

type SliceContratacao = {
  org_time_id: string | null;
  setor: string;
  cargo: string;
  nivel: string;
  salarioCentavos: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  escala: string;
  data_funcao: string;
};

function sliceContratacaoDeForm(f: FormState): SliceContratacao {
  return {
    org_time_id: f.org_time_id,
    setor: f.setor.trim(),
    cargo: f.cargo.trim(),
    nivel: f.nivel.trim(),
    salarioCentavos: f.salarioCentavos,
    tipo_contrato: f.tipo_contrato,
    escala: f.escala.trim(),
    data_funcao: (f.data_funcao ?? "").trim().slice(0, 10),
  };
}

function sliceContratacaoDeRow(r: RhFuncionario): SliceContratacao {
  const cents = Math.round(Number(r.salario) * 100).toString();
  const df = r.data_funcao ? String(r.data_funcao).slice(0, 10) : "";
  return {
    org_time_id: r.org_time_id ?? null,
    setor: r.setor.trim(),
    cargo: r.cargo.trim(),
    nivel: r.nivel.trim(),
    salarioCentavos: cents,
    tipo_contrato: r.tipo_contrato,
    escala: r.escala.trim(),
    data_funcao: df,
  };
}

function labelTimeOrganograma(id: string | null, opcoes: RhOrgTimeOpcao[]): string {
  if (!id) return "—";
  return opcoes.find((o) => o.timeId === id)?.label ?? id;
}

function diffContratacaoSlices(
  antes: SliceContratacao,
  depois: SliceContratacao,
  opcoes: RhOrgTimeOpcao[],
  fmtSal: (cents: string) => string,
): { campo: string; antes: string; depois: string }[] {
  const out: { campo: string; antes: string; depois: string }[] = [];
  const orgAntes = labelTimeOrganograma(antes.org_time_id, opcoes) || antes.setor || "—";
  const orgDepois = labelTimeOrganograma(depois.org_time_id, opcoes) || depois.setor || "—";
  if (orgAntes !== orgDepois || antes.setor !== depois.setor) {
    out.push({ campo: "Organograma", antes: orgAntes, depois: orgDepois });
  }
  if (antes.cargo !== depois.cargo) out.push({ campo: "Função", antes: antes.cargo || "—", depois: depois.cargo || "—" });
  if (antes.nivel !== depois.nivel) out.push({ campo: "Nível", antes: antes.nivel, depois: depois.nivel });
  if (antes.salarioCentavos !== depois.salarioCentavos) {
    out.push({
      campo: "Remuneração mensal",
      antes: fmtSal(antes.salarioCentavos),
      depois: fmtSal(depois.salarioCentavos),
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
  if (!r.res_logradouro?.trim() || !r.res_cidade?.trim()) return true;
  const uf = (r.res_estado ?? "").trim().toUpperCase();
  if (uf.length !== 2 || !UFS_BR.includes(uf as (typeof UFS_BR)[number])) return true;
  const cep = somenteDigitos(r.res_cep ?? "");
  if (cep.length !== 8) return true;
  if (!r.emerg_nome?.trim()) return true;
  const telE = somenteDigitos(r.emerg_telefone ?? "");
  if (telE.length < 10 || telE.length > 11) return true;
  if (temOrganograma) {
    if (!r.org_time_id && !r.setor?.trim()) return true;
  } else if (!r.setor?.trim()) return true;
  if (!r.cargo?.trim() || !r.nivel?.trim() || !r.escala?.trim()) return true;
  if (!r.data_inicio?.trim()) return true;
  if (r.tipo_contrato === "PJ") {
    const cnpj = somenteDigitos(r.cnpj);
    if (cnpj.length !== 14 || !validarCnpjDigitos(cnpj)) return true;
    if (!r.nome_empresa?.trim() || !r.emp_logradouro?.trim() || !r.emp_cidade?.trim()) return true;
    const ufe = (r.emp_estado ?? "").trim().toUpperCase();
    if (ufe.length !== 2 || !UFS_BR.includes(ufe as (typeof UFS_BR)[number])) return true;
    const cepE = somenteDigitos(r.emp_cep ?? "");
    if (cepE.length !== 8) return true;
  }
  if (!r.banco?.trim() || !r.agencia?.trim() || !r.conta_corrente?.trim()) return true;
  if (Number(r.salario) <= 0) return true;
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
  org_time_id: string | null;
  cargo: string;
  nivel: string;
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

type AbaPaginaRhFunc = "headcount" | "acoes_rh" | "anotacoes";

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
    org_time_id: null,
    cargo: "",
    nivel: "Pleno",
    salarioCentavos: "",
    data_inicio: "",
    data_funcao: "",
    escala: "5x2",
    tipo_contrato: "CLT",
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
    org_time_id: f.org_time_id ?? null,
    cargo: f.cargo,
    nivel: f.nivel,
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
): Omit<RhFuncionario, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "data_desligamento"> & {
  status: RhFuncionario["status"];
  data_desligamento?: string | null;
} {
  const sal = podeVerDadosSensiveis ? numeroDeCentavosStr(form.salarioCentavos) : 0;
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
  const emergLinha = montarContatoEmergenciaLinha(form.emerg_nome, form.emerg_parentesco, form.emerg_telefone);
  return {
    status: statusPrestador,
    nome: form.nome.trim(),
    rg: form.rg.trim(),
    cpf: somenteDigitos(form.cpf),
    telefone: somenteDigitos(form.telefone),
    email: form.email.trim().toLowerCase(),
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
    setor: form.setor.trim(),
    org_time_id: form.org_time_id || null,
    cargo: form.cargo.trim(),
    nivel: form.nivel.trim(),
    salario: sal,
    data_inicio: form.data_inicio,
    data_funcao: form.data_funcao.trim() ? form.data_funcao.trim().slice(0, 10) : null,
    escala: form.escala.trim(),
    tipo_contrato: form.tipo_contrato,
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

  const [modalForm, setModalForm] = useState<"fechado" | "novo" | "editar" | "ver">("fechado");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(estadoVazioForm);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const [opcoesTimes, setOpcoesTimes] = useState<RhOrgTimeOpcao[]>([]);
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

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  useEffect(() => {
    if (permOrg.loading || permOrg.canView === "nao") {
      setOpcoesTimes([]);
      return;
    }
    let cancel = false;
    void (async () => {
      const { opcoes, error } = await carregarOpcoesTimesOrganograma();
      if (cancel) return;
      if (error) setOpcoesTimes([]);
      else setOpcoesTimes(opcoes);
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

  const diretoriasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesTimes.forEach((o) => u.add(o.diretoriaNome));
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesTimes]);

  const gerenciasOpcoes = useMemo(() => {
    const u = new Set<string>();
    opcoesTimes.forEach((o) => {
      if (filtroDiretoria && o.diretoriaNome !== filtroDiretoria) return;
      u.add(o.gerenciaNome);
    });
    return [...u].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [opcoesTimes, filtroDiretoria]);

  useEffect(() => {
    if (filtroGerencia && !gerenciasOpcoes.includes(filtroGerencia)) setFiltroGerencia("");
  }, [filtroGerencia, gerenciasOpcoes]);

  const usarSelectTime = useMemo(
    () => permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length > 0,
    [permOrg.canView, permOrg.loading, opcoesTimes.length],
  );

  const opcaoTimeSelecionada = useMemo(
    () => (form.org_time_id ? opcoesTimes.find((o) => o.timeId === form.org_time_id) ?? null : null),
    [form.org_time_id, opcoesTimes],
  );

  const opcaoTimeAcaoForm = useMemo(
    () => (acaoForm.org_time_id ? opcoesTimes.find((o) => o.timeId === acaoForm.org_time_id) ?? null : null),
    [acaoForm.org_time_id, opcoesTimes],
  );

  const ehPJ = form.tipo_contrato === "PJ";

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
        const o = r.org_time_id ? opcoesTimes.find((x) => x.timeId === r.org_time_id) : undefined;
        if (!o || o.diretoriaNome !== filtroDiretoria) return false;
      }
      if (filtroGerencia) {
        const o = r.org_time_id ? opcoesTimes.find((x) => x.timeId === r.org_time_id) : undefined;
        if (!o || o.gerenciaNome !== filtroGerencia) return false;
      }
      if (!b) return true;
      if (digits.length === 11 && r.cpf === digits) return true;
      if (r.nome.toLowerCase().includes(b)) return true;
      if (r.email.toLowerCase().includes(b)) return true;
      if (r.cpf.includes(digits) && digits.length >= 3) return true;
      return false;
    });
  }, [lista, busca, filtroSetor, filtroContrato, filtroStatus, filtroDiretoria, filtroGerencia, opcoesTimes]);

  const resumoPrestadoresCards = useMemo(() => {
    const temOrganograma = permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length > 0;
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
  }, [filtrada, permOrg.canView, permOrg.loading, opcoesTimes.length]);

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
    setEditId(null);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("novo");
  };

  const abrirEditar = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("editar");
  };

  const abrirVer = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("ver");
  };

  const orgMetaLinha = useCallback(
    (row: RhFuncionario) => {
      if (!row.org_time_id) return { diretoria: "—", gerencia: "—" };
      const o = opcoesTimes.find((x) => x.timeId === row.org_time_id);
      return { diretoria: o?.diretoriaNome ?? "—", gerencia: o?.gerenciaNome ?? "—" };
    },
    [opcoesTimes],
  );

  const liderImediatoLinha = useCallback(
    (row: RhFuncionario) => {
      if (!row.org_time_id) return "—";
      return opcoesTimes.find((x) => x.timeId === row.org_time_id)?.gestorNome ?? "—";
    },
    [opcoesTimes],
  );

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
          res_complemento: s.res_complemento.trim() || r.complemento,
          res_cidade: s.res_cidade.trim() || r.cidade,
          res_estado: (s.res_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      } else {
        setForm((s) => ({
          ...s,
          emp_logradouro: s.emp_logradouro.trim() || r.logradouro,
          emp_complemento: s.emp_complemento.trim() || r.complemento,
          emp_cidade: s.emp_cidade.trim() || r.cidade,
          emp_estado: (s.emp_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      }
    })();
  };

  function validarFormulario(): boolean {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, label: string, v: string) => {
      if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
    };

    req("nome", "Nome completo", form.nome);
    req("rg", "RG", form.rg);
    req("telefone", "Telefone", form.telefone);
    req("email", "E-mail", form.email);
    req("res_logradouro", "Logradouro (residencial)", form.res_logradouro);
    req("res_cidade", "Cidade (residencial)", form.res_cidade);
    if (!form.res_estado.trim()) e.res_estado = "UF (residencial) é obrigatória.";
    else if (!UFS_BR.includes(form.res_estado.trim().toUpperCase() as (typeof UFS_BR)[number])) {
      e.res_estado = "UF inválida.";
    }
    const cepRes = somenteDigitos(form.res_cep);
    if (cepRes.length > 0 && cepRes.length !== 8) e.res_cep = "CEP residencial deve ter 8 dígitos.";
    req("emerg_nome", "Nome do contato de emergência", form.emerg_nome);
    req("emerg_telefone", "Telefone do contato de emergência", form.emerg_telefone);
    const usarSelectTime = permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length > 0;
    if (usarSelectTime) {
      if (modalForm === "novo" && !form.org_time_id) {
        e.org_time_id = "Selecione o organograma.";
      }
      if (!form.org_time_id && !form.setor.trim()) {
        e.setor = "Informe o setor ou selecione um time.";
      }
    } else {
      req("setor", "Setor", form.setor);
    }
    req("cargo", "Função", form.cargo);
    req("data_inicio", "Data de início", form.data_inicio);
    req("escala", "Escala", form.escala);
    if (form.tipo_contrato === "PJ") {
      req("nome_empresa", "Nome da empresa", form.nome_empresa);
      req("emp_logradouro", "Logradouro da empresa", form.emp_logradouro);
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

    const telD = somenteDigitos(form.telefone);
    if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";

    const telEmerg = somenteDigitos(form.emerg_telefone);
    if (telEmerg.length < 10 || telEmerg.length > 11) e.emerg_telefone = "Telefone de emergência inválido.";

    if (podeVerDadosSensiveis) {
      const sal = numeroDeCentavosStr(form.salarioCentavos);
      if (sal <= 0) e.salarioCentavos = "Informe a remuneração mensal.";
    }

    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  const montarPayload = (statusPrestador: RhFuncionario["status"]) =>
    buildRhFuncionarioPayloadFromState(form, statusPrestador, podeVerDadosSensiveis);

  const salvar = async (opts?: { outro?: boolean }) => {
    if (modalForm === "ver") return;
    if (!validarFormulario()) return;
    setSalvando(true);
    setErroGlobal(null);
    const payload = montarPayload("ativo");
    const cadastrarOutro = opts?.outro === true;

    if (modalForm === "novo") {
      const { error } = await supabase.from("rh_funcionarios").insert(payload);
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      setSucessoMsg("Funcionário cadastrado.");
      await carregar();
      if (cadastrarOutro) {
        setForm(estadoVazioForm());
        setFieldErr({});
        setAbaModal("pessoais");
      } else {
        setModalForm("fechado");
        setAbaModal("pessoais");
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
              banco: atual.banco,
              agencia: atual.agencia,
              conta_corrente: atual.conta_corrente,
              pix: atual.pix,
            }
          : { ...payloadEdit, salario: salarioFinal };
      const { error } = await supabase.from("rh_funcionarios").update(mesclado).eq("id", editId);
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      setSucessoMsg("Dados atualizados.");
      setModalForm("fechado");
      setAbaModal("pessoais");
      await carregar();
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
          const usarST = permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length > 0;
          if (usarST && !acaoForm.org_time_id) {
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
          if (!acaoForm.data_funcao.trim()) {
            setErroGlobal("Informe a data da Função.");
            setAcaoSalvando(false);
            return;
          }
          if (podeVerDadosSensiveis && numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
            setErroGlobal("Informe a remuneração mensal.");
            setAcaoSalvando(false);
            return;
          }
          const antes = acaoBaselineRef.current ?? sliceContratacaoDeRow(acaoModalRow);
          const depois = sliceContratacaoDeForm(acaoForm);
          const diff = diffContratacaoSlices(antes, depois, opcoesTimes, fmtSal);
          if (diff.length === 0) {
            setErroGlobal("Nenhuma alteração para registrar.");
            setAcaoSalvando(false);
            return;
          }
          const sal = podeVerDadosSensiveis ? numeroDeCentavosStr(acaoForm.salarioCentavos) : acaoModalRow.salario;
          const df = acaoForm.data_funcao.trim().slice(0, 10);
          const { error: eUp } = await supabase
            .from("rh_funcionarios")
            .update({
              org_time_id: acaoForm.org_time_id || null,
              setor: acaoForm.setor.trim(),
              cargo: acaoForm.cargo.trim(),
              nivel: acaoForm.nivel.trim(),
              salario: sal,
              tipo_contrato: acaoForm.tipo_contrato,
              escala: acaoForm.escala.trim(),
              data_funcao: df,
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
          const det: Record<string, unknown> = { data_termino: acaoDtTermino, observacao: acaoObs.trim() };
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
          const usarSTR = permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length > 0;
          if (usarSTR && !acaoForm.org_time_id) {
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
          if (!(acaoForm.observacao_rh ?? "").trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          if (podeVerDadosSensiveis && numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
            setErroGlobal("Informe a remuneração mensal.");
            setAcaoSalvando(false);
            return;
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
          const diffContrato = diffContratacaoSlices(antes, depois, opcoesTimes, fmtSal);
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
  const bloquearOrgEdit = Boolean(usarSelectTime && snapshotEdicao?.org_time_id);
  const bloquearSetorManualEdit = Boolean(!usarSelectTime && snapshotEdicao && snapshotEdicao.setor.trim());
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
  const lblReqCad = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {!leitura ? astReq : null}
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

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<UserCircle2 size={16} aria-hidden />}
        title="Gestão de Prestadores"
        subtitle="Cadastro, head count e fluxos de RH."
      />

      {erroGlobal ? (
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
                <th scope="col" style={getThStyle(t)}>
                  Nome
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Diretoria
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Gerência
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Função
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Líder imediato
                </th>
                {!tabelaSemSalario ? (
                  <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        width: "100%",
                      }}
                    >
                      <span>Remuneração Mensal</span>
                      {podeVerDadosSensiveis ? (
                        <button
                          type="button"
                          onClick={() => setTabelaSalarioVisivel((v) => !v)}
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
                      ) : null}
                    </div>
                  </th>
                ) : null}
                <th scope="col" style={getThStyle(t)}>
                  Status
                </th>
                <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
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
                filtrada.map((row, i) => {
                  const { diretoria, gerencia } = orgMetaLinha(row);
                  const lider = liderImediatoLinha(row);
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
                      <td style={{ ...getTdStyle(t), background: zebraStripe(i), maxWidth: 140 }} title={lider}>
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
                </button>
              );
            })}
          </div>

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
                  {lblReqCad("f-res-log", "Logradouro")}
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
                  {lbl("f-res-num", "Número")}
                  <input
                    id="f-res-num"
                    disabled={desabilitarCampos}
                    value={form.res_numero}
                    onChange={(e) => setForm((s) => ({ ...s, res_numero: e.target.value }))}
                    style={inputStyle}
                  />
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
                  {lblReqCad("f-res-cid", "Cidade")}
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
                  {lblReqCad("f-res-uf", "Estado (UF)")}
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
                  {lblReqCad("f-emerg-tel", "Telefone")}
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
                  {usarSelectTime ? (
                    <>
                      {!leitura ? (
                        <>
                          {lblReqCad("f-org-time", "Organograma")}
                          <select
                            id="f-org-time"
                            disabled={desabilitarCampos || bloquearOrgEdit}
                            value={form.org_time_id ?? ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) {
                                setForm((s) => ({ ...s, org_time_id: null, setor: "" }));
                                return;
                              }
                              const op = opcoesTimes.find((x) => x.timeId === id);
                              if (op) setForm((s) => ({ ...s, org_time_id: id, setor: op.timeNome }));
                            }}
                            aria-label="Organograma"
                            style={inputStyle}
                          >
                            <option value="">— Selecione —</option>
                            {opcoesTimes.map((o) => (
                              <option key={o.timeId} value={o.timeId}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {fieldErr.org_time_id ? (
                            <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.org_time_id}</div>
                          ) : null}
                        </>
                      ) : null}
                      {opcaoTimeSelecionada || (leitura && form.setor.trim()) ? (
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
                          {opcaoTimeSelecionada ? (
                            <>
                              <div>
                                <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoTimeSelecionada.diretoriaNome}
                              </div>
                              <div>
                                <strong style={{ color: t.text }}>Gerência:</strong> {opcaoTimeSelecionada.gerenciaNome}
                              </div>
                              <div>
                                <strong style={{ color: t.text }}>Time:</strong> {opcaoTimeSelecionada.timeNome}
                              </div>
                              <div>
                                <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoTimeSelecionada.gestorNome}
                              </div>
                            </>
                          ) : (
                            <div>
                              <strong style={{ color: t.text }}>Time:</strong> {form.setor}
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
                        onChange={(e) => setForm((s) => ({ ...s, setor: e.target.value, org_time_id: null }))}
                        style={inputStyle}
                        list="lista-setores"
                      />
                      <datalist id="lista-setores">
                        {setoresUnicos.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                      {permOrg.canView !== "nao" && !permOrg.loading && opcoesTimes.length === 0 ? (
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                          Nenhum time ativo no organograma. Cadastre a estrutura em RH → Organograma ou informe o setor manualmente.
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
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-tipo", "Tipo de contrato")}
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
                {podeVerDadosSensiveis ? (
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
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração mensal e dados bancários: visíveis apenas para administrador ou quem tem permissão de edição nesta página.
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
                  <input id="f-escala" disabled={desabilitarCampos || bloquearEscalaEdit} value={form.escala} onChange={(e) => setForm((s) => ({ ...s, escala: e.target.value }))} style={inputStyle} list="lista-escalas" />
                  <datalist id="lista-escalas">
                    {ESCALAS_SUGEST.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                  {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
                </div>
                {!leitura ? (
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
                  {lblReqCad("f-empnome", "Nome da empresa")}
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
                  {lblReqCad("f-cnpj", "CNPJ")}
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
                  {lblReqCad("f-emp-log", "Logradouro")}
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
                  {lbl("f-emp-num", "Número")}
                  <input
                    id="f-emp-num"
                    disabled={desabilitarCampos}
                    value={form.emp_numero}
                    onChange={(e) => setForm((s) => ({ ...s, emp_numero: e.target.value }))}
                    style={inputStyle}
                  />
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
                  {lblReqCad("f-emp-cid", "Cidade")}
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
                  {lblReqCad("f-emp-uf", "Estado (UF)")}
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
                    {lblReqCad("f-banco", "Banco")}
                    <input
                      id="f-banco"
                      disabled={desabilitarCampos}
                      value={form.banco}
                      onChange={(e) => setForm((s) => ({ ...s, banco: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.banco ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.banco}</div> : null}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-ag", "Agência")}
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
                    {lblReqCad("f-cc", "Conta corrente")}
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
                    {lbl("f-pix", "PIX (opcional)")}
                    <input
                      id="f-pix"
                      disabled={desabilitarCampos}
                      value={form.pix}
                      onChange={(e) => setForm((s) => ({ ...s, pix: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
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
                  {usarSelectTime ? (
                    <>
                      {lblReq("acao-org", "Organograma")}
                      <select
                        id="acao-org"
                        value={acaoForm.org_time_id ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) {
                            setAcaoForm((s) => ({ ...s, org_time_id: null, setor: "" }));
                            return;
                          }
                          const op = opcoesTimes.find((x) => x.timeId === id);
                          if (op) setAcaoForm((s) => ({ ...s, org_time_id: id, setor: op.timeNome }));
                        }}
                        aria-label="Organograma"
                        style={inputStyle}
                      >
                        <option value="">— Selecione —</option>
                        {opcoesTimes.map((o) => (
                          <option key={o.timeId} value={o.timeId}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {opcaoTimeAcaoForm ? (
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
                            <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoTimeAcaoForm.diretoriaNome}
                          </div>
                          <div>
                            <strong style={{ color: t.text }}>Gerência:</strong> {opcaoTimeAcaoForm.gerenciaNome}
                          </div>
                          <div>
                            <strong style={{ color: t.text }}>Time:</strong> {opcaoTimeAcaoForm.timeNome}
                          </div>
                          <div>
                            <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoTimeAcaoForm.gestorNome}
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
                        onChange={(e) => setAcaoForm((s) => ({ ...s, setor: e.target.value, org_time_id: null }))}
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
                <div style={{ marginBottom: 10 }}>
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
                {podeVerDadosSensiveis ? (
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
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração mensal: visível apenas para quem tem permissão de edição.
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-escala", "Escala")}
                  <input
                    id="acao-escala"
                    value={acaoForm.escala}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, escala: e.target.value }))}
                    style={inputStyle}
                    list="lista-escalas-acao"
                  />
                  <datalist id="lista-escalas-acao">
                    {ESCALAS_SUGEST.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </div>
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
    </div>
  );
}
