import type { VersionamentoRelease } from "../../../lib/versionamento";

/**
 * Catálogo de releases semanais da página Versionamento.
 * Inclusão só via chat Cursor + `docs/HANDOFF-VERSIONAMENTO-RELEASE.md`.
 * Número sequencial crescente; a primeira publicada é `1`.
 */
export const VERSIONAMENTO_RELEASES: VersionamentoRelease[] = [
  {
    numero: 5,
    data: "14/09/2026",
    titulo: "Rotação, Alterar Escala e Network",
    resumo:
      "Rotação no Controle de Turno, Alterar Escala em grade do mês, tutoriais de Solicitações RH e expansão Network / sync de calendário.",
    palavrasChave: "grade do mes esportivabet ics",
    itens: [
      {
        tipo: "novo",
        paginas: ["escala_controle_turno"],
        titulo: "Gerar Rotação",
        descricao:
          "Prévia por estúdio, liderança, protocolo de 20 ou 30 minutos e publicação da grade na aba Rotação.",
        linkPagina: true,
        palavrasChave: "gerar rotacao incluir lideranca",
      },
      {
        tipo: "melhoria",
        paginas: ["rh_gestao_escala"],
        titulo: "Alterar Escala em grade do mês",
        descricao:
          "Ajuste vários dias de um prestador a partir de hoje, com uma observação única para a gravação.",
        linkPagina: true,
        palavrasChave: "alterar escala aprovada",
      },
      {
        tipo: "novo",
        paginas: ["rh_solicitacoes"],
        titulo: "Tutoriais por aba em Solicitações",
        descricao:
          "Reuniões, Vagas e Feedback ganham tutorial com atalho contextual na barra da página.",
        linkPagina: true,
        palavrasChave: "atestado reuniao vaga feedback",
      },
      {
        tipo: "melhoria",
        paginas: ["mesas_spin"],
        titulo: "Novas operadoras Network",
        descricao:
          "Inclusão e carga das marcas do grupo EsportivaBet no relatório do Overview Spin.",
        linkPagina: true,
        palavrasChave: "bateu brx rico donald betponto",
      },
      {
        tipo: "melhoria",
        paginas: ["rh_calendario"],
        titulo: "Sync com calendário externo",
        descricao:
          "Feed para acompanhar compromissos da plataforma fora do navegador.",
        linkPagina: true,
        palavrasChave: "ical ics google outlook",
      },
      {
        tipo: "novo",
        paginas: ["versionamento"],
        titulo: "Página Versionamento",
        descricao:
          "Acompanhe novidades, melhorias e correções publicadas a cada release da plataforma.",
        linkPagina: true,
        palavrasChave: "changelog release notas",
      },
      {
        tipo: "melhoria",
        paginas: ["influencers"],
        titulo: "Inativação de influencers",
        descricao:
          "Fluxo de status alinhado à gestão do cadastro de influencers.",
        linkPagina: true,
      },
    ],
  },
  {
    numero: 4,
    data: "31/08/2026",
    titulo: "Tech Ops, Ofertas Spin e Controle de Turno",
    resumo:
      "Itens Alocados no Tech Ops, ofertas da Spin no Marketplace e Controle de Turno no Estúdio; Portal de RH ganha gestão de postagens.",
    itens: [
      {
        tipo: "novo",
        paginas: ["tech_ops_itens_alocados"],
        titulo: "Checklist, limpeza e manutenção",
        descricao:
          "Operação do set vinculada ao estoque e às Ordens de Saída na página Itens Alocados.",
        linkPagina: true,
        palavrasChave: "tech ops set",
      },
      {
        tipo: "novo",
        paginas: ["escala_marketplace_turnos"],
        titulo: "Ofertas Spin",
        descricao:
          "Cobertura de turno e liberação de vaga publicadas pela Spin Gaming no Marketplace.",
        linkPagina: true,
        palavrasChave: "ofertas spin cobertura liberacao",
      },
      {
        tipo: "novo",
        paginas: ["escala_controle_turno"],
        titulo: "Escala de turno e relatório",
        descricao:
          "Aprove a escala do turno e consulte o relatório na mesma página do Estúdio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_portal"],
        titulo: "Gerenciamento de postagens",
        descricao:
          "Crie, aprove e arquive comunicados, políticas e RH Talks no Portal de RH.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_figurinos"],
        titulo: "Manual e retirada/devolução",
        descricao:
          "Fluxo de figurino com orientação e registro operacional de retirada e devolução.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: "*",
        titulo: "Torneio Live CDA",
        descricao:
          "Página pública de ranking e pontuação do torneio da Casa de Apostas.",
        palavrasChave: "torneio cda live cassino",
      },
    ],
  },
  {
    numero: 3,
    data: "17/08/2026",
    titulo: "Tutoriais, presença e Homes por perfil",
    resumo:
      "Tutoriais na Ajuda, fluxo de atestados e justificativa de presença, impressão de IDs e Homes dedicadas por perfil.",
    itens: [
      {
        tipo: "novo",
        paginas: ["ajuda"],
        titulo: "Aba Tutoriais",
        descricao:
          "Passos ilustrados por perfil; o administrador define quem vê cada tutorial.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_solicitacoes"],
        titulo: "Aprovar atestados",
        descricao:
          "Analise solicitações Em análise e grave o atendimento na Escala.",
        linkPagina: true,
        palavrasChave: "atestado abono",
      },
      {
        tipo: "novo",
        paginas: ["rh_calendario"],
        titulo: "Justificativa de presença",
        descricao:
          "Registre justificativa no Controle de Presença com tutorial dedicado.",
        linkPagina: true,
        palavrasChave: "check-in check-out",
      },
      {
        tipo: "novo",
        paginas: ["rh_staff"],
        titulo: "Imprimir IDs",
        descricao:
          "Gere PDF com cartões e código de barras dos prestadores selecionados.",
        linkPagina: true,
        palavrasChave: "etiqueta barcode gs1",
      },
      {
        tipo: "melhoria",
        paginas: ["home"],
        titulo: "Homes por perfil",
        descricao:
          "Layout e atalhos alinhados ao perfil (Game Presenter, Shuffler, Service Manager, Influencer e outros).",
      },
      {
        tipo: "melhoria",
        paginas: ["simulador_login"],
        titulo: "Simulação com usuário ativo",
        descricao:
          "Escolha a pessoa ativa do perfil para ver a plataforma como ela.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["academy_performance_hub"],
        titulo: "Fluxos do Performance Coach",
        descricao:
          "Avaliação e feedback com tutoriais na Academy.",
        linkPagina: true,
      },
    ],
  },
  {
    numero: 2,
    data: "03/08/2026",
    titulo: "Marketplace, Incidentes e Overview Prestador",
    resumo:
      "Entrada do Marketplace de turnos, Incidentes com scripts e Overview Prestador; Overview Spin ganha posicionamento de novas marcas.",
    itens: [
      {
        tipo: "novo",
        paginas: ["escala_marketplace_turnos"],
        titulo: "Ofertas de turno, folga e troca",
        descricao:
          "Publique, aceite e acompanhe negociações que atualizam a Escala.",
        linkPagina: true,
        palavrasChave: "compra venda troca",
      },
      {
        tipo: "novo",
        paginas: ["incidentes"],
        titulo: "Registro de Incidentes",
        descricao:
          "Abra tickets com scripts de descrição, anexos e fluxo de salvar e criar outro.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["dash_overview_prestador"],
        titulo: "Overview do Prestador",
        descricao:
          "KPIs e movimentações do colaborador no mês.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["mesas_spin"],
        titulo: "Posicionamento Esportiva e JonBet",
        descricao:
          "A aba Posicionamento cobre as novas marcas no lobby.",
        linkPagina: true,
        palavrasChave: "lobby grafana",
      },
      {
        tipo: "novo",
        paginas: ["incidentes"],
        titulo: "Aba Sinais",
        descricao:
          "Totais e TMAs dos sinais atendidos pelos Service Managers.",
        linkPagina: true,
        palavrasChave: "tma sinais",
      },
      {
        tipo: "novo",
        paginas: ["rh_central_denuncias"],
        titulo: "Tipo Elogios no canal",
        descricao:
          "O canal público passa a receber também relatos de elogio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["ajuda"],
        titulo: "Atalhos de Ajuda nas páginas",
        descricao:
          "Conheça e Troubleshooting direto da barra de filtros.",
        linkPagina: true,
        palavrasChave: "ajuda contextual",
      },
    ],
  },
  {
    numero: 1,
    data: "20/07/2026",
    titulo: "Calendário, Escala e Academy",
    resumo:
      "A quinzena reforça a operação do estúdio no Calendário e na Escala, amplia o Portal da Academy e abre o Headcount no RH.",
    itens: [
      {
        tipo: "novo",
        paginas: ["rh_calendario"],
        titulo: "Calendário operacional do prestador",
        descricao:
          "Consulte escala aprovada, compromissos e o fluxo de presença no mês.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_gestao_escala"],
        titulo: "Escala mais estável e exportação",
        descricao:
          "Ajuste a grade com mais segurança e baixe o Excel do time e do mês.",
        linkPagina: true,
        palavrasChave: "baixar excel",
      },
      {
        tipo: "novo",
        paginas: ["rh_gestao_escala"],
        titulo: "Rotação na operação",
        descricao:
          "Organize a rotação do turno alinhada à escala do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["academy_portal"],
        titulo: "Manuais e Dicas no Gerenciamento",
        descricao:
          "Edite publicações, versione manuais e alinhe o card de Dicas ao de Comunicados.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["dash_headcount"],
        titulo: "Dashboard de Headcount",
        descricao:
          "Acompanhe indicadores de RH por período no menu Dashboards.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["tech_ops_estoque"],
        titulo: "Tech Ops na plataforma",
        descricao:
          "Estoque e Ordem de Saída passam a integrar o fluxo operacional.",
        linkPagina: true,
        palavrasChave: "ordem de saida",
      },
      {
        tipo: "novo",
        paginas: ["dash_afiliados"],
        titulo: "Overview de Afiliados",
        descricao:
          "Visão consolidada de afiliados nos Dashboards.",
        linkPagina: true,
      },
    ],
  },
];
