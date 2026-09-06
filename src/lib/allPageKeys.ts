import type { PageKey } from "../types";

/**
 * Universo de PageKeys do menu / permissões.
 * Admin recebe `sim` em todas; omitir uma chave faz o item sumir do Sidebar mesmo para admin.
 * Manter alinhado com `menu.ts`, `PAGES` (Gestão de Usuários) e rotas.
 */
export const ALL_PAGE_KEYS: PageKey[] = [
  "home",
  "mesas_spin", "streamers", "dash_afiliados", "dash_midias_sociais", "dash_overview_influencer", "dash_overview_afiliado", "comercial_overview", "dash_headcount", "dash_overview_prestador",
  "agenda", "resultados", "feedback",
  "influencers", "scout", "afiliados", "afiliados_network", "financeiro", "banca_jogo", "gestao_links", "campanhas", "galeria_fotos",
  "comercial_integracao", "comercial_pipeline_b2b", "comercial_pipeline_agregadoras", "cs_atendimento",
  "gestao_dealers", "central_notificacoes", "rh_figurinos", "roteiro_mesa", "incidentes",
  "academy_performance_hub", "academy_portal",
  "rh_staff", "escala_controle_turno", "escala_solicitacoes", "rh_gestao_escala", "escala_rotacao", "rh_calendario", "escala_marketplace_turnos",
  "rh_funcionarios", "rh_dados_cadastro", "rh_organograma", "escala_escritorio", "rh_vagas", "rh_solicitacoes", "rh_central_denuncias",
  "playbook_influencers", "links_materiais", "spin_na_rede", "rh_portal", "informativos",
  "tech_ops_estoque", "tech_ops_ordem_saida", "tech_ops_itens_alocados",
  "gestao_usuarios", "gestao_operadoras", "gestao_mesas", "status_tecnico",
  "configuracoes", "simulador_login", "ajuda",
];
