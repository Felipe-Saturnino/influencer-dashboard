import { CS_ATENDIMENTO_FILTRO_TODOS_STATUS_VALUE } from "./csAtendimentoConstants";
import type { CsChamadoFiltroStatus, CsChamadoOrigem } from "../types/csAtendimento";

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

export type CsAtendimentoAbaOrigem = CsChamadoOrigem;
