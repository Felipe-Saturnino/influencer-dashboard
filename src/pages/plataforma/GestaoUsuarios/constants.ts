import type { Role, PageKey, PermissaoValor, GestorTipoSlug, PrestadorTipoSlug } from "../../../types";
import { ROLES_SEM_RESTRICAO_ESCOPO } from "../../../lib/staffRoles";
import { BRAND_SEMANTIC, FONT_TITLE } from "../../../constants/theme";

export { FONT_TITLE };

export const BRAND = {
  ...BRAND_SEMANTIC,
  gradiente: `linear-gradient(135deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`,
} as const;

/** Tipos de gestor (multi-seleção no cadastro + colunas na aba Gestores). Shift Leader, Service Manager, Figurino, Comunicação, Performance Coach e RH são perfis próprios. */
export const GESTOR_TIPOS: { slug: GestorTipoSlug; label: string }[] = [
  { slug: "operacoes", label: "Estúdio" },
  { slug: "marketing", label: "Marketing" },
  { slug: "afiliados", label: "Afiliados" },
  { slug: "geral", label: "Geral" },
  { slug: "treinamento", label: "Treinamento" },
];

/** Áreas de atuação do perfil Prestadores (multi no cadastro + colunas na aba Prestadores). */
export const PRESTADOR_TIPOS: { slug: PrestadorTipoSlug; label: string }[] = [
  { slug: "customer_service", label: "Customer Service" },
  { slug: "game_presenter", label: "Game Presenter" },
  { slug: "shuffler", label: "Shuffler" },
  { slug: "escritorio", label: "Escritório" },
  { slug: "facilities", label: "Facilities" },
  { slug: "financeiro", label: "Financeiro" },
  { slug: "tech_ops", label: "Tech Ops" },
  { slug: "ti", label: "TI" },
  { slug: "estudio", label: "Estúdio" },
];

/** Ordem fixa em filtros da aba Usuários e no select «Perfil» do modal (aba Permissões usa `ROLES_PERMISSOES`). */
export const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "executivo", label: "Executivo" },
  { value: "gestor", label: "Gestor" },
  { value: "rh", label: "RH" },
  { value: "figurino", label: "Figurino" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "performance_coach", label: "Performance Coach" },
  { value: "service_manager", label: "Service Manager" },
  { value: "shift_leader", label: "Shift Leader" },
  { value: "prestador", label: "Prestadores" },
  { value: "operador", label: "Operador" },
  { value: "agencia", label: "Agência" },
  { value: "influencer", label: "Influenciador" },
  { value: "afiliado", label: "Afiliado" },
  { value: "investidor", label: "Investidor" },
];

/** Linhas de filtro por perfil na aba Usuários (título + botões na ordem pedida). */
export const FILTROS_PERFIL_LINHAS: { titulo: string; roles: Role[] }[] = [
  { titulo: "Perfis Gerênciais", roles: ["admin", "executivo", "gestor"] },
  { titulo: "Perfis Internos", roles: ["rh", "figurino", "comunicacao", "performance_coach", "service_manager", "shift_leader", "prestador"] },
  { titulo: "Perfis Externos", roles: ["operador", "agencia", "influencer", "afiliado", "investidor"] },
];

