/** Constantes compartilhadas entre dashboards (Overview, OverviewInfluencer, etc.) */
export { FONT_TITLE } from "../constants/theme";

export const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  ciano: "#70cae4",
  verde: "#22c55e",
  amarelo: "#f59e0b",
  salmao: "#e5755a",
  receita: "#4a2082",
  operacao: "#1e36f8",
  transacao: "#70cae4",
  custo: "#e84025",
} as const;

export const MES_INICIO = { ano: 2025, mes: 11 };

export const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const STATUS_ORDEM = ["Rentável", "Atenção", "Não Rentável", "Bônus", "Sem dados"] as const;
export type StatusLabel = (typeof STATUS_ORDEM)[number];

/** Empty state quando não há dados para o período e filtros atuais (tabelas, gráficos, KPIs). */
export const MSG_SEM_DADOS_FILTRO = "Sem dados para o filtro selecionado";

export const FUNIL_COLORS = ["#4a2082", "#1e36f8", "#70cae4", "#22c55e"] as const;
/** Referência para gráficos de funil (tokens sempre definidos no `:root` / AppContext). */
export const FUNIL_VARS = ["--brand-action", "--brand-contrast", "--brand-success", "--brand-extra3"] as const;
