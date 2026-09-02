import type { Role, PageKey, PermissaoValor, PrestadorTipoSlug } from "../../../types";
import { ROLES_SEM_RESTRICAO_ESCOPO, ROLES_GESTOR_DEPARTAMENTO } from "../../../lib/staffRoles";
import { sortPagesLikeMenu } from "../../../lib/menuPagesOrder";
import { BRAND_SEMANTIC, FONT_TITLE } from "../../../constants/theme";

export { FONT_TITLE };

export const BRAND = {
  ...BRAND_SEMANTIC,
  gradiente: `linear-gradient(135deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`,
} as const;

/** Áreas de atuação do perfil Prestadores (multi no cadastro + colunas na aba Prestadores). */
export const PRESTADOR_TIPOS: { slug: PrestadorTipoSlug; label: string }[] = [
  { slug: "escritorio", label: "Escritório" },
  { slug: "estudio", label: "Estúdio" },
  { slug: "facilities", label: "Facilities" },
  { slug: "ti", label: "TI" },
];

/** Ordem fixa em filtros da aba Usuários e no select «Perfil» do modal (aba Permissões usa `ROLES_PERMISSOES`). */
export const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "executivo", label: "Executivo" },
  { value: "gestor_aquisicao", label: "Gestor de Aquisição" },
  { value: "gestor_marketing", label: "Gestor de Marketing" },
  { value: "gestor_operacoes", label: "Gestor de Operações" },
  { value: "gestor_tech_ops", label: "Gestor de Tech Ops" },
  { value: "gestor_academy", label: "Gestor de Academy" },
  { value: "gestor_rh", label: "Gestor de RH" },
  { value: "rh", label: "RH" },
  { value: "figurino", label: "Figurino" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "performance_coach", label: "Performance Coach" },
  { value: "service_manager", label: "Service Manager" },
  { value: "customer_service", label: "Customer Service" },
  { value: "game_presenter", label: "Game Presenter" },
  { value: "shuffler", label: "Shuffler" },
  { value: "tech_ops", label: "Tech Ops" },
  { value: "shift_leader", label: "Shift Leader" },
  { value: "prestador", label: "Prestadores" },
  { value: "operador", label: "Operador" },
  { value: "agencia", label: "Agência" },
  { value: "influencer", label: "Influenciador" },
  { value: "afiliado", label: "Afiliado" },
  { value: "investidor", label: "Investidor" },
];

/** Perfis internos — operação de estúdio (filtros Usuários, Permissões, Simulador). */
export const ROLES_PERFIS_ESTUDIO: Role[] = [
  "performance_coach",
  "service_manager",
  "customer_service",
  "shift_leader",
  "shuffler",
  "game_presenter",
];

/** Perfis internos — escritório e suporte (filtros Usuários, Permissões, Simulador). */
export const ROLES_PERFIS_ESCRITORIO: Role[] = ["rh", "figurino", "comunicacao", "tech_ops", "prestador"];

/** Linha Gerenciais — admin, executivo e gestores de departamento (atribuição manual). */
export const ROLES_PERFIS_GERENCIAIS: Role[] = [
  "admin",
  "executivo",
  ...ROLES_GESTOR_DEPARTAMENTO,
];

/** Linhas de filtro por perfil na aba Usuários (título + botões na ordem pedida). */
export const FILTROS_PERFIL_LINHAS: { titulo: string; roles: Role[] }[] = [
  { titulo: "Perfis Gerenciais", roles: ROLES_PERFIS_GERENCIAIS },
  { titulo: "Estúdio", roles: ROLES_PERFIS_ESTUDIO },
  { titulo: "Escritório", roles: ROLES_PERFIS_ESCRITORIO },
  { titulo: "Perfis Externos", roles: ["operador", "agencia", "influencer", "afiliado", "investidor"] },
];

