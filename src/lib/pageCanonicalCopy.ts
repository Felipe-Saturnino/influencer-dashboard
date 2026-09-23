import type { PageKey } from "../types";

/**
 * Subtítulos canónicos de página (Brand §4 / MDC da secção).
 * Fonte única para PageHeader (quando migrado) e atalhos da Home
 * (`AtalhosCuradosHome` / `AtalhosStaffHome` / Investidor / Operador / …).
 * Preferir o mesmo texto do `subtitle` do PageHeader da página.
 */
export const PAGE_CANONICAL_SUBTITLE: Partial<Record<PageKey, string>> = {
  // ── Lives / Aquisição ──────────────────────────────────────────────
  agenda: "Visualize, agende e acompanhe as lives dos influencers.",
  resultados: "Consulte o desempenho das lives realizadas.",
  feedback: "Veja observações e métricas das lives recentes.",
  influencers: "Seu perfil de influencer na plataforma.",
  playbook_influencers:
    "Leia as diretrizes obrigatórias e registre sua ciência antes de transmitir.",
  scout: "Registre prospectos e acompanhe o funil do primeiro contato ao fechamento.",
  financeiro: "Gerencie os ciclos de pagamento dos influencers e afiliados, do rascunho ao pago.",
  banca_jogo: "Solicite, aprove e libere bancas de jogo por parceiro e operadora.",

  // ── Dashboards ─────────────────────────────────────────────────────
  mesas_spin: "Resultados financeiros e operacionais das mesas ao vivo por operadora.",
  streamers: "Acompanhe performance, conversão e financeiro do canal de influencers.",
  dash_afiliados: "Acompanhe performance, conversão e financeiro do canal de afiliados.",
  dash_overview_influencer:
    "Resumo executivo de financeiro, operação e conversão do canal de influencers.",
  dash_overview_afiliado:
    "Resumo executivo de financeiro e conversão do canal de afiliados.",
  dash_headcount:
    "Visão executiva de headcount, movimentação e pipeline de contratação.",
  dash_overview_prestador:
    "Acompanhe escala, presença, absenteísmo e movimentações de turno por time ou visão individual.",
  dash_midias_sociais:
    "Monitore alcance orgânico, impulsionamento Meta e a conversão das campanhas rastreadas.",

  // ── Afiliados ──────────────────────────────────────────────────────
  afiliados: "Seu perfil de afiliado na plataforma.",

  // ── Conteúdo / Marketing ───────────────────────────────────────────
  links_materiais: "Gere seu link rastreado exclusivo e exporte QR Codes prontos para divulgação.",
  informativos: "Comunicados e avisos para a Home de cada Perfil.",
  spin_na_rede: "Acompanhe as menções e aparições públicas da Spin Gaming na mídia.",
  galeria_fotos:
    "Organize fotos de eventos, publique materiais gerais e vincule imagens individuais aos prestadores.",
  campanhas:
    "Cadastre campanhas de mídia e vincule UTMs para monitorar performance nos dashboards.",
  gestao_links:
    "Mapeie UTMs detectados a influencers, afiliados ou campanhas e alimente os relatórios.",

  // ── Plataforma ─────────────────────────────────────────────────────
  gestao_usuarios:
    "Configure e acompanhe os usuários, permissões por perfil e menus de acesso à plataforma.",
  gestao_operadoras:
    "Gerencie operadoras parceiras, identidade visual e configurações de integração.",
  gestao_mesas:
    "Cadastre estúdios e mesas, vincule operadoras e gerencie identificadores por parceiro.",
  status_tecnico: "Monitore integrações, alertas automáticos e sincronizações da plataforma.",
  ajuda:
    "Conheça as funcionalidades da plataforma, o glossário, tutoriais passo a passo e soluções para problemas comuns.",
  versionamento:
    "Acompanhe as novidades, melhorias e correções publicadas a cada semana na plataforma.",

  // ── RH / Escala ────────────────────────────────────────────────────
  rh_calendario:
    "Organize a rotina operacional com visibilidade completa de turnos e compromissos.",
  rh_organograma:
    "Conheça a empresa, saiba mais sobre os times e pessoas que fazem a operação acontecer.",
  rh_figurinos: "Controle o inventário de peças com retiradas, devoluções e manutenções.",
  rh_funcionarios: "Cadastro, head count e fluxos de RH.",
  rh_solicitacoes: "Acompanhe e atenda solicitações de prestadores.",
  rh_vagas: "Candidaturas e processos seletivos.",
  rh_portal: "Comunicados oficiais, políticas internas e atas das RH Talks.",
  rh_central_denuncias: "Canal de denúncias Spin.",
  rh_gestao_escala: "Gere a escala por área (time), prestador e dia do mês.",
  escala_controle_turno:
    "Acompanhe rotação, escala/presença e notificações operacionais do turno.",
  escala_solicitacoes:
    "Acompanhe solicitações em aberto e o histórico arquivado por período, time e prestador.",
  escala_marketplace_turnos: "Ofertas de venda e troca de turnos.",
  gestao_dealers:
    "Catálogo de Game Presenters em operação — especialidades, turnos e solicitações das operadoras.",
  incidentes: "Registre e acompanhe erros de mesa por Game Presenter e Shuffler no período.",

  // ── Tech Ops ───────────────────────────────────────────────────────
  tech_ops_estoque:
    "Controle o estoque de itens, equipamentos e insumos de jogo e o cadastro de fornecedores.",
  tech_ops_ordem_saida:
    "Solicite e acompanhe as ordens de saída internas, externas e de manutenção dos ativos.",
  tech_ops_itens_alocados:
    "Checklist de itens e equipamentos alocados por local e mesa, com limpeza e manutenção.",

  // ── Academy / CS ───────────────────────────────────────────────────
  academy_performance_hub: "Portal de avaliação de desempenho dos Prestadores.",
  academy_portal: "Comunicados, dicas e manuais de treinamento para a operação.",
  academy_cronograma: "Monte as trilhas, os materiais das aulas e as provas dos cronogramas de entrada e atualização.",
  cs_atendimento:
    "Gerencie os chamados para CS, acompanhe SLA e veja os atendimentos da equipe.",
};

export function getPageCanonicalSubtitle(pageKey: PageKey): string {
  return PAGE_CANONICAL_SUBTITLE[pageKey] ?? "";
}
