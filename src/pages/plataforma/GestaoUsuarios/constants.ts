import type { Role, PageKey, PermissaoValor, GestorTipoSlug } from "../../../types";
import { BRAND_SEMANTIC, FONT_TITLE } from "../../../constants/theme";

export { FONT_TITLE };

export const BRAND = {
  ...BRAND_SEMANTIC,
  gradiente: `linear-gradient(135deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`,
} as const;

/** Tipos de gestor (multi-seleção no cadastro + colunas na aba Gestores) */
export const GESTOR_TIPOS: { slug: GestorTipoSlug; label: string }[] = [
  { slug: "operacoes", label: "Estúdio" },
  { slug: "marketing", label: "Marketing" },
  { slug: "afiliados", label: "Afiliados" },
  { slug: "geral", label: "Geral" },
  { slug: "figurino", label: "Figurino" },
  { slug: "recursos_humanos", label: "Recursos Humanos" },
];

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
  { key: "mesas_spin", label: "Overview Spin", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "streamers", label: "Streamers", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer", label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_midias_sociais", label: "Mídias Sociais", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "influencers", label: "Influencers", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "scout", label: "Scout", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "financeiro", label: "Financeiro", secao: "Aquisição", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "banca_jogo", label: "Banca de Jogo", secao: "Aquisição", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_links", label: "Gestão de Links", secao: "Marketing", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "campanhas", label: "Campanhas", secao: "Marketing", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "gestao_dealers", label: "Gestão de Dealers", secao: "Estúdio", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_figurinos", label: "Figurinos", secao: "Estúdio", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_funcionarios", label: "Gestão de Prestadores", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_organograma", label: "Organograma", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  {
    key: "central_notificacoes",
    label: "Central de Notificações",
    secao: "Estúdio",
    hasCriar: false,
    hasEditar: true,
    hasExcluir: true,
  },
  { key: "gestao_usuarios", label: "Gestão de Usuários", secao: "Plataforma", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "gestao_operadoras", label: "Gestão de Operadoras", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "status_tecnico", label: "Status Técnico", secao: "Plataforma", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "roteiro_mesa", label: "Roteiro de Mesa", secao: "Estúdio", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "playbook_influencers", label: "Playbook Influencers", secao: "Conteúdo", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "links_materiais", label: "Links e Materiais", secao: "Conteúdo", hasCriar: false, hasEditar: true, hasExcluir: false },
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

/** Admin não usa escopo de influencers/operadoras; gestor usa tipos (multi) na aba Usuários. */
export function escopoBloqueado(role: Role): boolean {
  return role === "admin";
}
