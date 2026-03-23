/** Constantes compartilhadas entre dashboards (Overview, OverviewInfluencer, etc.) */

export const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

export const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  ciano: "#70cae4",
  verde: "#22c55e",
  amarelo: "#f59e0b",
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

export const FUNIL_COLORS = ["#4a2082", "#1e36f8", "#70cae4", "#22c55e"] as const;
export const FUNIL_VARS = ["--brand-extra1", "--brand-extra2", "--brand-extra3", "--brand-extra4"] as const;
