import type { CSSProperties } from "react";

export type IntegracaoTab = "todos" | "nao_iniciados" | "em_andamento" | "concluidos";

export type StatusIntegracao = "nao_iniciado" | "em_andamento" | "concluido";

export type PrioridadeIntegracao = "baixo" | "medio" | "alta";

export type TipoIntegracao = "mesa_dedicada" | "mesa_network";

export type TableColIntegracao =
  | "operador"
  | "prioridade"
  | "tipo"
  | "caminho"
  | "pam"
  | "agregadora"
  | "status"
  | "comentario"
  | "acao";

export const INTEGRACAO_TABS: IntegracaoTab[] = [
  "todos",
  "nao_iniciados",
  "em_andamento",
  "concluidos",
];

export const INTEGRACAO_TAB_LABEL: Record<IntegracaoTab, string> = {
  todos: "Todos",
  nao_iniciados: "Não Iniciados",
  em_andamento: "Em andamento",
  concluidos: "Concluídos",
};

export const STATUS_INTEGRACAO_ORDEM: StatusIntegracao[] = [
  "nao_iniciado",
  "em_andamento",
  "concluido",
];

export const STATUS_INTEGRACAO_LABEL: Record<StatusIntegracao, string> = {
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

/** Rótulos de KPI / abas no plural onde aplicável. */
export const STATUS_INTEGRACAO_KPI_LABEL: Record<StatusIntegracao | "total", string> = {
  total: "Total de Operadores",
  concluido: "Concluídos",
  em_andamento: "Em andamento",
  nao_iniciado: "Não Iniciados",
};

export const STATUS_INTEGRACAO_COLOR: Record<StatusIntegracao, string> = {
  nao_iniciado: "#6b7280",
  em_andamento: "#f59e0b",
  concluido: "#22c55e",
};

export const PRIORIDADE_ORDEM: PrioridadeIntegracao[] = ["baixo", "medio", "alta"];

export const PRIORIDADE_FILTRO_TODAS = "todas";
export const PRIORIDADE_FILTRO_TODAS_LABEL = "Todas Prioridades";
export const PRIORIDADE_FILTRO_ARIA = "Prioridades";

export const PRIORIDADE_LABEL: Record<PrioridadeIntegracao, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alta: "Alta",
};

export const PRIORIDADE_COLOR: Record<PrioridadeIntegracao, string> = {
  baixo: "#6b7280",
  medio: "#f59e0b",
  alta: "#e84025",
};

export const TIPO_INTEGRACAO_LABEL: Record<TipoIntegracao, string> = {
  mesa_dedicada: "Dedicada",
  mesa_network: "Network",
};

export const TIPO_INTEGRACAO_ORDEM: TipoIntegracao[] = ["mesa_dedicada", "mesa_network"];

export const INTEGRACAO_TABLE_COLS: TableColIntegracao[] = [
  "operador",
  "prioridade",
  "tipo",
  "caminho",
  "pam",
  "agregadora",
  "status",
  "comentario",
  "acao",
];

export const INTEGRACAO_COL_LABEL: Record<TableColIntegracao, string> = {
  operador: "Operador",
  prioridade: "Prioridade",
  tipo: "Tipo",
  caminho: "Caminho",
  pam: "PAM",
  agregadora: "Agregador",
  status: "Status",
  comentario: "Comentário",
  acao: "Ação",
};

export const SORTABLE_COLS_INTEGRACAO: TableColIntegracao[] = [
  "operador",
  "prioridade",
  "tipo",
  "caminho",
  "pam",
  "agregadora",
  "status",
];

export const HISTORICO_CAMPO_LABEL_INTEGRACAO: Record<string, string> = {
  operador_nome: "Operador",
  prioridade: "Prioridade",
  tipo: "Tipo",
  caminho: "Caminho",
  pam: "PAM",
  agregadora: "Agregador",
  status: "Status",
  comentario: "Comentário",
  criado: "Criação",
};

export function badgeIntegracaoStyle(cor: string): CSSProperties {
  return {
    display: "inline-flex",
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    background: `color-mix(in srgb, ${cor} 13%, transparent)`,
    color: cor,
    border: `1px solid color-mix(in srgb, ${cor} 27%, transparent)`,
  };
}
