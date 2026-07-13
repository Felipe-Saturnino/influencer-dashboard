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
  | "desinteresse_comercial"
  | "contrato_enviado"
  | "contrato_assinado"
  | "ativo";

export type ProdutoTipo = "mesa_dedicada" | "mesa_network";

/** Agregadoras disponíveis no Pipeline B2B — ordem alfabética por rótulo. */
export type Agregadora =
  | "Alea"
  | "BetConstruct"
  | "Cactus"
  | "Cometa Gaming"
  | "Playtech"
  | "SoftSwiss";

export const AGREGADORA_ORDEM: Agregadora[] = [
  "Alea",
  "BetConstruct",
  "Cactus",
  "Cometa Gaming",
  "Playtech",
  "SoftSwiss",
];

/** Opções do popover inline (vazio = sem agregadora). */
export const AGREGADORA_POPOVER_OPTS = ["", ...AGREGADORA_ORDEM] as const;

export type AgregadoraPopoverValue = (typeof AGREGADORA_POPOVER_OPTS)[number];

export type TableCol =
  | "razao"
  | "marca"
  | "contato"
  | "comercial"
  | "status"
  | "dedicada"
  | "network"
  | "agregadora"
  | "ultimo_contato"
  | "acao";

/** Colunas da tabela — mesma ordem em todas as abas. */
export const PIPELINE_TABLE_COLS: TableCol[] = [
  "razao",
  "marca",
  "contato",
  "comercial",
  "status",
  "dedicada",
  "network",
  "agregadora",
  "ultimo_contato",
  "acao",
];

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

/** Progressão visual Dedicada / Network — pior → melhor (funil comercial, não semântica KPI). */
export const STATUS_PRODUTO_COLOR: Record<StatusProduto, string> = {
  sem_interesse: "#e84025",
  desinteresse_comercial: "#b91c1c",
  sem_proposta: "#6b7280",
  em_negociacao: "#f59e0b",
  contrato_enviado: "#1e36f8",
  contrato_assinado: "#a78bfa",
  ativo: "#22c55e",
};

export const STATUS_PRODUTO_ORDEM: StatusProduto[] = [
  "sem_interesse",
  "desinteresse_comercial",
  "sem_proposta",
  "em_negociacao",
  "contrato_enviado",
  "contrato_assinado",
  "ativo",
];

export const STATUS_PRODUTO_LABEL: Record<StatusProduto, string> = {
  sem_proposta: "Sem proposta",
  em_negociacao: "Em negociação",
  sem_interesse: "Sem interesse",
  desinteresse_comercial: "Desinteresse Comercial",
  contrato_enviado: "Contrato enviado",
  contrato_assinado: "Contrato Assinado",
  ativo: "Ativo",
};

/** Status de produto contabilizados na linha «Sem interesse» do consolidado/KPI. */
export const STATUS_PRODUTO_LINHA_SEM_INTERESSE: StatusProduto[] = [
  "sem_interesse",
  "desinteresse_comercial",
];

export const STATUS_PIPELINE_LABEL: Record<StatusPipeline, string> = {
  disponiveis: "Disponíveis",
  conexao: "Conexão",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export const FOLHA_BY_PIPELINE: Record<StatusPipeline, StatusFolha[]> = {
  disponiveis: ["sem_contato", "site_ativo", "site_offline"],
  conexao: ["conexao_iniciada", "conexao_realizada"],
  negociacao: ["neg_enviar", "neg_interessado", "neg_sem"],
  fechado: ["fech_enviado", "fech_assinado", "fech_ativo"],
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
    { key: "neg_sem", label: "Sem interesse" },
  ],
  negociacao: [
    { key: "neg_enviar", label: "Enviar contrato" },
    { key: "neg_interessado", label: "Interessado" },
    { key: "fech_enviado", label: "Contrato enviado" },
  ],
  fechado: [
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
    cols: PIPELINE_TABLE_COLS,
  },
  disponiveis: {
    title: "Marcas Disponíveis",
    pipelines: ["disponiveis"],
    cols: PIPELINE_TABLE_COLS,
  },
  conexao: {
    title: "Marcas em Conexão",
    pipelines: ["conexao"],
    cols: PIPELINE_TABLE_COLS,
  },
  negociacao: {
    title: "Marcas em Negociação",
    pipelines: ["negociacao"],
    cols: PIPELINE_TABLE_COLS,
  },
  fechado: {
    title: "Marcas com Contrato",
    pipelines: ["fechado"],
    cols: PIPELINE_TABLE_COLS,
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
  agregadora: "Agregadora",
  ultimo_contato: "Último Contato",
  acao: "Ação",
};

export const SORTABLE_COLS: TableCol[] = [
  "razao",
  "dedicada",
  "network",
  "agregadora",
  "ultimo_contato",
];

export const COMERCIAL_FILTRO_TODOS = "todos";
export const COMERCIAL_FILTRO_NENHUM = "nenhum";
export const COMERCIAL_FILTRO_ARIA = "Comercial";
export const COMERCIAL_FILTRO_TODOS_LABEL = "Todos Comerciais";
export const COMERCIAL_FILTRO_NENHUM_LABEL = "Nenhum";

/** Comerciais atribuíveis no pipeline — ordem fixa (filtro e popover). */
export const PIPELINE_COMERCIAL_NOMES = [
  "Marcus Morin",
  "Fred Ring",
  "Nathan Yoles",
  "Simcha Neumark",
] as const;

/** Coluna Comercial automática quando status_dominio = inativo — não entra no filtro. */
export const PIPELINE_COMERCIAL_SITE_OFFLINE_LABEL = "Site Offline";
export const PIPELINE_COMERCIAL_SITE_OFFLINE_COLOR = "#6b7280";

export const STATUS_DOMINIO_LABEL: Record<"ok" | "inativo", string> = {
  ok: "Ativo",
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

/** Badge Dedicada/Network — tinta suave (fundo, borda e texto em color-mix, não cor sólida). */
export function badgeProdutoStyle(status: StatusProduto): CSSProperties {
  const cor = STATUS_PRODUTO_COLOR[status];
  return {
    display: "inline-flex",
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    background: `color-mix(in srgb, ${cor} 10%, transparent)`,
    color: `color-mix(in srgb, ${cor} 72%, #6b7280)`,
    border: `1px solid color-mix(in srgb, ${cor} 18%, transparent)`,
  };
}

export const HISTORICO_CAMPO_LABEL: Record<string, string> = {
  comercial_user_id: "Comercial",
  dominio: "Domínio",
  status_pipeline: "Status",
  status_dominio: "Status do Domínio",
  mesa_dedicada: "Dedicada",
  mesa_network: "Network",
  agregadora: "Agregadora",
  ultimo_contato: "Último Contato",
  ultima_comunicacao: "Envio de Material",
  status_folha: "Detalhe",
};
