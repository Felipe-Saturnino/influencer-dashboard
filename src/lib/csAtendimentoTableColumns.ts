import { CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE } from "./csAtendimentoConstants";
import type { CsAtendimentoAbaOrigem, CsChamadoFiltroStatus, CsChamadoRow } from "../types/csAtendimento";

export type { CsAtendimentoAbaOrigem };

export type SortColSiteSpin = "chamado" | "data" | "solicitante" | "inicio" | "atendente" | "sla" | "status";
export type ColunaSiteSpin = SortColSiteSpin | "acoes";

export type SortColEmail = "chamado" | "data" | "solicitante" | "assunto" | "inicio" | "atendente" | "sla" | "status";
export type ColunaEmail = SortColEmail | "acoes";

export const COL_LABEL_SITE_SPIN: Record<ColunaSiteSpin, string> = {
  chamado: "Chamado",
  data: "Data de Abertura",
  solicitante: "Solicitante",
  inicio: "Início do Atendimento",
  atendente: "Atendente",
  sla: "SLA",
  status: "Status",
  acoes: "Ações",
};

export const COL_LABEL_EMAIL: Record<ColunaEmail, string> = {
  chamado: "Chamado",
  data: "Data de Abertura",
  solicitante: "Solicitante",
  assunto: "Assunto",
  inicio: "Início do Atendimento",
  atendente: "Atendente",
  sla: "SLA",
  status: "Status",
  acoes: "Ações",
};

export function getColunasSiteSpin(filtroStatus: CsChamadoFiltroStatus): ColunaSiteSpin[] {
  if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "sla", "status", "acoes"];
  }
  if (filtroStatus === "aberto") {
    return ["chamado", "data", "solicitante", "acoes"];
  }
  if (filtroStatus === "em_andamento") {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "acoes"];
  }
  return ["chamado", "data", "solicitante", "atendente", "sla", "acoes"];
}

export function getColunasEmail(filtroStatus: CsChamadoFiltroStatus): ColunaEmail[] {
  if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
    return ["chamado", "data", "solicitante", "assunto", "inicio", "atendente", "sla", "status", "acoes"];
  }
  if (filtroStatus === "aberto") {
    return ["chamado", "data", "solicitante", "assunto", "acoes"];
  }
  if (filtroStatus === "em_andamento") {
    return ["chamado", "data", "assunto", "inicio", "atendente", "acoes"];
  }
  return ["chamado", "data", "assunto", "atendente", "sla", "acoes"];
}

export function solicitanteEmail(row: { email: string }): string {
  return row.email?.trim() || "—";
}

export function assuntoEmail(row: { assunto?: string | null }): string {
  return row.assunto?.trim() || "—";
}

export function solicitanteInstagram(row: Pick<CsChamadoRow, "nome_completo" | "instagram_username">): string {
  const handle = row.instagram_username?.trim() || row.nome_completo?.trim();
  if (!handle) return "—";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

export type SortColInstagramDm =
  | "chamado"
  | "data"
  | "solicitante"
  | "inicio"
  | "atendente"
  | "tempo_resposta"
  | "sla"
  | "status";
export type ColunaInstagramDm = SortColInstagramDm | "acoes";

export type SortColInstagramComent = "chamado" | "data" | "solicitante" | "inicio" | "atendente" | "sla" | "status";
export type ColunaInstagramComent = SortColInstagramComent | "acoes";

export const COL_LABEL_INSTAGRAM_DM: Record<ColunaInstagramDm, string> = {
  chamado: "Chamado",
  data: "Data de Abertura",
  solicitante: "Solicitante",
  inicio: "Início do Atendimento",
  atendente: "Atendente",
  tempo_resposta: "Tempo de Resposta",
  sla: "SLA",
  status: "Status",
  acoes: "Ações",
};

export const COL_LABEL_INSTAGRAM_COMENT: Record<ColunaInstagramComent, string> = {
  chamado: "Chamado",
  data: "Data de Abertura",
  solicitante: "Solicitante",
  inicio: "Início do Atendimento",
  atendente: "Atendente",
  sla: "SLA",
  status: "Status",
  acoes: "Ações",
};

export function getColunasInstagramDm(filtroStatus: CsChamadoFiltroStatus): ColunaInstagramDm[] {
  if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "status", "sla", "acoes"];
  }
  if (filtroStatus === "aberto") {
    return ["chamado", "data", "solicitante", "acoes"];
  }
  if (filtroStatus === "em_andamento") {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "tempo_resposta", "acoes"];
  }
  return ["chamado", "data", "solicitante", "atendente", "sla", "acoes"];
}

export function getColunasInstagramComent(filtroStatus: CsChamadoFiltroStatus): ColunaInstagramComent[] {
  if (filtroStatus === CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE) {
    return ["chamado", "data", "solicitante", "inicio", "atendente", "status", "sla", "acoes"];
  }
  if (filtroStatus === "arquivado") {
    return ["chamado", "data", "solicitante", "atendente", "sla", "acoes"];
  }
  return ["chamado", "data", "solicitante", "acoes"];
}