/** Ordem alinhada ao menu lateral (`constants/menu.ts`); secção Geral por último. */
export const PAGES: {
  key: PageKey;
  label: string;
  secao: string;
  hasCriar: boolean;
  hasEditar: boolean;
  hasExcluir: boolean;
}[] = [
  // Dashboards
  { key: "mesas_spin", label: "Overview Spin", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "streamers", label: "Streamers", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_midias_sociais", label: "Mídias Sociais", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer", label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  // Lives
  { key: "agenda", label: "Agenda", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "resultados", label: "Resultados", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "feedback", label: "Feedback", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: true },
  { key: "influencers", label: "Influencers", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "scout", label: "Scout", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Afiliados
  { key: "afiliados", label: "Afiliados", secao: "Afiliados", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "afiliados_network", label: "Network", secao: "Afiliados", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Aquisição
  { key: "financeiro", label: "Financeiro", secao: "Aquisição", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "banca_jogo", label: "Banca de Jogo", secao: "Aquisição", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Marketing
  { key: "campanhas", label: "Campanhas", secao: "Marketing", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "galeria_fotos", label: "Galeria de Fotos", secao: "Marketing", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_links", label: "Gestão de Links", secao: "Marketing", hasCriar: false, hasEditar: true, hasExcluir: false },
  // Comercial
  { key: "comercial_overview", label: "Overview Comercial", secao: "Comercial", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "comercial_pipeline_b2b", label: "Pipeline B2B", secao: "Comercial", hasCriar: true, hasEditar: true, hasExcluir: false },
  // Estúdio (menu)
  { key: "gestao_dealers", label: "Gestão de Dealers", secao: "Estúdio", hasCriar: false, hasEditar: true, hasExcluir: false },
  {
    key: "central_notificacoes",
    label: "Central de Notificações",
    secao: "Estúdio",
    hasCriar: false,
    hasEditar: true,
    hasExcluir: false,
  },
  { key: "rh_figurinos", label: "Figurinos", secao: "Estúdio", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "roteiro_mesa", label: "Roteiro de Mesa", secao: "Estúdio", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Escala
  { key: "rh_gestao_escala", label: "Gestão de Escala", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "rh_staff", label: "Gestão de Staff", secao: "Escala", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "rh_calendario", label: "Calendário", secao: "Escala", hasCriar: false, hasEditar: false, hasExcluir: false },
  {
    key: "escala_marketplace_turnos",
    label: "Marketplace",
    secao: "Escala",
    hasCriar: true,
    hasEditar: true,
    hasExcluir: false,
  },
  { key: "escala_solicitacoes", label: "Solicitações", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  // RH
  { key: "rh_funcionarios", label: "Gestão de Prestadores", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_dados_cadastro", label: "Dados de Cadastro", secao: "RH", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "rh_organograma", label: "Organograma", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_vagas", label: "Vagas", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_solicitacoes", label: "Solicitações", secao: "RH", hasCriar: false, hasEditar: true, hasExcluir: false },
  {
    key: "rh_central_denuncias",
    label: "Central de Denúncias",
    secao: "RH",
    hasCriar: false,
    hasEditar: true,
    hasExcluir: true,
  },
  // Conteúdo
  { key: "playbook_influencers", label: "Playbook Influencers", secao: "Conteúdo", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "links_materiais", label: "Links e Materiais", secao: "Conteúdo", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "spin_na_rede", label: "Spin na Rede", secao: "Conteúdo", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_portal", label: "Portal de RH", secao: "Conteúdo", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "informativos", label: "Informativos", secao: "Conteúdo", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Plataforma — Criar/Editar/Excluir alinhados a Novo usuário / modais e abas / desativação
  { key: "gestao_usuarios", label: "Gestão de Usuários", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_operadoras", label: "Gestão de Operadoras", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_mesas", label: "Gestão de Estúdios", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "status_tecnico", label: "Status Técnico", secao: "Plataforma", hasCriar: false, hasEditar: true, hasExcluir: false },
  // Geral (sempre por último)
  { key: "configuracoes", label: "Configurações", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "ajuda", label: "Ajuda", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
];

/** Secções na ordem de `PAGES` / menu lateral (primeira ocorrência de cada secao). */
export function secoesMenuFromPages(pages: readonly { secao: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pages) {
    if (!seen.has(p.secao)) {
      seen.add(p.secao);
      out.push(p.secao);
    }
  }
  return out;
}

/**
 * Perfis editáveis na aba Permissões (Administrador não entra: acesso total fixo na plataforma).
 */
export const ROLES_PERMISSOES: Role[] = [
  "executivo",
  "gestor",
  "rh",
  "figurino",
  "comunicacao",
  "performance_coach",
  "service_manager",
  "shift_leader",
  "prestador",
  "operador",
  "agencia",
  "influencer",
  "afiliado",
  "investidor",
];

/** Linhas de perfil na aba Permissões (sem Administrador — acesso total fixo). */
export const FILTROS_PERFIL_LINHAS_PERMISSOES: { titulo: string; roles: Role[] }[] = FILTROS_PERFIL_LINHAS.map(
  ({ titulo, roles }) => ({
    titulo,
    roles: roles.filter((r) => ROLES_PERMISSOES.includes(r)),
  }),
).filter((linha) => linha.roles.length > 0);

export type FiltroStatusUsuarios = "todos" | "ativo" | "desativado";

export const STATUS_USUARIO_CARROSSEL: { key: Exclude<FiltroStatusUsuarios, "todos">; label: string }[] = [
  { key: "ativo", label: "Ativo" },
  { key: "desativado", label: "Desativado" },
];

export const STATUS_USUARIO_TODOS_LABEL = "Todos os Status";

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
    prestador: BRAND.roxo,
    executivo: BRAND.ciano,
    shift_leader: BRAND.amarelo,
    service_manager: BRAND.azul,
    figurino: BRAND.roxoVivo,
    comunicacao: BRAND.ciano,
    performance_coach: BRAND.verde,
    rh: BRAND.roxo,
    influencer: BRAND.verde,
    afiliado: BRAND.ciano,
    operador: BRAND.amarelo,
    agencia: BRAND.vermelho,
    investidor: BRAND.roxo,
  };
  return map[role] ?? BRAND.cinza;
}

/** Admin, Executivo, Investidor e staff Spin não usam escopo por operadora/influencer na Gestão de Usuários. */
export function escopoBloqueado(role: Role): boolean {
  return role === "admin" || ROLES_SEM_RESTRICAO_ESCOPO.includes(role);
}
