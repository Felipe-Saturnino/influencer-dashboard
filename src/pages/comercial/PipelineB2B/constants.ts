import type { CSSProperties } from "react";

export type PipelineTab = "todos" | "disponiveis" | "conexao" | "negociacao" | "fechado";

export type StatusPipeline = "disponiveis" | "conexao" | "negociacao" | "fechado";

export type StatusFolha =
  | "sem_contato"
  | "site_ativo"
  | "site_offline"
  | "conexao_iniciada"
  | "conexao_realizada"
  | "neg_enviar"
  | "neg_interessado"
  | "neg_sem"
  | "fech_enviado"
  | "fech_assinado"
  | "fech_ativo";

export type StatusProduto =
  | "sem_proposta"
  | "em_negociacao"
  | "sem_interesse"
  | "contrato_enviado"
  | "contrato_assinado"
  | "ativo";

export type ProdutoTipo = "mesa_dedicada" | "mesa_network";

export type TableCol =
  | "razao"
  | "marca"
  | "contato"
  | "comercial"
  | "status"
  | "dedicada"
  | "network"
  | "ultima"
  | "acao";

export const PIPELINE_TABS: PipelineTab[] = ["todos", "disponiveis", "conexao", "negociacao", "fechado"];

export const PIPELINE_TAB_LABEL: Record<PipelineTab, string> = {
  todos: "Todos",
  disponiveis: "Disponíveis",
  conexao: "Conexão",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export const PIPELINE_COLOR: Record<StatusPipeline, string> = {
  disponiveis: "#6b7280",
  conexao: "#1e36f8",
  negociacao: "#f59e0b",
  fechado: "#22c55e",
};

export const PRODUTO_COLOR = "#a78bfa";

export const STATUS_PIPELINE_LABEL: Record<StatusPipeline, string> = {
  disponiveis: "Disponíveis",
  conexao: "Conexão",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export const STATUS_FOLHA_LABEL: Record<StatusFolha, string> = {
  sem_contato: "Sem contato",
  site_ativo: "Site Ativo",
  site_offline: "Site Offline",
  conexao_iniciada: "Iniciada",
  conexao_realizada: "Realizada",
  neg_enviar: "Enviar contrato",
  neg_interessado: "Interessado",
  neg_sem: "Sem interesse",
  fech_enviado: "Contrato enviado",
  fech_assinado: "Assinado",
  fech_ativo: "Ativo",
};

export const STATUS_PRODUTO_LABEL: Record<StatusProduto, string> = {
  sem_proposta: "Sem proposta",
  em_negociacao: "Em negociação",
  sem_interesse: "Sem interesse",
  contrato_enviado: "Contrato enviado",
  contrato_assinado: "Contrato Assinado",
  ativo: "Ativo",
};

export const FOLHA_BY_PIPELINE: Record<StatusPipeline, StatusFolha[]> = {
  disponiveis: ["sem_contato", "site_ativo", "site_offline"],
  conexao: ["conexao_iniciada", "conexao_realizada"],
  negociacao: ["neg_enviar", "neg_interessado", "neg_sem"],
  fechado: ["fech_enviado", "fech_assinado", "fech_ativo"],
};

/** Linhas do consolidado hierárquico (aba Todos). */
export const HIERARCHY_LINES: Record<StatusPipeline, { key: StatusFolha; label: string }[]> = {
  disponiveis: [
    { key: "site_ativo", label: "Site Ativo" },
    { key: "site_offline", label: "Site Offline" },
  ],
  conexao: [
    { key: "conexao_iniciada", label: "Iniciada" },
    { key: "conexao_realizada", label: "Realizada" },
  ],
  negociacao: [
    { key: "neg_interessado", label: "Interessado" },
    { key: "neg_sem", label: "Sem Interesse" },
  ],
  fechado: [
    { key: "fech_assinado", label: "Assinado" },
    { key: "fech_ativo", label: "Ativo" },
  ],
};

export const KPI_LINES: Record<Exclude<PipelineTab, "todos">, { key: StatusFolha; label: string }[]> = {
  disponiveis: [
    { key: "site_ativo", label: "Site Ativo" },
    { key: "site_offline", label: "Site Offline" },
    { key: "sem_contato", label: "Sem contato" },
  ],
  conexao: [
    { key: "conexao_iniciada", label: "Iniciada" },
    { key: "conexao_realizada", label: "Realizada" },
  ],
  negociacao: [
    { key: "neg_enviar", label: "Enviar contrato" },
    { key: "neg_interessado", label: "Interessado" },
    { key: "neg_sem", label: "Sem interesse" },
  ],
  fechado: [
    { key: "fech_enviado", label: "Contrato enviado" },
    { key: "fech_assinado", label: "Assinado" },
    { key: "fech_ativo", label: "Ativo" },
  ],
};

export const TAB_TABLE_CONFIG: Record<
  PipelineTab,
  { title: string; pipelines: StatusPipeline[] | null; cols: TableCol[] }
> = {
  todos: {
    title: "Todas as Marcas",
    pipelines: null,
    cols: ["razao", "marca", "contato", "comercial", "status", "dedicada", "network", "ultima", "acao"],
  },
  disponiveis: {
    title: "Marcas Disponíveis",
    pipelines: ["disponiveis"],
    cols: ["razao", "marca", "contato", "comercial", "ultima", "acao"],
  },
  conexao: {
    title: "Marcas em Conexão",
    pipelines: ["conexao"],
    cols: ["razao", "marca", "contato", "comercial", "ultima", "acao"],
  },
  negociacao: {
    title: "Marcas em Negociação",
    pipelines: ["negociacao"],
    cols: ["razao", "marca", "contato", "comercial", "dedicada", "network", "ultima", "acao"],
  },
  fechado: {
    title: "Marcas com Contrato",
    pipelines: ["fechado"],
    cols: ["razao", "marca", "contato", "comercial", "dedicada", "network", "ultima", "acao"],
  },
};

export const COL_LABEL: Record<TableCol, string> = {
  razao: "Razão Social",
  marca: "Marca",
  contato: "Contato",
  comercial: "Comercial",
  status: "Status",
  dedicada: "Dedicada",
  network: "Network",
  ultima: "Última Comunicação",
  acao: "Ação",
};

export const SORTABLE_COLS: TableCol[] = [
  "razao",
  "marca",
  "contato",
  "comercial",
  "status",
  "dedicada",
  "network",
  "ultima",
];

export const COMERCIAL_FILTRO_TODOS = "todos";
export const COMERCIAL_FILTRO_NENHUM = "nenhum";
export const COMERCIAL_FILTRO_ARIA = "Comercial";
export const COMERCIAL_FILTRO_TODOS_LABEL = "Todos Comerciais";
export const COMERCIAL_FILTRO_NENHUM_LABEL = "Nenhum";

/** Comerciais atribuíveis no pipeline — ordem fixa (filtro e popover). */
export const PIPELINE_COMERCIAL_NOMES = ["Marcus Morin", "Fred Ring"] as const;

export const STATUS_DOMINIO_LABEL: Record<"ok" | "inativo", string> = {
  ok: "Ok",
  inativo: "Inativo",
};

export function badgePipelineStyle(cor: string): CSSProperties {
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

export function badgeProdutoStyle(): CSSProperties {
  return badgePipelineStyle(PRODUTO_COLOR);
}

export const HISTORICO_CAMPO_LABEL: Record<string, string> = {
  comercial_user_id: "Comercial",
  status_pipeline: "Status",
  mesa_dedicada: "Dedicada",
  mesa_network: "Network",
  status_folha: "Detalhe",
};
