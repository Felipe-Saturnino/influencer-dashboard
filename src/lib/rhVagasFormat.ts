import type { RhVagaCandidaturaEtapa, RhVagasCandidaturasFiltroTipo } from "../types/rhVagaCandidatura";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../types/rhVaga";

export function hojeIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ontem no fuso local do navegador (paridade com rh_vagas_ontem_sp no banco). */
export function ontemIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inscrições encerradas: data fim <= ontem. */
export function inscricoesEncerradasPorDataFim(dataFimInscricoes: string | null | undefined): boolean {
  const fim = dataIsoDateOnly(dataFimInscricoes);
  if (!fim) return false;
  return fim <= ontemIsoDate();
}

/** Status efetivo quando o banco ainda não sincronizou (ex.: antes do RPC na listagem). */
export function statusVagaEfetivo(v: Pick<RhVagaRow, "status" | "data_fim_inscricoes">): RhVagaStatus {
  if (v.status === "aberta" && inscricoesEncerradasPorDataFim(v.data_fim_inscricoes)) return "em_andamento";
  return v.status;
}

export function dataIsoDateOnly(v: string | null | undefined): string {
  if (!v?.trim()) return "";
  return v.slice(0, 10);
}

export type RhVagaTipoSelecionavel = "interna" | "externa";

/** Valor inicial no formulário (vagas legadas `mista` viram interna). */
export function tipoVagaParaEdicao(tipo: RhVagaTipo): RhVagaTipoSelecionavel {
  return tipo === "externa" ? "externa" : "interna";
}

export function normalizarBuscaVaga(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function organogramaLabelDeVaga(v: RhVagaRow): string {
  const t = v.org_time;
  if (t?.nome) {
    const g = t.gerencia?.nome?.trim();
    const d = t.gerencia?.diretoria?.nome?.trim();
    if (d && g) return `${d} › ${g} › ${t.nome}`;
    if (g) return `${g} › ${t.nome}`;
    return t.nome;
  }
  const ger = v.org_gerencia;
  if (ger?.nome) {
    const d = ger.diretoria?.nome?.trim();
    return d ? `${d} › ${ger.nome}` : ger.nome;
  }
  const dir = v.org_diretoria;
  if (dir?.nome) return dir.nome;
  return "—";
}

export function vagaPassaBuscaNomeOuDiretoria(v: RhVagaRow, buscaRaw: string): boolean {
  const q = normalizarBuscaVaga(buscaRaw);
  if (!q) return true;
  if (normalizarBuscaVaga(v.titulo).includes(q)) return true;
  if (v.codigo_vaga && normalizarBuscaVaga(v.codigo_vaga).includes(q)) return true;
  const org = organogramaLabelDeVaga(v);
  if (org !== "—" && normalizarBuscaVaga(org).includes(q)) return true;
  return false;
}

export function labelVagaComCodigo(v: Pick<RhVagaRow, "codigo_vaga" | "titulo">): string {
  const cod = (v.codigo_vaga ?? "").trim();
  const tit = (v.titulo ?? "").trim();
  if (cod && tit) return `${cod} - ${tit}`;
  return tit || cod || "—";
}

export function vagaPassaFiltroTipoCandidaturas(tipo: RhVagaTipo, filtro: RhVagasCandidaturasFiltroTipo): boolean {
  if (filtro === "todos") return true;
  if (filtro === "interno") return tipo === "interna" || tipo === "mista";
  return tipo === "externa" || tipo === "mista";
}

export const RH_VAGA_CANDIDATURA_ETAPAS: { id: RhVagaCandidaturaEtapa; label: string }[] = [
  { id: "inscritos", label: "Inscritos" },
  { id: "aguardando_retorno", label: "Aguardando Retorno" },
  { id: "agendado", label: "Agendado" },
  { id: "em_avaliacao", label: "Em Avaliação" },
  { id: "aprovado", label: "Aprovado" },
  { id: "stand_by", label: "Stand By" },
  { id: "contratado", label: "Contratado" },
  { id: "dispensado", label: "Dispensado" },
];

export function labelEtapaCandidatura(etapa: RhVagaCandidaturaEtapa): string {
  return RH_VAGA_CANDIDATURA_ETAPAS.find((e) => e.id === etapa)?.label ?? etapa;
}

export function emailCandidaturaDeJoin(f: { email?: string; email_spin?: string | null } | null | undefined): string {
  const spin = (f?.email_spin ?? "").trim();
  if (spin) return spin;
  return (f?.email ?? "").trim() || "—";
}

export function labelSimNao(valor: boolean): string {
  return valor ? "Sim" : "Não";
}

export function labelTipoVaga(tipo: RhVagaTipo): string {
  if (tipo === "interna") return "Interna";
  if (tipo === "externa") return "Externa";
  return "Interna e externa";
}

export function labelStatusVaga(s: RhVagaStatus): string {
  if (s === "aberta") return "Aberta";
  if (s === "em_andamento") return "Em andamento";
  if (s === "concluida") return "Concluída";
  return "Cancelada";
}

export function fmtDataBR(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return "—";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