/** Metadados por página — ordem de exportação via `sortPagesLikeMenu` (alinhado a `menu.ts`; Geral por último). */
const PAGES_META: {
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
  { key: "dash_afiliados", label: "Afiliados", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_midias_sociais", label: "Mídias Sociais", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_influencer", label: "Overview Influencer", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_afiliado", label: "Overview Afiliado", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "comercial_overview", label: "Overview Comercial", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_headcount", label: "Headcount", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  { key: "dash_overview_prestador", label: "Overview Prestador", secao: "Dashboards", hasCriar: false, hasEditar: false, hasExcluir: false },
  // Lives
  { key: "agenda", label: "Agenda", secao: "Lives", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "resultados", label: "Resultados", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "feedback", label: "Feedback", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: true },
  { key: "influencers", label: "Influencers", secao: "Lives", hasCriar: false, hasEditar: true, hasExcluir: false },
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
  // Comercial (Overview Comercial fica em Dashboards — menu + PAGES)
  { key: "comercial_integracao", label: "Integração", secao: "Comercial", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "comercial_pipeline_b2b", label: "Pipeline B2B", secao: "Comercial", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "comercial_pipeline_agregadoras", label: "Pipeline Agregadoras", secao: "Comercial", hasCriar: true, hasEditar: true, hasExcluir: false },
  // Customer Success
  { key: "cs_atendimento", label: "Atendimento", secao: "Customer Success", hasCriar: false, hasEditar: true, hasExcluir: false },
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
  { key: "incidentes", label: "Incidentes", secao: "Estúdio", hasCriar: false, hasEditar: true, hasExcluir: false },
  // Academy
  {
    key: "academy_performance_hub",
    label: "Performance Hub",
    secao: "Academy",
    hasCriar: true,
    hasEditar: true,
    hasExcluir: true,
  },
  {
    key: "academy_portal",
    label: "Portal da Academy",
    secao: "Academy",
    hasCriar: false,
    hasEditar: true,
    hasExcluir: false,
  },
  // Escala (ordem = menu.ts)
  { key: "rh_staff", label: "Gestão de Staff", secao: "Escala", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "escala_controle_turno", label: "Controle de Turno", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "escala_relatorio_turno", label: "Relatório de Turno", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "escala_solicitacoes", label: "Solicitações", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "rh_gestao_escala", label: "Escala Estúdio", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "escala_rotacao", label: "Rotação", secao: "Escala", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "rh_calendario", label: "Calendário", secao: "Escala", hasCriar: false, hasEditar: true, hasExcluir: false },
  {
    key: "escala_marketplace_turnos",
    label: "Marketplace",
    secao: "Escala",
    hasCriar: true,
    hasEditar: true,
    hasExcluir: false,
  },
  // RH
  { key: "rh_funcionarios", label: "Gestão de Prestadores", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_dados_cadastro", label: "Dados de Cadastro", secao: "RH", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "rh_organograma", label: "Organograma", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "escala_escritorio", label: "Escala Escritório", secao: "RH", hasCriar: true, hasEditar: true, hasExcluir: false },
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
  { key: "links_materiais", label: "Links e Materiais", secao: "Conteúdo", hasCriar: true, hasEditar: false, hasExcluir: false },
  { key: "spin_na_rede", label: "Spin na Rede", secao: "Conteúdo", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "rh_portal", label: "Portal de RH", secao: "Conteúdo", hasCriar: false, hasEditar: true, hasExcluir: false },
  { key: "informativos", label: "Informativos", secao: "Conteúdo", hasCriar: true, hasEditar: true, hasExcluir: true },
  // Tech Ops
  { key: "tech_ops_estoque", label: "Gestão de Estoque", secao: "Tech Ops", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "tech_ops_ordem_saida", label: "Ordem de Saída", secao: "Tech Ops", hasCriar: true, hasEditar: true, hasExcluir: false },
  { key: "tech_ops_itens_alocados", label: "Itens Alocados", secao: "Tech Ops", hasCriar: true, hasEditar: false, hasExcluir: false },
  // Plataforma — Criar/Editar/Excluir alinhados a Novo usuário / modais e abas / desativação
  { key: "gestao_usuarios", label: "Gestão de Usuários", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_operadoras", label: "Gestão de Operadoras", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "gestao_mesas", label: "Gestão de Estúdios", secao: "Plataforma", hasCriar: true, hasEditar: true, hasExcluir: true },
  { key: "status_tecnico", label: "Status Técnico", secao: "Plataforma", hasCriar: false, hasEditar: true, hasExcluir: false },
  // Geral (sempre por último)
  { key: "configuracoes", label: "Configurações", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
  {
    key: "simulador_login",
    label: "Simulador de Login",
    secao: "Geral",
    hasCriar: false,
    hasEditar: false,
    hasExcluir: false,
  },
  { key: "ajuda", label: "Ajuda", secao: "Geral", hasCriar: false, hasEditar: false, hasExcluir: false },
];

export const PAGES = sortPagesLikeMenu(PAGES_META);

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
  ...ROLES_GESTOR_DEPARTAMENTO,
  "rh",
  "figurino",
  "comunicacao",
  "performance_coach",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
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

/** Perfis excluídos do Simulador de Login (admin irrestrito; executivo não entra na lista). */
export const ROLES_EXCLUIDOS_SIMULADOR_LOGIN: Role[] = ["admin", "executivo"];

/**
 * Perfis disponíveis na simulação — deriva de `ROLES` (todo perfil novo no select «Perfil» entra aqui,
 * exceto `ROLES_EXCLUIDOS_SIMULADOR_LOGIN`).
 */
export const ROLES_SIMULAVEIS: Role[] = ROLES.filter(
  (r) => !ROLES_EXCLUIDOS_SIMULADOR_LOGIN.includes(r.value),
).map((r) => r.value);

/** Agrupamento na página Simulador de Login (mesmas linhas da aba Usuários, sem admin/executivo). */
export const FILTROS_PERFIL_LINHAS_SIMULADOR: { titulo: string; roles: Role[] }[] = FILTROS_PERFIL_LINHAS.map(
  ({ titulo, roles }) => ({
    titulo,
    roles: roles.filter((r) => !ROLES_EXCLUIDOS_SIMULADOR_LOGIN.includes(r)),
  }),
).filter((linha) => linha.roles.length > 0);

/** Perfis configuráveis como «viewer» na aba Gestão de Usuários → Simulador de Login (= ROLES_PERMISSOES). */
export const ROLES_VIEWER_SIMULADOR_LOGIN: Role[] = [...ROLES_PERMISSOES];

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
    gestor_aquisicao: BRAND.azul,
    gestor_marketing: BRAND.ciano,
    gestor_operacoes: BRAND.roxo,
    gestor_tech_ops: BRAND.ciano,
    gestor_academy: BRAND.roxoVivo,
    gestor_rh: BRAND.roxo,
    prestador: BRAND.roxo,
    executivo: BRAND.ciano,
    shift_leader: BRAND.amarelo,
    service_manager: BRAND.azul,
    customer_service: BRAND.verde,
    game_presenter: BRAND.roxoVivo,
    shuffler: BRAND.amarelo,
    tech_ops: BRAND.ciano,
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
