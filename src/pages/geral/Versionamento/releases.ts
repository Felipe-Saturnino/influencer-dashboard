import type { VersionamentoRelease } from "../../../lib/versionamento";

/**
 * Catálogo de releases semanais da página Versionamento.
 * Inclusão só via chat Cursor + `docs/HANDOFF-VERSIONAMENTO-RELEASE.md`.
 * Número sequencial crescente; a primeira publicada é `1`.
 */
export const VERSIONAMENTO_RELEASES: VersionamentoRelease[] = [
  {
    numero: 14,
    data: "14/09/2026",
    titulo: "Rotação, Alterar Escala e Network",
    resumo:
      "Rotação no Controle de Turno, Alterar Escala em grade do mês, tutoriais de Solicitações RH e expansão Network / sync de calendário.",
    palavrasChave: "grade do mes esportivabet ics",
    itens: [
      {
        tipo: "melhoria",
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
        tipo: "melhoria",
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
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Controle de Turno, Escala Estúdio, Solicitações de RH, Overview Spin, Calendário e Influencers.",
      },
    ],
  },
  {
    numero: 13,
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
        tipo: "melhoria",
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
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Marketplace, Portal de RH e Figurinos.",
      },
    ],
  },
  {
    numero: 12,
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
        tipo: "melhoria",
        paginas: ["rh_solicitacoes"],
        titulo: "Aprovar atestados",
        descricao:
          "Analise solicitações Em análise e grave o atendimento na Escala.",
        linkPagina: true,
        palavrasChave: "atestado abono",
      },
      {
        tipo: "melhoria",
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
        descricao: "Avaliação e feedback com tutoriais na Academy.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Solicitações de RH, Calendário, Home, Simulador de Login e Performance Hub.",
      },
    ],
  },
  {
    numero: 11,
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
        descricao: "KPIs e movimentações do colaborador no mês.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["mesas_spin"],
        titulo: "Posicionamento Esportiva e JonBet",
        descricao: "A aba Posicionamento cobre as novas marcas no lobby.",
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
        tipo: "melhoria",
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
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Overview Spin, Central de Denúncias e Ajuda.",
      },
    ],
  },
  {
    numero: 10,
    data: "20/07/2026",
    titulo: "Calendário, Escala e Academy",
    resumo:
      "A quinzena reforça a operação do estúdio no Calendário e na Escala, amplia o Portal da Academy e abre o Headcount no RH.",
    itens: [
      {
        tipo: "melhoria",
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
        tipo: "melhoria",
        paginas: ["dash_afiliados"],
        titulo: "Overview de Afiliados",
        descricao: "Visão consolidada de afiliados nos Dashboards.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Calendário, Portal da Academy e Overview Afiliados.",
      },
    ],
  },
  {
    numero: 9,
    data: "06/07/2026",
    titulo: "Academy, CS e Simulador",
    resumo:
      "Portal Academy e Performance Coach, Atendimento (CS), Solicitações e Simulador de Login.",
    itens: [
      {
        tipo: "novo",
        paginas: ["academy_portal"],
        titulo: "Portal da Academy",
        descricao: "Manuais, dicas e conteúdo do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["academy_performance_hub"],
        titulo: "Performance Hub",
        descricao: "Avaliações do Performance Coach.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["cs_atendimento"],
        titulo: "Atendimento",
        descricao: "Canal de atendimento do Customer Success na plataforma.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_solicitacoes"],
        titulo: "Solicitações de RH",
        descricao: "Fluxo inicial de solicitações de RH.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["simulador_login"],
        titulo: "Simulador de Login",
        descricao:
          "Visualize a plataforma com outro perfil e usuário ativo.",
        linkPagina: true,
        palavrasChave: "logar como",
      },
      {
        tipo: "melhoria",
        paginas: ["rh_figurinos"],
        titulo: "Figurinos",
        descricao: "Evolução do fluxo de figurino e uploads.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["home"],
        titulo: "Homes de mais perfis",
        descricao: "Entrada alinhada ao papel do usuário.",
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Figurinos e Home.",
      },
    ],
  },
  {
    numero: 8,
    data: "22/06/2026",
    titulo: "Comercial, Estúdios e Galeria",
    resumo:
      "Pipeline comercial B2B, Gestão de Estúdios, Galeria de Fotos e evolução do Portal de RH.",
    itens: [
      {
        tipo: "novo",
        paginas: ["comercial_overview"],
        titulo: "Overview Comercial",
        descricao: "Visão comercial no menu Dashboards.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["comercial_pipeline_b2b"],
        titulo: "Pipeline B2B",
        descricao: "Oportunidades e automação comercial.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["galeria_fotos"],
        titulo: "Galeria de Fotos",
        descricao:
          "Fotos de evento e documentos do prestador na Galeria de Fotos.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["gestao_mesas"],
        titulo: "Gestão de Estúdios",
        descricao: "Configuração e cadastro de estúdios ampliados.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_portal"],
        titulo: "Portal de RH ampliado",
        descricao: "Mais fluxos de conteúdo e ciência.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: "*",
        titulo: "Histórico e pré-preenchimento",
        descricao: "Menos retrabalho em formulários recorrentes.",
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Gestão de Estúdios e Portal de RH.",
      },
    ],
  },
  {
    numero: 7,
    data: "08/06/2026",
    titulo: "Homes por perfil e Informativos",
    resumo:
      "Homes de Operador e Investidor, evolução de Staff e painel de notícias.",
    itens: [
      {
        tipo: "novo",
        paginas: ["home"],
        titulo: "Home do Operador e do Investidor",
        descricao:
          "Visão inicial com identidade da operadora e atalhos executivos.",
      },
      {
        tipo: "novo",
        paginas: "*",
        titulo: "Painel de notícias",
        descricao: "Exibição pública de notícias sincronizadas.",
        palavrasChave: "rss painel",
      },
      {
        tipo: "melhoria",
        paginas: ["rh_staff"],
        titulo: "Cards e KPIs na Staff",
        descricao: "Destaques consolidados para Game Presenter.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["banca_jogo"],
        titulo: "Layout da Banca de Jogo",
        descricao: "Consolidado e leitura mais claros.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["informativos"],
        titulo: "Informativos na Home",
        descricao: "Feed de informativos por perfil.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Gestão de Staff, Banca de Jogo e Informativos.",
      },
    ],
  },
  {
    numero: 6,
    data: "25/05/2026",
    titulo: "Ajuda, Portal RH, Denúncias e Posicionamento",
    resumo:
      "Ajuda na plataforma, Portal de RH, canal de denúncias, check-in/out e posicionamento no Overview Spin.",
    itens: [
      {
        tipo: "novo",
        paginas: ["ajuda"],
        titulo: "Página Ajuda",
        descricao: "Conheça a plataforma e tire dúvidas por página.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_portal"],
        titulo: "Portal de RH",
        descricao: "Comunicados e conteúdo interno de RH.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_central_denuncias"],
        titulo: "Canal de denúncias",
        descricao: "Registro e acompanhamento de relatos.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["mesas_spin"],
        titulo: "Posicionamento no lobby",
        descricao: "Consulta de posicionamento das mesas no Overview Spin.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_dados_cadastro"],
        titulo: "Atualização cadastral",
        descricao: "Prestador revisa e confirma dados cadastrais.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["informativos"],
        titulo: "Informativos",
        descricao: "Publicação de informativos por perfil.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_calendario"],
        titulo: "Check-in e Check-out",
        descricao: "Registro de presença no fluxo do calendário.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_gestao_escala"],
        titulo: "Evolução da Escala",
        descricao: "Grade e operação do mês mais completas.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_vagas"],
        titulo: "Kanban de Vagas",
        descricao: "Acompanhe candidaturas em quadro.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Calendário, Escala Estúdio e Vagas.",
      },
    ],
  },
  {
    numero: 5,
    data: "11/05/2026",
    titulo: "Prestadores, Afiliados e Spin na Rede",
    resumo:
      "Afiliados e Spin na Rede no conteúdo; prestadores e início do Calendário.",
    itens: [
      {
        tipo: "novo",
        paginas: ["afiliados"],
        titulo: "Módulo Afiliados",
        descricao: "Gestão e acompanhamento de afiliados.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["spin_na_rede"],
        titulo: "Spin na Rede",
        descricao: "Conteúdo com sincronização RSS.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_calendario"],
        titulo: "Calendário",
        descricao: "Primeira versão do calendário operacional.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["rh_funcionarios"],
        titulo: "Criação de prestadores",
        descricao: "Alta de colaboradores e usuários vinculados.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Gestão de Prestadores.",
      },
    ],
  },
  {
    numero: 4,
    data: "27/04/2026",
    titulo: "RH, Escala, Figurinos e Mídias",
    resumo:
      "Bloco RH e Escala sobe de nível: Staff, Escala do mês, Organograma, Figurinos e Mídias Sociais.",
    itens: [
      {
        tipo: "novo",
        paginas: ["rh_staff"],
        titulo: "Gestão de Staff",
        descricao: "Cadastro operacional de prestadores do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_gestao_escala"],
        titulo: "Escala do mês",
        descricao: "Grade por time, colaborador e dia.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["gestao_mesas"],
        titulo: "Gestão de Estúdios",
        descricao: "Cadastro de mesas e estúdios na plataforma.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_organograma"],
        titulo: "Organograma",
        descricao: "Estrutura de diretorias, gerências e times.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_funcionarios"],
        titulo: "Gestão de Prestadores",
        descricao: "Cadastro RH de colaboradores.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_figurinos"],
        titulo: "Figurinos",
        descricao: "Controle de figurino, incluindo figurino fixo.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["dash_midias_sociais"],
        titulo: "Mídias Sociais",
        descricao: "KPIs de redes no menu Dashboards.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["rh_vagas"],
        titulo: "Vagas",
        descricao: "Abertura do fluxo de vagas no RH.",
        linkPagina: true,
      },
    ],
  },
  {
    numero: 3,
    data: "13/04/2026",
    titulo: "Streamers, Dealers e Notificações",
    resumo:
      "Dashboard Streamers amadurece; Central de Notificações e evolução de Dealers e Overview Spin.",
    itens: [
      {
        tipo: "novo",
        paginas: ["streamers"],
        titulo: "Dashboard Streamers",
        descricao: "KPIs e funil de performance de lives.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["central_notificacoes"],
        titulo: "Central de Notificações",
        descricao: "Campanhas de notificação do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["gestao_dealers"],
        titulo: "Gestão de Dealers ampliada",
        descricao: "Cadastro e operação de dealers mais completos.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["mesas_spin"],
        titulo: "Operadoras no Overview Spin",
        descricao: "Filtro e visão por parceira no relatório de mesas.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: ["gestao_usuarios"],
        titulo: "Último login e filtros",
        descricao: "Acompanhe acesso e filtre usuários com mais facilidade.",
        linkPagina: true,
      },
      {
        tipo: "correcao",
        paginas: "*",
        titulo: "Estabilidade e qualidade da plataforma",
        descricao:
          "Correções e reforço da saúde do código com impacto em Gestão de Dealers, Overview Spin e Gestão de Usuários.",
      },
    ],
  },
  {
    numero: 2,
    data: "30/03/2026",
    titulo: "Overview Spin, Banca e Playbook",
    resumo:
      "Entrada do Overview Spin e da Banca de Jogo; Playbook e Roteiro de Mesa entram no produto.",
    itens: [
      {
        tipo: "novo",
        paginas: ["mesas_spin"],
        titulo: "Página Overview Spin",
        descricao: "Resultados das mesas ao vivo por operadora e período.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["banca_jogo"],
        titulo: "Página Banca de Jogo",
        descricao: "Acompanhamento da banca na Aquisição.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["playbook_influencers"],
        titulo: "Playbook Influencers",
        descricao: "Diretrizes e ciência antes das ativações.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["roteiro_mesa"],
        titulo: "Roteiro de Mesa",
        descricao: "Organização do roteiro operacional do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: "*",
        titulo: "Plataforma responsiva",
        descricao: "Uso melhor em telas menores.",
      },
    ],
  },
  {
    numero: 1,
    data: "16/03/2026",
    titulo: "Base da plataforma e acessos",
    resumo:
      "Fundação do menu, permissões por perfil, Scout e primeiras páginas de operação.",
    itens: [
      {
        tipo: "novo",
        paginas: ["gestao_usuarios"],
        titulo: "Matriz de permissões por perfil",
        descricao:
          "Controle de Ver, Criar, Editar e Excluir por página.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["scout"],
        titulo: "Página Scout",
        descricao:
          "Prospecção de influencers e criação de usuário a partir do fluxo.",
        linkPagina: true,
      },
      {
        tipo: "novo",
        paginas: ["gestao_dealers"],
        titulo: "Gestão de Dealers",
        descricao: "Catálogo inicial de dealers do estúdio.",
        linkPagina: true,
      },
      {
        tipo: "melhoria",
        paginas: "*",
        titulo: "Menu e layout das páginas",
        descricao: "Navegação e cabeçalhos alinhados à plataforma.",
      },
    ],
  },
];
