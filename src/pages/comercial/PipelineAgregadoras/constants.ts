import type { CSSProperties } from "react";

export type AgregadoraTab = "todos" | "conexao" | "negociacao" | "fechado";

export type StatusPipelineAgregadora =
  | "disponiveis"
  | "conexao"
  | "negociacao"
  | "fechado";

export type TableColAgregadora =
  | "nome"
  | "site"
  | "jogos"
  | "status"
  | "ultimo_contato"
  | "acao";

export const AGREGADORA_TABS: AgregadoraTab[] = [
  "todos",
  "conexao",
  "negociacao",
  "fechado",
];

export const AGREGADORA_TAB_LABEL: Record<AgregadoraTab, string> = {
  todos: "Todos",
  conexao: "Conexão",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export const STATUS_PIPELINE_AGREGADORA_ORDEM: StatusPipelineAgregadora[] = [
  "disponiveis",
  "conexao",
  "negociacao",
  "fechado",
];

export const STATUS_PIPELINE_AGREGADORA_LABEL: Record<StatusPipelineAgregadora, string> = {
  disponiveis: "Disponíveis",
  conexao: "Conexão",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export const STATUS_PIPELINE_AGREGADORA_COLOR: Record<StatusPipelineAgregadora, string> = {
  disponiveis: "#6b7280",
  conexao: "#1e36f8",
  negociacao: "#f59e0b",
  fechado: "#22c55e",
};

export const AGREGADORA_TABLE_COLS: TableColAgregadora[] = [
  "nome",
  "site",
  "jogos",
  "status",
  "ultimo_contato",
  "acao",
];

export const AGREGADORA_COL_LABEL: Record<TableColAgregadora, string> = {
  nome: "Nome",
  site: "Site",
  jogos: "Jogos",
  status: "Status",
  ultimo_contato: "Último Contato",
  acao: "Ação",
};

export const HISTORICO_CAMPO_LABEL_AGREGADORA: Record<string, string> = {
  nome: "Nome",
  site: "Site",
  jogos: "Jogos",
  status_pipeline: "Status",
  comercial_user_id: "Comercial",
  ultimo_contato: "Último Contato",
};

export {
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_NENHUM,
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS_LABEL,
  COMERCIAL_FILTRO_NENHUM_LABEL,
  PIPELINE_COMERCIAL_NOMES,
} from "../PipelineB2B/constants";

export function badgePipelineAgregadoraStyle(cor: string): CSSProperties {
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
