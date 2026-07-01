import type { FiltroBarCampoOption } from "../components/FiltroBarCampoSelect";
import type {
  RhSolicitacaoAbonoRemunerado,
  RhSolicitacaoFiltroStatus,
  RhSolicitacaoStatus,
  RhSolicitacaoTipo,
} from "../types/rhSolicitacao";

export const RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE = "todos" as const;
export const RH_SOLICITACAO_FILTRO_TODAS_VALUE = "todas" as const;

export const RH_SOLICITACAO_STATUS_DEFAULT: RhSolicitacaoStatus = "em_analise";

export const RH_SOLICITACAO_STATUS_CARROSSEL: { key: RhSolicitacaoStatus; label: string }[] = [
  { key: "em_analise", label: "Em análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "rejeitado", label: "Rejeitado" },
];

export const RH_SOLICITACAO_TODOS_STATUS_LABEL = "Todos Status";

export const RH_SOLICITACAO_TIPO_OPTIONS: readonly FiltroBarCampoOption[] = [
  { value: "atestado", label: "Atestado" },
  { value: "vagas", label: "Vagas" },
  { value: "reuniao_rh", label: "Reunião com RH" },
];

export const RH_SOLICITACAO_STATUS_OPTIONS: readonly FiltroBarCampoOption[] = RH_SOLICITACAO_STATUS_CARROSSEL.map(
  (s) => ({ value: s.key, label: s.label }),
);

export const RH_SOLICITACAO_STATUS_CORES: Record<RhSolicitacaoStatus, string> = {
  em_analise: "#f59e0b",
  aprovado: "#22c55e",
  rejeitado: "#e84025",
};

export function labelStatusSolicitacao(status: RhSolicitacaoStatus | RhSolicitacaoFiltroStatus): string {
  if (status === "todos") return RH_SOLICITACAO_TODOS_STATUS_LABEL;
  return RH_SOLICITACAO_STATUS_CARROSSEL.find((s) => s.key === status)?.label ?? status;
}

export function labelTipoSolicitacao(tipo: RhSolicitacaoTipo): string {
  return RH_SOLICITACAO_TIPO_OPTIONS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function fmtDataSolicitacao(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export const RH_SOLICITACAO_ABONO_OPCOES: readonly { value: RhSolicitacaoAbonoRemunerado; label: string }[] = [
  { value: "sim", label: "SIM" },
  { value: "nao", label: "NÃO" },
];

export function labelAbonoRemunerado(val: RhSolicitacaoAbonoRemunerado | null | undefined): string {
  if (!val) return "—";
  return RH_SOLICITACAO_ABONO_OPCOES.find((o) => o.value === val)?.label ?? "—";
}

export function fmtDataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return "—";
    return `${d}/${m}/${y}`;
  } catch {
    return "—";
  }
}

/** Período do atestado para tabela/modal (tipo atestado). */
export function fmtPeriodoAtestadoSolicitacao(
  inicio: string | null | undefined,
  fim: string | null | undefined,
): string {
  const ini = fmtDataCurta(inicio);
  const end = fmtDataCurta(fim);
  if (ini === "—" && end === "—") return "—";
  return `${ini} — ${end}`;
}

/** Coluna Descrição quando o carrossel filtra um status específico (vagas: evoluir depois). */
export function descricaoColunaSolicitacao(tipo: RhSolicitacaoTipo, row: {
  atestado_inicio: string | null;
  atestado_fim: string | null;
  reuniao_dia_iso: string | null;
  descricao: string;
}): string {
  if (tipo === "atestado") return fmtPeriodoAtestadoSolicitacao(row.atestado_inicio, row.atestado_fim);
  if (tipo === "reuniao_rh") return fmtDataCurta(row.reuniao_dia_iso);
  return row.descricao.trim() || "—";
}
