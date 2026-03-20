import type { Role, PageKey, PermissaoValor } from "../../../types";

export const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

export const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  ciano: "#70cae4",
  verde: "#22c55e",
  amarelo: "#f59e0b",
  cinza: "#6b7280",
  gradiente: "linear-gradient(135deg, #4a2082, #1e36f8)",
} as const;

export const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "gestor", label: "Gestor" },
  { value: "executivo", label: "Executivo" },
  { value: "influencer", label: "Influenciador" },
  { value: "operador", label: "Operador" },
  { value: "agencia", label: "Agência" },
];

export const PAGES: {
  key: PageKey;
  label: string;
  secao: string;
  hasCriar: boolean;
  hasEditar: boolean;
  hasExcluir: boolean;
}[] = [
  { key: "agenda", label: "Agenda", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "resultados", label: "Resultados", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "feedback", label: "Feedback", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: true },
  { key: "dash_overview", label: "Overview", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer", label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_conversao", label: "Conversão", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_financeiro", label: "Financeiro", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "mesas_spin", label: "Mesas Spin", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_midias_sociais", label: "Mídias Sociais", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "influencers", label: "Influencers", secao: "Operações", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "scout", label: "Scout", secao: "Operações", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "financeiro", label: "Financeiro", secao: "Operações", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "gestao_links", label: "Gestão de Links", secao: "Operações", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "campanhas", label: "Campanhas", secao: "Operações", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "gestao_dealers", label: "Gestão de Dealers", secao: "Operações", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_usuarios", label: "Gestão de Usuários", secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_operadoras", label: "Gestão de Operadoras", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "status_tecnico", label: "Status Técnico", secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "configuracoes", label: "Configurações", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "ajuda", label: "Ajuda", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
];

/** Ordem: Administrador, Executivo, Gestor, Operador, Agência, Influenciador */
export const ROLES_PERMISSOES: Role[] = ["admin", "executivo", "gestor", "operador", "agencia", "influencer"];

export const PERM_OPCOES: { value: PermissaoValor; label: string }[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "proprios", label: "Próprios" },
];

export function roleLabel(role: Role): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function roleBadgeColor(role: Role): string {
  const map: Record<Role, string> = {
    admin: BRAND.roxoVivo,
    gestor: BRAND.azul,
    executivo: BRAND.ciano,
    influencer: BRAND.verde,
    operador: BRAND.amarelo,
    agencia: BRAND.vermelho,
  };
  return map[role] ?? BRAND.cinza;
}

export function escopoBloqueado(role: Role): boolean {
  return role === "admin" || role === "gestor";
}
