import type { FiltroBarCampoOption } from "../components/FiltroBarCampoSelect";
import type {
  CsChamadoAtuacao,
  CsChamadoHistoricoTipo,
  CsChamadoOrigem,
  CsChamadoRow,
  CsChamadoStatus,
} from "../types/csAtendimento";

export const CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE = "todos" as const;
export const CS_ATENDIMENTO_TODOS_STATUS_LABEL = "Todos Status";
export const CS_ATENDIMENTO_STATUS_DEFAULT: CsChamadoStatus = "aberto";

export const CS_ATENDIMENTO_FILTRO_TODOS_VALUE = "todos" as const;
export const CS_ATENDIMENTO_FILTRO_NENHUM_VALUE = "nenhum" as const;
export const CS_ATENDIMENTO_FILTRO_TODOS_LABEL = "Todos";
export const CS_ATENDIMENTO_FILTRO_NENHUM_LABEL = "Nenhum";

export const CS_ATENDIMENTO_ORIGEM_SITE_SPIN = "site_spin" as const;
export const CS_ATENDIMENTO_ORIGEM_EMAIL = "email" as const;
export const CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM = "instagram_dm" as const;
export const CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO = "instagram_comentario" as const;
export const CS_ATENDIMENTO_ABA_INSTAGRAM = "instagram" as const;
export const CS_ATENDIMENTO_ABA_SITE_SPIN_LABEL = "Site Spin";
export const CS_ATENDIMENTO_ABA_EMAIL_LABEL = "E-mail";
export const CS_ATENDIMENTO_ABA_INSTAGRAM_LABEL = "Instagram";
export const CS_ATENDIMENTO_CONTA_INSTAGRAM = "@spingamingbrasil";
export const CS_ATENDIMENTO_INSTAGRAM_TAB_COLOR = "#e1306c";

export const CS_ATENDIMENTO_INSTAGRAM_POST_TIPO_LABEL: Record<string, string> = {
  foto: "Foto",
  video: "Vídeo",
  reel: "Reel",
  carousel: "Carrossel",
};

export const CS_ATENDIMENTO_STATUS_CARROSSEL: { key: CsChamadoStatus; label: string }[] = [
  { key: "aberto", label: "Aberto" },
  { key: "em_andamento", label: "Em Andamento" },
  { key: "arquivado", label: "Arquivado" },
];

export const CS_ATENDIMENTO_STATUS_CORES: Record<CsChamadoStatus, string> = {
  aberto: "#f59e0b",
  em_andamento: "#1e36f8",
  arquivado: "#6b7280",
};

export const CS_ATENDIMENTO_ATUACAO_LABEL: Record<CsChamadoAtuacao, string> = {
  operador: "Operador",
  provedor: "Provedor",
  parceria: "Parceria",
  agregador: "Agregador",
  jogador: "Jogador",
  outros: "Outros",
};

export const CS_ATENDIMENTO_ATUACOES_COM_EMPRESA: CsChamadoAtuacao[] = ["operador", "provedor", "parceria", "agregador"];

export function csAtuacaoExigeEmpresa(atuacao: CsChamadoAtuacao): boolean {
  return CS_ATENDIMENTO_ATUACOES_COM_EMPRESA.includes(atuacao);
}

export const CS_ATENDIMENTO_HISTORICO_LABEL: Record<CsChamadoHistoricoTipo, string> = {
  abertura: "Abertura do chamado",
  inicio_atendimento: "Início do atendimento",
  anotacao: "Anotação",
  alteracao_status: "Alteração de status",
  arquivamento: "Arquivamento",
};

export function labelStatusChamado(status: CsChamadoStatus): string {
  return CS_ATENDIMENTO_STATUS_CARROSSEL.find((s) => s.key === status)?.label ?? status;
}

export function fmtDataChamado(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function isCsChamadoOrigemInstagram(origem: CsChamadoOrigem): boolean {
  return origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM || origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO;
}

export function fmtTempoRespostaChamado(aberturaIso: string, respostaIso: string | null | undefined): string {
  return fmtSlaChamado(aberturaIso, respostaIso);
}

/** Coluna SLA na aba Instagram — Mensagens (Todos Status). */
export function slaInstagramDmTodosStatus(row: CsChamadoRow): string {
  if (row.status === "em_andamento") {
    return fmtTempoRespostaChamado(row.created_at, row.primeira_resposta_em);
  }
  if (row.status === "aberto") return "—";
  return fmtSlaChamado(row.created_at, row.arquivado_em);
}

/** Coluna SLA na aba Instagram — Comentários (Todos Status). */
export function slaInstagramComentTodosStatus(row: CsChamadoRow): string {
  if (row.status === "arquivado") {
    return fmtSlaChamado(row.created_at, row.arquivado_em);
  }
  return "—";
}

export function fmtSlaChamado(aberturaIso: string, arquivadoIso: string | null | undefined): string {
  if (!arquivadoIso) return "—";
  const ms = new Date(arquivadoIso).getTime() - new Date(aberturaIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const dias = Math.floor(totalMin / (60 * 24));
  const horas = Math.floor((totalMin % (60 * 24)) / 60);
  if (dias > 0) return `${dias}d ${horas}h`;
  const min = totalMin % 60;
  if (horas > 0) return `${horas}h ${min}m`;
  return `${min}m`;
}

export function opcoesStatusAtender(statusAtual: CsChamadoStatus): FiltroBarCampoOption[] {
  if (statusAtual === "aberto") {
    return [
      { value: "em_andamento", label: "Em Andamento" },
      { value: "arquivado", label: "Arquivado" },
    ];
  }
  if (statusAtual === "em_andamento") {
    return [{ value: "arquivado", label: "Arquivado" }];
  }
  return [];
}
