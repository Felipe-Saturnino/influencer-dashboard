import type { FiltroBarCampoOption } from "../components/FiltroBarCampoSelect";
import type {
  RhSolicitacaoAba,
  RhSolicitacaoAbonoRemunerado,
  RhSolicitacaoFeedbackOrigem,
  RhSolicitacaoFeedbackRecomendacao,
  RhSolicitacaoFiltroStatus,
  RhSolicitacaoStatus,
  RhSolicitacaoTipo,
} from "../types/rhSolicitacao";

export const RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE = "todos" as const;
export const RH_SOLICITACAO_FILTRO_TODAS_VALUE = "todas" as const;

export const RH_SOLICITACAO_STATUS_DEFAULT: RhSolicitacaoStatus = "em_analise";

/** Carrossel partilhado — Aplicado entra no filtro Aprovado via `.in(aprovado, aplicado)`. */
export const RH_SOLICITACAO_STATUS_CARROSSEL: { key: RhSolicitacaoStatus; label: string }[] = [
  { key: "em_analise", label: "Em análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "rejeitado", label: "Rejeitado" },
];

export const RH_SOLICITACAO_TODOS_STATUS_LABEL = "Todos Status";

export const RH_SOLICITACAO_ABA_OPTIONS: readonly {
  key: RhSolicitacaoAba;
  label: string;
  sub: string;
}[] = [
  { key: "atestados", label: "Atestados", sub: "solicitações de atestado médico" },
  { key: "reunioes", label: "Reuniões", sub: "solicitações de reunião" },
  { key: "vagas", label: "Vagas", sub: "solicitações de abertura de vaga" },
  { key: "feedback", label: "Feedback", sub: "liderança · Controle de Turno e Solicitações" },
];

export const RH_SOLICITACAO_ABA_TIPOS: Record<RhSolicitacaoAba, readonly RhSolicitacaoTipo[]> = {
  atestados: ["atestado"],
  reunioes: ["reuniao_rh", "reuniao_lideranca"],
  vagas: ["vagas"],
  feedback: ["feedback"],
};

export const RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_LABEL: Record<
  RhSolicitacaoFeedbackRecomendacao,
  string
> = {
  orientacao: "Orientação",
  alinhamento: "Alinhamento de Execução",
  notif_descumprimento: "Notificação de Descumprimento Contratual",
  notif_suspensao: "Notificação de Suspensão da Execução Contratual",
  persistencia: "Persistência do Descumprimento",
};

export const RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_OPTIONS: readonly FiltroBarCampoOption[] = (
  Object.keys(RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_LABEL) as RhSolicitacaoFeedbackRecomendacao[]
).map((value) => ({
  value,
  label: RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_LABEL[value],
}));

export const RH_SOLICITACAO_FEEDBACK_ORIGEM_LABEL: Record<RhSolicitacaoFeedbackOrigem, string> = {
  controle_turno: "Controle de Turno",
  solicitacoes: "Solicitações",
};

/** Opções do select Atender — sem `aplicado` (grava-se `aprovado`; trigger mapeia no CT). */
export const RH_SOLICITACAO_STATUS_OPTIONS: readonly FiltroBarCampoOption[] = RH_SOLICITACAO_STATUS_CARROSSEL.map(
  (s) => ({ value: s.key, label: s.label }),
);

export const RH_SOLICITACAO_STATUS_CORES: Record<RhSolicitacaoStatus, string> = {
  em_analise: "#f59e0b",
  aprovado: "#22c55e",
  rejeitado: "#e84025",
  aplicado: "#22c55e",
};

export function labelStatusSolicitacao(status: RhSolicitacaoStatus | RhSolicitacaoFiltroStatus): string {
  if (status === "todos") return RH_SOLICITACAO_TODOS_STATUS_LABEL;
  if (status === "aplicado") return "Aplicado";
  return RH_SOLICITACAO_STATUS_CARROSSEL.find((s) => s.key === status)?.label ?? status;
}

export function labelTipoSolicitacao(tipo: RhSolicitacaoTipo): string {
  switch (tipo) {
    case "atestado":
      return "Atestado";
    case "vagas":
      return "Vagas";
    case "reuniao_rh":
      return "Reunião com RH";
    case "reuniao_lideranca":
      return "Reunião com Liderança";
    case "feedback":
      return "Feedback";
    default:
      return tipo;
  }
}

export function labelFeedbackRecomendacao(
  value: RhSolicitacaoFeedbackRecomendacao | null | undefined,
): string {
  if (!value) return "—";
  return RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_LABEL[value] ?? "—";
}

export function labelFeedbackOrigem(value: RhSolicitacaoFeedbackOrigem | null | undefined): string {
  if (!value) return "—";
  return RH_SOLICITACAO_FEEDBACK_ORIGEM_LABEL[value] ?? "—";
}

export function labelAbaSolicitacao(aba: RhSolicitacaoAba): string {
  return RH_SOLICITACAO_ABA_OPTIONS.find((a) => a.key === aba)?.label ?? aba;
}

export function subAbaSolicitacao(aba: RhSolicitacaoAba): string {
  return RH_SOLICITACAO_ABA_OPTIONS.find((a) => a.key === aba)?.sub ?? "";
}

/** Status do filtro Aprovado também inclui linhas `aplicado` (Feedback / sync CT). */
export function statusFiltroQueryValues(
  filtro: RhSolicitacaoFiltroStatus,
): RhSolicitacaoStatus[] | null {
  if (filtro === RH_SOLICITACAO_FILTRO_TODOS_STATUS_VALUE) return null;
  if (filtro === "aprovado") return ["aprovado", "aplicado"];
  return [filtro];
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

/** Coluna Descrição quando o carrossel filtra um status específico. */
export function descricaoColunaSolicitacao(
  tipo: RhSolicitacaoTipo,
  row: {
    atestado_inicio: string | null;
    atestado_fim: string | null;
    reuniao_dia_iso: string | null;
    descricao: string;
  },
): string {
  if (tipo === "atestado") return fmtPeriodoAtestadoSolicitacao(row.atestado_inicio, row.atestado_fim);
  if (tipo === "reuniao_rh" || tipo === "reuniao_lideranca") return fmtDataCurta(row.reuniao_dia_iso);
  return row.descricao.trim() || "—";
}
