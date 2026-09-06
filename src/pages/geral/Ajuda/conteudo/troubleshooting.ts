// ─── Conteúdo: Troubleshooting ────────────────────────────────────────────────

/** Blocos transversais — exibidos no topo da aba Troubleshooting (todas as páginas do menu). */
export const TROUBLESHOOTING_TRANSVERSAL = {
  titulo: "Plataforma",
  blocos: [
    {
      subtitulo: "Pesquisei sem acento e não encontrei o nome (ou o contrário)?",
      texto:
        "Comportamento esperado: as barras de pesquisa da plataforma ignoram acentos e diferença de maiúsculas/minúsculas. Exemplos: «Flavia» encontra «Flávia»; «jose» encontra «José»; «Sao Paulo» encontra «São Paulo». Com **várias palavras**, cada uma precisa aparecer no cadastro — a ordem e o nome do meio não importam (ex.: «Alexandre Zanchetta» encontra «Alexandre Galvão Zanchetta»). Vale para listas com **BarraPesquisaPagina**, busca em consolidados (Financeiro, Banca de Jogo), glossário e campo de busca dentro de filtros com muitas opções (Influencer, Staff, etc.).\n\nSe ainda não aparecer, confira outros filtros ativos na página (status, operadora, período, time, estúdio, turno) — a busca só restringe o que já está visível no escopo dos demais filtros.\n\nExceção: na **Central de Denúncias**, parte da busca é feita no servidor e pode exigir o mesmo acento do cadastro até migração completa.",
    },
    {
      subtitulo: "A página ficou em «Atualizando...» ou pedindo para recarregar?",
      texto:
        "Isso acontece logo após uma nova versão da plataforma entrar no ar: o navegador ainda tem em cache a versão anterior e não encontra um dos arquivos atualizados.\n\nA plataforma tenta se atualizar sozinha. Se a mensagem **Nova versão disponível** permanecer, clique em **Recarregar página**.\n\nSe continuar, force a atualização com **Ctrl+Shift+R** (ou **Cmd+Shift+R** no Mac) e, em último caso, abra numa janela anônima. Persistindo, entre em contato com o suporte.",
    },
    {
      subtitulo: "No celular (Safari) vejo «Erro ao carregar a página» com o menu ainda visível?",
      texto:
        "O menu e o cabeçalho carregaram, mas a área da página falhou — comum no Safari do iPhone após uma atualização da plataforma ou com cache antigo do site.\n\nA plataforma tenta se atualizar sozinha (você pode ver **Atualizando…** por um instante). Se aparecer **Nova versão disponível**, toque em **Recarregar página**.\n\nSe voltar o mesmo aviso: feche a aba, abra de novo o endereço da plataforma ou use uma aba anônima. No iPhone: Ajustes → Safari → **Limpar histórico e dados do site** (só se as opções anteriores não resolverem).\n\nChrome ou outro navegador no mesmo celular costuma funcionar — isso não substitui o Safari, mas ajuda a confirmar se o problema é cache. Se continuar só no Safari, entre em contato com o suporte informando o modelo do iPhone e a versão do iOS.",
    },
    {
      subtitulo: "No endereço de staging (pages.dev) aparece que não tenho acesso ao ambiente?",
      texto:
        "O ambiente de preview/staging restringe o login a uma lista de e-mails definida pela equipe (variável de build no Cloudflare Pages — Preview). Produção e o uso local não usam essa lista. Quem não está autorizado vê a mensagem de acesso negado e não entra nas features em desenvolvimento. Integrações e rotas `/api/*` (formulários do site, webhooks) **não** são bloqueadas por essa regra. Se você precisa de acesso ao staging, peça inclusão do seu e-mail ao administrador.",
    },
    {
      subtitulo: "Depois de entrar, caí em «Você não tem acesso a esta página» em vez da Home?",
      texto:
        "Comportamento esperado: após o login — e após definir a senha no primeiro acesso — a plataforma abre sempre a **Home**, mesmo que o endereço no navegador fosse de outra página.\n\nSe ainda aparecer a tela de sem acesso logo depois de entrar, saia e entre novamente. Se o problema persistir, entre em contato com o suporte.",
    },
  ],
} as const;

export const CONTEUDO_TROUBLE: Record<string, { titulo: string; blocos: { subtitulo: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        subtitulo: "Os dados mudaram ao trocar de aba, mas eu não alterei os filtros?",
        texto:
          "Comportamento esperado: todas as abas compartilham os mesmos filtros, mas cada uma busca seus dados de forma independente ao ser carregada pela primeira vez. O indicador 'Carregando…' na barra de filtros indica que a aba atual ainda está buscando os dados. Aguarde o término do carregamento. Use ← → do teclado nas abas quando o foco estiver na tablist.",
      },
      {
        subtitulo: "O Comparativo de Funil não mostra nenhum influencer nas opções?",
        texto:
          "Os seletores do Comparativo de Funil exibem apenas os influencers com dados no período selecionado. Se não há dados para o período (mês sem lives ou sem métricas), os seletores ficam vazios. Tente selecionar outro mês ou ativar o modo Histórico para ver todos os períodos acumulados.",
      },
      {
        subtitulo: "O Ranking FTD/Hora está vazio ou com poucos influencers?",
        texto:
          "O pódio e a lista de FTD/Hora exibem apenas influencers com horas de live registradas no período. Influencers com métricas de conversão mas sem lives cadastradas no sistema não aparecem neste ranking. Verifique se as lives do período foram corretamente registradas com duração na agenda.",
      },
      {
        subtitulo: "O ROI aparece como '—' para alguns influencers?",
        texto:
          "ROI exibe '—' quando não há investimento registrado para o influencer no período. Isso ocorre quando o pagamento ainda não foi confirmado (status Pendente) ou quando o influencer não tem contrato de cachê cadastrado. Apenas pagamentos com status Pago são considerados no cálculo.",
      },
      {
        subtitulo: "O Investimento do Relatório Diário veio R$ 0 e o Streamers mostra valor?",
        texto:
          "O e-mail Relatório Diário (bloco Resultado de Streamers) usa a mesma regra da página Streamers: só pagamentos com status Pago, no mês do consolidado, pela data de fim do ciclo — não pela data em que o pagamento foi marcado como Pago. A visão é global (Todas Operadoras / Todos Influencers).\n\nO valor deve coincidir com o KPI Investimento do Overview Streamers no mês corrente. Não compare com um único ciclo na página Financeiro: o KPI soma todos os ciclos pagos do mês. Se o e-mail do mesmo dia continuar zerado e a página mostrar valor, entre em contato com o suporte.",
      },
      {
        subtitulo: "O PVI está como 0 ou parece inconsistente?",
        texto:
          "O PVI (Player Value Index) é calculado com base em três componentes: ticket médio de depósito, GGR por jogador e WD Ratio. Se qualquer um desses dados for zero (ex.: influencer sem depósitos registrados), o PVI não pode ser calculado corretamente e pode aparecer baixo ou zerado. Isso é esperado para influencers com poucos FTDs no período.",
      },
      {
        subtitulo: "Os KPIs mostram valores diferentes entre Overview e Financeiro?",
        texto:
          "As três abas usam a mesma busca linha a linha de métricas e lives do período. Diferenças entre Overview e Financeiro costumam vir do recorte exibido (ex.: investimento de agentes no Overview, PVI e perfil de jogador no Financeiro), não de um procedimento especial do banco. Se a divergência parecer inconsistente para o mesmo filtro e mês, entre em contato com o suporte informando o mês e os valores observados.",
      },
    ],
  },
  dash_afiliados: {
    titulo: "Afiliados",
    blocos: [
      {
        subtitulo: "Por que vejo 'Sem dados para o filtro selecionado' em todos os blocos?",
        texto:
          "Confirme o período no carrossel (ou Histórico), o filtro de afiliado e a operadora. As métricas vêm do sync CDA — conta Afiliados (Status Técnico → Casa de Apostas (CDA) — Afiliados). O afiliado precisa ter UTM mapeado (Links e Materiais ou Gestão de Links → Mapear como Afiliado) e o sync precisa ter rodado após o mapeamento. Links só com visita na TAP e ainda não mapeados aparecem em Gestão de Links → Pendentes (Origem = TAP Afiliados). Se o filtro de afiliados estiver vazio, verifique cadastros na página Afiliados.",
      },
      {
        subtitulo: "Não vejo Afiliados no menu de Dashboards?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de Ver para a página Afiliados na seção Dashboards. Administradores têm acesso total. Não confunda com a página Afiliados da seção de cadastro.",
      },
    ],
  },
  mesas_spin: {
    titulo: "Overview Spin",
    blocos: [
      {
        subtitulo: "Os KPIs aparecem como '—' mesmo com o mês selecionado?",
        texto:
          "Causa mais provável: não há dados carregados para o período. Verifique se o filtro de operadora está correto — se uma operadora específica estiver selecionada mas não tiver dados naquele mês, todos os KPIs exibem '—'. Tente selecionar **Todas Operadoras** no filtro para confirmar se existem dados consolidados. Se o problema persistir para o mês atual, pode ser que o processamento diário ainda não tenha sido executado.",
      },
      {
        subtitulo: "O Comparativo de Mesa não aparece mesmo com dados no mês?",
        texto:
          "Com **Todas Operadoras**, o Comparativo de mesa e Dados por mesa pedem que você selecione uma operadora. Escolha uma operadora no filtro e verifique se há dados de mesa individuais no período. Se não houver registros de mesas (somente resumo diário), a seção permanece vazia.",
      },
      {
        subtitulo: "A aba Posicionamento não carrega ou aparece vazia?",
        texto:
          "O Posicionamento tenta o snapshot do **dia civil de Brasília**. Se o monitor horário ainda não executou hoje, a aba mostra o **último horário** válido (em geral ontem) — não fica vazia só por falta de coleta do dia. Confira **Última atualização** no bloco de mesas e, em **Status Técnico**, se Lobby Blaze / CDA / Esportiva Bet / Jonbet estão OK. Com **Todas Operadoras**, as quatro parceiras aparecem lado a lado; com operadora específica, só aquela. Se a aba continuar vazia após **Tentar de novo** e hard refresh (Ctrl+Shift+R), avise o time de produto.",
      },
      {
        subtitulo: "Os dados do Histórico parecem diferentes do mês selecionado individualmente?",
        texto:
          "O Histórico agrega 13 competências mensais — a atual e as 12 anteriores. Algumas métricas como UAP e ARPU são calculadas de forma diferente: no modo Histórico, o UAP exibido no KPI é a média mensal dos períodos, não a soma. Isso é esperado — UAP é uma métrica de período, não acumulável. Para ver o UAP exato de um mês específico entre o atual e os dois anteriores, navegue até aquele mês sem ativar o Histórico.",
      },
      {
        subtitulo: "O modo gráfico do Detalhamento mostra barras muito pequenas para uma operadora?",
        texto:
          "No gráfico por operadora, cada plataforma é representada por uma barra separada no mesmo dia. Se uma operadora tem volume muito menor que outra, as barras ficam proporcionalmente pequenas. Isso é comportamento correto — use a tabela para ver os valores exatos. Alterne para o modo Tabela clicando no botão 'Tabela' no canto superior direito da seção.",
      },
      {
        subtitulo: "Não consigo selecionar operadoras no filtro?",
        texto:
          "O filtro de operadoras aparece para Administrador e para quem tem permissão de Ver **Sim** em Overview Spin (Gestão de Usuários). Com Ver **Próprios**, o seletor não aparece e os dados ficam travados no escopo da operadora. Nas abas Estúdio Dedicado e Estúdio Network, a lista só inclui operadoras com estúdio daquele tipo vinculado em Gestão de Estúdios."
      },
      {
        subtitulo: "Não vejo a aba Estúdio Dedicado ou Estúdio Network?",
        texto:
          "Essas abas aparecem conforme os estúdios vinculados à operadora em Gestão de Estúdios (tipo dedicado ou network). Se a operadora opera só em estúdio network, a aba Estúdio Dedicado fica oculta — e o contrário também. Se nenhuma das abas financeiras aparecer e só Posicionamento estiver visível, confira se os estúdios estão ativos e ligados à operadora na Gestão de Estúdios e se a permissão de Ver em Overview Spin está liberada.",
      },
      {
        subtitulo: "Não vejo a aba Overview?",
        texto:
          "A aba Overview soma Dedicado e Network. Ela só aparece quando o seu escopo tem estúdios nos dois tipos. Se a operadora opera só em Network (ou só em Dedicado), você vê o canal correspondente e Posicionamento — a soma Overview não faz sentido nesse caso.",
      },
    ],
  },
  dash_midias_sociais: {
    titulo: "Mídias Sociais",
    blocos: [
      {
        subtitulo: "Não aparecem dados no Overview mesmo com o mês selecionado?",
        texto:
          "O Overview exibe dados de campanhas com UTMs mapeadas. Se nenhuma campanha tiver UTMs vinculadas no período, as tabelas ficam vazias e os KPIs mostram zero. Verifique se há UTMs mapeadas em Marketing → Gestão de Links e se houve tráfego no mês. Campanhas inativas ainda entram nos totais e nas tabelas quando geraram métricas no período (ou sempre, com Histórico ativo).",
      },
      {
        subtitulo: "Os KPIs de alcance na aba Alcance estão zerados ou com '—'?",
        texto:
          "Os KPIs da aba Alcance vêm da integração com as APIs do Instagram, Facebook e YouTube. Se a integração estava desconectada ou houve falha no ETL (processo de coleta de dados) no período selecionado, os dados não estarão disponíveis. Os dados de mídias sociais estão disponíveis a partir de Janeiro de 2026.",
      },
      {
        subtitulo: "O carrossel de postagens não exibe thumbnails?",
        texto:
          "As thumbnails das postagens são carregadas diretamente dos servidores das plataformas (Instagram, Facebook, YouTube). Se uma thumbnail não carregar, é exibido o badge colorido do canal como fallback. Isso pode ocorrer por política de CORS da plataforma ou expiração do link de thumbnail — não afeta os dados de métricas.",
      },
      {
        subtitulo: "O Comparativo de campanha não mostra todas as campanhas?",
        texto:
          "Campanhas **ativas** aparecem mesmo sem tráfego no período. Campanhas **inativas** só aparecem no mês do carrossel se geraram métricas (visitas, registros, FTDs ou volume financeiro) naquele período; com o botão **Histórico** ativo, as inativas aparecem sempre. Sem UTM mapeada, a campanha pode listar zeros. Para verificar UTMs, use Marketing → Gestão de Links.",
      },
      {
        subtitulo: "Uma campanha inativa sumiu do dashboard?",
        texto:
          "No mês específico do carrossel, campanha inativa sem métricas naquele período não aparece. Ative **Histórico** para ver todas as campanhas (ativas e inativas), ou navegue até um mês em que ela tenha gerado resultados.",
      },
      {
        subtitulo: "O GGR do Overview de Mídias Sociais é diferente do GGR do Streamers?",
        texto:
          "Correto — os dois dashboards medem canais diferentes. O Streamers mede conversão via links de influencers (UTMs de lives). O Mídias Sociais mede conversão via campanhas de redes sociais (UTMs de posts e anúncios). Um mesmo jogador pode aparecer em ambos dependendo de qual canal originou o primeiro depósito.",
      },
    ],
  },
  dash_overview_influencer: {
    titulo: "Overview Influencer",
    blocos: [
      {
        subtitulo: "O filtro de influencer foi removido automaticamente?",
        texto:
          "Quando você navega para um mês onde o influencer selecionado não tem dados, o sistema remove o filtro automaticamente e exibe uma notificação amarela no topo da página. Isso acontece porque exibir uma página inteiramente vazia para um filtro inválido seria confuso. Selecione o influencer novamente no filtro e escolha um período em que ele tenha dados.",
      },
      {
        subtitulo: "Os KPIs mostram '—' para GGR ou FTDs mesmo com dados de lives?",
        texto:
          "Lives e métricas de conversão vêm de fontes diferentes. É possível ter lives registradas mas sem métricas de conversão (acessos, registros, FTDs) para o período — isso ocorre quando os links do influencer não estavam rastreados ou as UTMs não foram mapeadas corretamente. Verifique se os links de divulgação do influencer estão cadastrados em Marketing → Gestão de Links.",
      },
      {
        subtitulo: "O Investimento aparece como R$ 0,00?",
        texto:
          "O investimento exibido considera apenas pagamentos com status Pago. Pagamentos pendentes, em análise ou de meses anteriores ainda não confirmados não são incluídos. Verifique o status dos pagamentos do período no módulo financeiro correspondente.",
      },
      {
        subtitulo: "O Detalhamento Diário não exibe todos os dias do mês?",
        texto:
          "Para o mês atual, o detalhamento exibe apenas os dias até ontem — o dia atual é excluído por estar incompleto (os dados do dia só são fechados no final do dia). Para meses passados, todos os dias são exibidos. Este é o comportamento esperado.",
      },
      {
        subtitulo: "A Média de Views parece muito baixa ou '—' mesmo com lives realizadas?",
        texto:
          "A Média de Views é calculada como a média das médias de espectadores das lives com resultado registrado. Se as lives foram realizadas mas os resultados (duração, média de views) não foram preenchidos na agenda, a métrica aparece como '—'. Verifique se os resultados das lives estão cadastrados em Lives → Resultados.",
      },
    ],
  },
  dash_overview_afiliado: {
    titulo: "Overview Afiliado",
    blocos: [
      {
        subtitulo: "Por que os KPIs e o detalhamento estão vazios?",
        texto:
          "O layout do Overview Afiliado já está disponível; a carga de métricas será integrada em etapa seguinte. Até lá, a mensagem 'Sem dados para o filtro selecionado' é esperada.",
      },
      {
        subtitulo: "Não vejo Overview Afiliado no menu?",
        texto:
          "Libere a permissão de Ver em Gestão de Usuários → Permissões para o perfil desejado. Administradores veem a página automaticamente após o deploy.",
      },
    ],
  },
  dash_overview_prestador: {
    titulo: "Overview Prestador",
    blocos: [
      {
        subtitulo: "Não vejo Overview Prestador no menu?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de **Ver** para Overview Prestador e se a página está liberada na aba correspondente ao seu perfil (Gestores, Prestadores ou Operadora). Administradores têm acesso total.",
      },
      {
        subtitulo: "KPIs de presença ou absenteísmo vazios?",
        texto:
          "Métricas de escala e presença dependem de escala publicada e registros no Calendário. Verifique se o prestador ou time selecionado tem turnos no período e se justificativas pendentes não estão bloqueando o fechamento.",
      },
      {
        subtitulo: "A Presença parece baixa no meio do mês?",
        texto:
          "No mês corrente, **realizado**, Presença, Pontualidade e Controle de Presença fecham em **hoje**. As jornadas ainda não trabalhadas (dias futuros da escala publicada) não entram no denominador. O card de jornadas/dias **escalados** continua o mês publicado, alinhado à Escala Estúdio.",
      },
      {
        subtitulo: "A página demora ou mostra Carregando… na barra de filtros?",
        texto:
          "O resumo do mês selecionado aparece primeiro. O comparativo com o mês anterior e o Histórico seguem em segundo plano — o relógio na barra indica essa carga. Se a mensagem de erro persistir, use **Tentar de novo**. Se o problema continuar, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não vejo a aba KPIs de Mesa ou KPIs de OCR?",
        texto:
          "A segunda aba aparece conforme o time: **Game Presenter** e **Shuffler** → **KPIs de Mesa**; **Service Manager** → **KPIs de OCR**; **Shift Leader** → a aba não aparece. Com Ver = Próprios, o time vem do Organograma do seu cadastro.",
      },
      {
        subtitulo: "KPIs de Mesa sem números?",
        texto:
          "Os cards e tabelas aparecem mesmo sem registros (valores em 0). Confirme o mês no carrossel e se o filtro **Time** / **Staff** cobre o prestador certo. **Game Presenter:** rodadas e tempos vêm do Grafana (`gp_kpi_diario`) — o prestador precisa de **ID operacional** em Gestão de Staff. **Incidentes** (GP e Shuffler) usam a data da rodada, com o mesmo fechamento **D-1** das rodadas: o que foi registrado hoje só aparece amanhã nesta aba (na página Incidentes continua visível no dia). Sem linhas de detalhe diário: \"Sem dados para o período selecionado.\"",
      },
      {
        subtitulo: "KPIs de OCR sem números?",
        texto:
          "Confirme o mês (ou Histórico), o time **Service Manager** e o Staff (**Todo o time** = consolidado). **Sinais** usam os atendimentos resolvidos pelo SM; **Tickets** usam incidentes em que o SM é o **relator**. O mês corrente inclui até **hoje** (igual à aba Sinais em Incidentes). Se o SM não tiver ID TOS em Gestão de Staff, o vínculo do sinal pode falhar — cadastre o ID TOS. Sem linhas: \"Sem dados para o período selecionado.\"",
      },
    ],
  },
  dash_headcount: {
    titulo: "Headcount",
    blocos: [
      {
        subtitulo: "Não vejo Headcount no menu?",
        texto:
          "Confirme em Gestão de Usuários → Permissões se o perfil tem permissão de **Ver** para **Headcount**. Por padrão a página nasce bloqueada (Não) até liberação explícita. Administradores veem a página automaticamente.",
      },
      {
        subtitulo: "A tabela de vagas na aba Contratação está vazia?",
        texto:
          "A lista mostra apenas vagas com status efetivo **Aberta** ou **Em andamento**. Vagas concluídas ou canceladas entram só nos KPIs de fechadas. Confirme também a diretoria selecionada na barra de filtros.",
      },
      {
        subtitulo: "O HC do Histórico parece diferente do cadastro atual?",
        texto:
          "A evolução mensal é reconstruída pelas datas de início e desligamento dos prestadores. Não existe snapshot mensal auditável na base — use o número como tendência, não como fechamento contábil de headcount. No **Histórico**, a Overview mostra a tabela Mês a Mês dos últimos 13 meses; Contratação e Distratos agregam o mesmo intervalo.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        subtitulo: "Uma live não aparece no calendário?",
        texto:
          "Verifique se os filtros de status, plataforma, influencer ou operadora não estão ocultando a live. Com qualquer filtro ativo, apenas as lives que atendem a todos os critérios são exibidas. O botão Limpar filtros aparece automaticamente — use-o para ver a agenda completa.\n\nA Agenda carrega as lives da janela visível (mês, semana ou dia). Confirme que o carrossel está no período da data agendada.\n\nInfluencers e agências só visualizam as próprias lives. Se você tem esse perfil e não encontra uma live, ela pode ter sido cadastrada com outro influencer.",
      },
      {
        subtitulo: "Salvei uma Nova Live e o modal fechou, mas ela não aparece?",
        texto:
          "Se o modal fechou sem mensagem de erro, a live costuma ter sido gravada. Atualize a página e confira se o calendário está no mês/semana/dia da data escolhida. Se um filtro de operadora estiver ativo e o influencer não tiver vínculo ativo em Influencers → Operadoras, a live pode ficar oculta — use **Todas Operadoras** ou ajuste o vínculo.\n\nSe ainda não aparecer, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não consigo salvar uma nova live?",
        texto:
          "O campo de link é obrigatório. Verifique se o link da plataforma selecionada está preenchido. O link é pré-preenchido automaticamente com o perfil do influencer, mas atualiza ao trocar de plataforma — se a nova plataforma não tiver link cadastrado, o campo fica em branco e precisa ser preenchido manualmente.",
      },
      {
        subtitulo: "Apareceu um modal de 'Agendamento indisponível'?",
        texto:
          "O bloqueio vale para perfis **Influencer** e **Agência** — gestores e operadores não passam por esta verificação ao agendar.\n\n— **Influencer:** cadastro incompleto em Influencers ou Playbook pendente impedem o uso da Agenda. A própria página mostra o que falta e os atalhos para corrigir.\n— **Agência:** ao salvar uma Nova Live, o sistema verifica o cadastro e o Playbook do influencer selecionado. Use os botões **Ir para Influencers** ou **Ir para Playbook Influencers** no modal quando aparecerem.\n\nItens verificados: dados obrigatórios do cadastro e ciência nos três termos obrigatórios do Playbook (Dealers, Agendamento e Jogos).",
      },
      {
        subtitulo: "O calendário não carrega ou apareceu um aviso vermelho?",
        texto:
          "Use **Tentar de novo** no aviso. Confirme sua conexão e, se persistir, recarregue a página (Ctrl+Shift+R). Se o problema continuar, entre em contato com o suporte.\n\nInfluencers com cadastro ou Playbook pendente veem um painel de bloqueio em vez do calendário — conclua os pré-requisitos indicados antes de tentar de novo.",
      },
      {
        subtitulo: "Não consigo editar uma live?",
        texto:
          "Lives com status Realizada ou Não Realizada ficam em somente leitura para influencers, agências e operadores — o modal abre sem edição. Para alterar lives já validadas ou em datas passadas, é preciso perfil interno com permissão de **Editar** na Agenda (configurada em Gestão de Usuários). Se você precisa corrigir uma live validada, solicite a quem tem essa permissão.",
      },
      {
        subtitulo: "Não consigo agendar para hoje?",
        texto:
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — agendar para o mesmo dia não é permitido. Essa restrição não se aplica a Admin e Gestor, que podem criar e editar lives em qualquer data.",
      },
      {
        subtitulo: "A live foi salva mas não aparece para minha operadora?",
        texto:
          "Novas lives recebem a operadora do primeiro vínculo ativo do influencer. Se a live não aparece no seu escopo, verifique em Influencers → Operadoras se o vínculo correto está ativo e em primeiro lugar, ou peça a um Gestor/Admin para ajustar a live.",
      },
      {
        subtitulo: "Não consigo criar ou editar uma live em data passada?",
        texto:
          "Criar ou editar lives em datas e horários passados exige perfil interno com permissão de **Editar** na Agenda. Se o sistema bloqueou a operação, verifique se a data preenchida não está no passado e se o seu perfil tem essa permissão em Gestão de Usuários.",
      },
      {
        subtitulo: "O botão Nova Live não aparece?",
        texto:
          "O botão aparece apenas para perfis com permissão de criação. Se ele não aparecer mesmo estando logado, o seu perfil pode não ter essa permissão configurada. Entre em contato com o administrador da conta.",
      },
    ],
  },
  resultados: {
    titulo: "Resultados",
    blocos: [
      {
        subtitulo: "Uma live não aparece na lista?",
        texto:
          "A lista exibe apenas lives com status Agendada cujo horário passou há mais de 5 horas. Verifique:\n\n— A live pode ainda não ter atingido a janela de 5 horas desde o horário agendado.\n— Se os filtros de influencer ou operadora estiverem ativos, a live pode estar sendo ocultada.\n— Veja na Agenda se a live tem status diferente de Agendada — lives já validadas (Realizada ou Não Realizada) não aparecem aqui.",
      },
      {
        subtitulo: "A página está vazia mas sei que há lives pendentes?",
        texto:
          "Confirme se os filtros de influencer ou operadora não estão ocultando as lives. Se os filtros estiverem desativados, verifique se as lives em questão passaram da janela de 5 horas desde o horário agendado. Se as lives foram validadas por outro usuário enquanto a página estava aberta, recarregue para ver a lista atualizada.",
      },
      {
        subtitulo: "A operadora na validação não bate com o que esperava?",
        texto:
          "Em lives novas agendadas pela Agenda, a operadora pode ter sido definida automaticamente pelo primeiro vínculo ativo do influencer (Influencers → Operadoras). Na validação você pode ajustar a operadora — ela continua obrigatória e alimenta o Financeiro. Se o vínculo em Influencers estiver incorreto, corrija o cadastro antes de validar em massa.",
      },
      {
        subtitulo: "Não consigo salvar a validação?",
        texto:
          "Verifique:\n\n— O campo Operadora é obrigatório para qualquer status (Realizada ou Não Realizada).\n— Para lives Realizadas, a Duração deve ser preenchida — horas e minutos não podem ser ambos zero.\n— O Máximo de Views não pode ser menor que a Média de Views.",
      },
      {
        subtitulo: "O Horário Real de Início já vem preenchido. Devo alterar?",
        texto:
          "O campo é pré-preenchido com o horário agendado da live. Altere apenas se a live começou em horário diferente do agendado — isso garante que a duração registrada para o módulo Financeiro seja precisa.",
      },
      {
        subtitulo: "Por que a operadora é obrigatória mesmo para lives não realizadas?",
        texto:
          "A operadora registrada na validação é o vínculo que conecta a live ao ciclo de pagamentos no módulo Financeiro. Sem ela, o sistema não consegue associar a live ao ciclo correto — por isso é obrigatória independentemente do status.",
      },
      {
        subtitulo: "O botão Validar não aparece?",
        texto:
          "O botão aparece apenas para perfis com permissão de edição. Se ele não aparecer, o seu perfil pode não ter essa permissão configurada. Entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "Posso excluir uma live da lista de validação?",
        texto:
          "Na página de Resultados, o botão Excluir aparece apenas para lives ainda com status Agendada (as que aguardam validação), para perfis com permissão de exclusão configurada em Gestão de Usuários — com pop-up de confirmação antes de excluir. Lives já validadas (Realizada ou Não Realizada) não são excluídas nesta lista.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        subtitulo: "Nenhuma live aparece na lista?",
        texto:
          "Verifique o período selecionado — o padrão exibe a semana atual. Ative Histórico para ver o acumulado completo. Lives só aparecem no Feedback após serem validadas em Resultados — lives com status Agendada não aparecem aqui.",
      },
      {
        subtitulo: "Os KPIs do topo estão zerados?",
        texto:
          "Os KPIs consideram todas as lives do período independentemente do chip de status da lista. Se os KPIs estão zero, não há lives validadas no período selecionado. Tente ativar Histórico para confirmar se existem lives em outros períodos.",
      },
      {
        subtitulo: "Uma live específica não aparece?",
        texto:
          "Confirme se o filtro de status, influencer ou operadora não está excluindo essa live. O chip de status padrão é 'Todos', mas se estiver em Realizada ou Não Realizada, lives do outro tipo ficam ocultas.\n\nVerifique também se a live foi validada em Resultados. Se ainda está como Agendada, não aparecerá no Feedback.",
      },
      {
        subtitulo: "A Média de Views no KPI parece diferente do esperado?",
        texto:
          "O KPI é a média das médias individuais por live — não a soma de todas as views. Cada live contribui com sua própria média de audiência, e o indicador é a média dessas médias. Lives sem dado de views registrado são excluídas deste cálculo.",
      },
      {
        subtitulo: "Não consigo editar uma live?",
        texto:
          "O botão Editar aparece apenas para perfis com permissão de edição. Se não aparecer ou estiver ausente, o perfil não tem essa permissão. Entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "Não consigo excluir uma live?",
        texto:
          "O botão Excluir segue as mesmas regras de permissão que o Editar e abre o pop-up padrão de confirmação. Lives fora do seu escopo não exibem ações.",
      },
      {
        subtitulo: "A operadora não aparece nas opções ao editar?",
        texto:
          "O seletor de operadora exibe apenas as operadoras dentro do seu escopo de acesso. Se a operadora esperada não aparece, pode não estar atribuída ao seu perfil. Verifique com o administrador da conta.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        subtitulo: "Nenhum influencer aparece na lista?",
        texto:
          "Verifique se os filtros de status, plataforma, operadora, cachê ou busca estão limitando a lista. O botão Limpar filtros aparece automaticamente quando há filtros ativos. Se a lista continuar vazia, pode ser que nenhum influencer tenha sido cadastrado ou que o escopo do seu perfil não inclua influencers ativos.",
      },
      {
        subtitulo: "Um afiliado do Network aparece em Influencers?",
        texto:
          "Não deve. A página Influencers lista apenas o perfil Influencer. Cadastros vindos do Network (página Afiliados) ficam em **Afiliados**. Se ainda vir um afiliado em Influencers, recarregue a página após a atualização da plataforma; se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não consigo alterar o status ou o cachê de um influencer?",
        texto:
          "Alterações de status e cachê por hora são restritas a Admin e Gestor. Para outros perfis, o badge de status no card é somente leitura e o campo de cachê fica bloqueado no formulário de edição. Se você é Gestor e ainda não consegue alterar, verifique com o administrador se sua permissão de edição está configurada corretamente.",
      },
      {
        subtitulo: "Um influencer aparece como 'Perfil Incompleto'?",
        texto:
          "O badge e o quadro de Perfil Incompleto aparecem para influencers ativos com dados obrigatórios faltando. Clique no nome no quadro de Perfil Incompleto no topo da página para abrir diretamente o formulário de edição, ou use o botão Editar no card da lista.",
      },
      {
        subtitulo: "Não consigo salvar o perfil?",
        texto:
          "Verifique:\n\n— Na aba Canais: cada plataforma selecionada exige que o link correspondente esteja preenchido.\n— Na aba Operadoras: cada operadora marcada como ativa exige o ID do influencer naquela operadora.\n\nO erro pode estar em uma aba diferente da que você está visualizando no momento do aviso.",
      },
      {
        subtitulo: "A aba Histórico não aparece no formulário de edição?",
        texto:
          "A aba Histórico está disponível apenas no modal de Visualização (botão Ver). O formulário de edição tem quatro abas — Cadastral, Canais, Financeiro e Operadoras — e não inclui a aba Histórico.",
      },
      {
        subtitulo: "Os dados sensíveis somem sozinhos?",
        texto:
          "No modo de visualização, CPF, Chave PIX e dados bancários ocultam-se automaticamente após 10 segundos de serem revelados. Clique no ícone de olho para revelar novamente. No modo de edição, os dados ficam visíveis durante toda a sessão.",
      },
      {
        subtitulo: "O filtro de operadora não aparece?",
        texto:
          "O filtro de operadora aparece apenas para perfis com acesso a múltiplas operadoras. Operadores com escopo restrito a uma única operadora não veem esse filtro — a lista já está filtrada automaticamente pelo escopo do perfil.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        subtitulo: "Nenhum prospecto aparece na lista?",
        texto:
          "Na vista padrão, prospectos com status Fechado não são exibidos na lista. Para visualizá-los, clique no card **Fechado** do Funil de Prospecção. Verifique também se algum chip de plataforma está ativo na barra de filtros. Os sliders de cachê e views podem estar reduzindo o escopo da busca.",
      },
      {
        subtitulo: "Não consigo fechar a parceria — aparece uma mensagem de erro?",
        texto:
          "Para marcar como Fechado, todos estes campos são obrigatórios:\n\n— Nome artístico e e-mail\n— Cachê negociado maior que zero\n— Operadora (aba Contato)\n— Pelo menos uma plataforma com link e métrica preenchidos — views ou seguidores, conforme a plataforma (aba Canais)\n\nA mensagem de erro indica qual campo está faltando. Acesse a aba correspondente, preencha o dado e tente novamente.",
      },
      {
        subtitulo: "O botão ficou em 'Criando usuário...' por muito tempo?",
        texto:
          "O fechamento envolve criação do usuário, vínculo com a operadora e configuração de escopo — pode levar alguns segundos em conexões lentas. Não feche o modal durante o processo. Se ocorrer uma falha, uma mensagem de erro aparecerá no formulário — anote o erro e entre em contato com a equipe técnica.",
      },
      {
        subtitulo: "Não vejo o botão Editar em um prospecto?",
        texto:
          "O botão Editar aparece apenas quando o perfil tem permissão de edição. Em alguns perfis, só quem criou o prospecto pode editá-lo. Se nenhuma dessas condições se aplica e o botão não aparece, entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "Um prospecto fechado aparece aqui mas não em Influencers?",
        texto:
          "Isso pode indicar que o processo de criação de usuário não foi concluído — o e-mail pode já estar em uso ou ter ocorrido um erro durante o fechamento. Verifique se o influencer foi criado na Gestão de Usuários. Se não foi, edite o prospecto, corrija os dados necessários e tente marcar como Fechado novamente.",
      },
      {
        subtitulo: "Posso editar um prospecto já Fechado?",
        texto:
          "Sim — é possível editar dados de contato, canais e adicionar anotações mesmo após o fechamento. Alterar o status de Fechado para outro não desfaz a criação do usuário — o influencer continua ativo na plataforma.",
      },
      {
        subtitulo: "As views do Scout diferem dos dados nos dashboards?",
        texto:
          "As views/seguidores cadastrados no Scout são dados de prospecção inseridos manualmente durante a negociação. Os números nos dashboards de Streamers e Overview Influencer vêm dos dados reais das lives realizadas. São fontes diferentes — diferenças são esperadas e não indicam inconsistência.",
      },
    ],
  },
  gestao_dealers: {
    titulo: "Gestão de Dealers",
    blocos: [
      {
        subtitulo: "Um dealer não aparece na listagem?",
        texto:
          "A página lista apenas Game Presenters (dealers) com prestador **ativo** ou **indisponível** no time Game Presenter. Se o colaborador existe em RH mas não aparece aqui, confira o organograma em **Gestão de Prestadores** e o **estúdio** em **Gestão de Staff** — o card espelha o que está no Staff. Não use esta página para cadastrar dealer.\n\nVerifique também filtros ativos — turno, gênero, jogo, estúdio ou busca por nome/nickname. Perfil Operador só vê dealers dos estúdios ligados à sua operadora (ex.: Blaze vê GPs da Blaze e do Sports Club).",
      },
      {
        subtitulo: "O card mostra a operadora em vez do estúdio?",
        texto:
          "No catálogo, a tag visível é só de **estúdio** (o mesmo configurado em Gestão de Staff). Não há tag de operadora no card. Se o estúdio estiver errado, corrija o campo Estúdio no Staff e salve — o sync atualiza o elenco de Dealers.",
      },
      {
        subtitulo: "O botão Solicitar não aparece no card?",
        texto:
          "O botão Solicitar só é exibido para o perfil Operador e apenas quando a operadora ativa está definida no escopo do usuário. Se o botão não aparece, verifique:\n\n— Se o usuário tem o perfil Operador configurado na Gestão de Usuários.\n— Se o escopo de operadora está atribuído corretamente ao usuário.\n— Se o **filtro de estúdio** na barra está em um dos estúdios do seu escopo — com mais de um estúdio (ex.: Blaze e Sports Club), selecione o desejado ou **Todos Estúdios**.",
      },
      {
        subtitulo: "O botão Histórico não aparece?",
        texto:
          "O botão Histórico requer permissão de visualização na Central de Notificações (configurada em Gestão de Usuários → Permissões). Verifique se a permissão de visualização para a página 'Central de Notificações' está ativa no perfil do usuário.\n\nPara o perfil Operador, o Histórico também exige que a operadora ativa esteja definida no escopo — sem ela, o botão não é renderizado.",
      },
      {
        subtitulo: "Não encontro botão para criar ou editar dealer?",
        texto:
          "Comportamento esperado: **Gestão de Dealers** é catálogo e canal de solicitações — não há CTA de cadastro nem formulário de edição nesta página. Cadastre o prestador e defina o time **Game Presenter** em **Gestão de Prestadores**; complete perfil, estúdio e skills em **Gestão de Staff**. Quando o sync estiver correto, o card aparecerá aqui com ação **Ver** (somente leitura).",
      },
      {
        subtitulo: "O histórico de solicitações do dealer está vazio?",
        texto:
          "O modal de Histórico exibe as solicitações já registradas para aquele dealer. Se estiver vazio, significa que nenhuma solicitação foi criada para esse dealer ainda — isso é comportamento esperado para dealers recém-cadastrados ou sem interação da operadora.\n\nPara o perfil Operador, o Histórico é filtrado pela operadora do escopo — solicitações de outras operadoras para o mesmo dealer não são exibidas.",
      },
    ],
  },
  central_notificacoes: {
    titulo: "Central de Notificações",
    blocos: [
      {
        subtitulo: "A listagem está vazia mas sei que há solicitações em aberto?",
        texto:
          "Verifique o período selecionado na barra de navegação. O filtro de período afeta as solicitações resolvidas exibidas, mas solicitações abertas (pendente ou em andamento) aparecem independentemente do mês selecionado — elas sempre são buscadas sem corte de data.\n\nSe os filtros de operadora estiverem ativos, tente selecionar **Todas Operadoras** no filtro para confirmar se os dados existem em outro escopo.\n\nPara perfis Operador, apenas solicitações da operadora do escopo aparecem — isso é comportamento esperado.",
      },
      {
        subtitulo: "O badge de contagem na aba não reflete o número correto?",
        texto:
          "O badge exibe apenas solicitações abertas (pendente ou em andamento) que aguardam resposta do estúdio — ou seja, a bola está com o time Spin. Solicitações em andamento mas aguardando resposta da operadora não são contabilizadas no badge.\n\nSe o número parece desatualizado, recarregue a página — a contagem é calculada no momento do carregamento dos dados e não atualiza em tempo real nessa visualização.",
      },
      {
        subtitulo: "Não consigo responder na thread?",
        texto:
          "O campo de texto e o botão de envio só aparecem quando:\n\n— A solicitação está com status diferente de 'resolvido' ou 'cancelado'.\n— O perfil tem permissão de edição ativa na Central de Notificações (Gestão de Usuários → Permissões → Editar).\n\nSe a thread abre em modo somente leitura com a mensagem 'Sem permissão para responder nesta página', verifique a configuração de permissão na Gestão de Usuários.",
      },
      {
        subtitulo: "A campanha não aparece para o Operador?",
        texto:
          "As campanhas exibidas para operadores são as cadastradas em **Roteiro de Mesa**, filtradas pelo estúdio e pela operadora do escopo e pelo período selecionado. Se uma campanha não aparece:\n\n— Verifique se a campanha foi cadastrada para o estúdio correto no módulo Roteiro de Mesa.\n— Confirme que as datas de início e fim da campanha estão dentro do período selecionado na Central.\n— Ative o Histórico para ver campanhas fora do mês atual.\n— Verifique se o filtro de operadora na barra superior corresponde à operadora vinculada à campanha (solicitações continuam por operadora).",
      },
      {
        subtitulo: "O botão 'Marcar como resolvido' não aparece na thread?",
        texto:
          "O botão de resolução só é exibido para perfis Staff (admin, gestor ou executivo) com permissão de edição ativa. Perfis Operador não têm acesso a essa ação — operadores podem enviar mensagens mas não podem encerrar solicitações.\n\nSe você é Gestor e o botão não aparece, verifique se a permissão de Editar está ativa para a Central de Notificações na Gestão de Usuários.",
      },
      {
        subtitulo: "O banner de pendências na Gestão de Dealers não aparece?",
        texto:
          "O banner amarelo de pendências só é exibido para o perfil Operador quando há solicitações em aberto aguardando resposta da operadora. Verifique:\n\n— Se o usuário tem o perfil Operador configurado.\n— Se há solicitações abertas aguardando resposta da operadora — o banner não aparece quando todas estão aguardando o estúdio.\n— O banner é atualizado em tempo real; se a conexão oscilar, ele pode não atualizar sozinho — recarregue a página para forçar a leitura.",
      },
      {
        subtitulo: "As solicitações concluídas não aparecem na seção de histórico?",
        texto:
          "A seção 'Solicitações concluídas' exibe itens com status 'resolvido' cuja data de resolução está dentro do período selecionado. Se o período estiver no mês atual e as resoluções ocorreram em meses anteriores, os itens não aparecerão — ative Histórico para ver o acumulado completo.\n\nA seção só é exibida para o perfil Operador. Para Gestores, os itens resolvidos aparecem dentro das próprias abas do inbox, mesclados com os abertos.",
      },
    ],
  },
  rh_dados_cadastro: {
    titulo: "Dados de Cadastro",
    blocos: [
      {
        subtitulo: "Não encontro meu cadastro ou a página abre vazia?",
        texto:
          "Com **Ver/Editar Próprios**, a página abre direto no registro vinculado ao e-mail de login (pessoal ou E-mail Spin) — não há filtro Staff. Se nada carregar, confira se o prestador está ativo em Gestão de Prestadores e se o e-mail do login coincide com o cadastro.\n\nCom **Ver Sim**, use o filtro **Staff** (um prestador por vez) ou o botão **Meu Cadastro** para voltar ao seu registro.",
      },
      {
        subtitulo: "Não consigo salvar alterações?",
        texto:
          "— **Editar Próprios:** salvar, enviar documentos e excluir arquivos só no **seu** cadastro; ao consultar outro prestador com Ver Sim, a tela fica somente leitura.\n— **Editar Sim:** exige permissão de Editar em Dados de Cadastro em Gestão de Usuários.\n— Prestador com vínculo encerrado: abas Formação e Competências e Experiência Profissional ficam em leitura.\n\nA aba **Histórico de trabalho** é sempre somente leitura — contratação e organograma são alterados em Gestão de Prestadores.",
      },
      {
        subtitulo: "O banner de revisão cadastral não aparece ou não some?",
        texto:
          "A revisão obrigatória vale apenas no **seu** cadastro — não aparece ao consultar terceiros. **Primeiro acesso:** após o cadastro em Gestão de Prestadores, ainda é preciso concluir a primeira revisão aqui. Depois, o ciclo é de 6 meses desde a última revisão concluída. Salvar dados incompletos ou enviar só parte dos documentos **não** remove o banner nem libera o menu — o bloqueio só encerra quando todas as pendências do banner forem resolvidas (ou ao usar **Confirmar sem alterações** com cadastro já completo). Veja a lista de itens faltantes no banner.",
      },
      {
        subtitulo: "Aparece um aviso ao tentar acessar outras páginas?",
        texto:
          "Com revisão cadastral pendente, a plataforma exibe um aviso ao tentar ir para outra área pelo menu ou atalhos. Você permanece na página atual até concluir a verificação em **Dados de Cadastro** (atualizar dados/documentos ou **Confirmar sem alterações**). Enquanto isso, **Configurações**, **Ajuda** e **Central de Denúncias** continuam acessíveis.",
      },
      {
        subtitulo: "Falha ao enviar documento ou arquivo?",
        texto:
          "Limite de **15 MB** por arquivo na aba Documentos e nos anexos de formação/portfólio (exceto vídeo/áudio, que usam apenas link externo). Formatos aceitos conforme o tipo de item. Se o envio falhar, tente arquivo menor ou outro formato; mensagens ao usuário são genéricas — detalhes técnicos ficam no console para suporte.",
      },
      {
        subtitulo: "Não apareço na Gestão de Dealers / Figurinos?",
        texto:
          "Essas páginas dependem do vínculo do prestador em Gestão de Prestadores (ex.: Game Presenter para elenco de dealers). Dados de Cadastro não substitui o cadastro operacional em RH — complete o que falta em Gestão de Prestadores ou fale com o time de RH.",
      },
    ],
  },
  rh_figurinos: {
    titulo: "Figurinos",
    blocos: [
      {
        subtitulo: "O leitor USB não preenche o campo ao bipear?",
        texto:
          "Confirme que o modal **Bipar código** está aberto e que o cursor está no campo de leitura (ele recebe foco automaticamente). Leitores em modo teclado enviam os dígitos como se fossem digitados no teclado, seguidos de Enter — não precisam de driver de câmera. Se nada aparecer, teste o leitor em um editor de texto; se funcionar lá, recarregue a página e abra **Bipar código** de novo. Como alternativa, digite o código de barras ou o código da peça (ex.: CAL-000001) manualmente e clique em Buscar.",
      },
      {
        subtitulo: "A câmera não abre ao clicar em Usar câmera (opcional)?",
        texto:
          "A câmera é opcional — leitores USB em modo teclado não dependem dela. Se expandir **Usar câmera (opcional)**, o navegador precisa de permissão para acessar a câmera. Verifique se a permissão foi concedida na barra do navegador. Se negada, use o leitor USB ou digite o código manualmente.",
      },
      {
        subtitulo: "O código bipado retornou 'não reconhecido'?",
        texto:
          "O código pode não estar cadastrado no sistema ou pode ter sido lido incorretamente. Tente digitar o código manualmente no campo abaixo do leitor. O código segue o formato PREFIX-000001, com prefixo de três letras da categoria (ex.: CAM-000003 para Camisa). Se o código foi cadastrado recentemente, aguarde alguns segundos e tente novamente.",
      },
      {
        subtitulo: "O prestador não aparece na lista de retirada?",
        texto:
          "A lista de prestadores vem da página Gestão de Prestadores e exibe apenas funcionários com status Ativo ou Indisponível. Se o prestador não aparece, verifique se ele está cadastrado e ativo na Gestão de Prestadores. Funcionários com status Inativo ou Desligado não são exibidos.",
      },
      {
        subtitulo: "Os botões Retirada e Manutenção não aparecem na tabela?",
        texto:
          "O botão **Retirada** exige permissão de **Editar** = Sim. O botão **Manutenção** (e, na aba Manutenção, **Disponibilizar** e **Descartar**) exige permissão de **Criar** = Sim. Se você não vê um deles, solicite ao administrador a liberação correspondente em Gestão de Usuários → Permissões → Figurinos.",
      },
      {
        subtitulo: "A peça está na aba errada ou não aparece?",
        texto:
          "Verifique se os filtros de estúdio, categoria, tamanho, cor ou gênero estão ativos — eles restringem o que aparece em todas as abas. Use as opções agregadoras (**Todos Estúdios**, **Todas Categorias**, etc.) e limpe a busca para ver o inventário completo.\n\nPeças com retirada ativa do tipo Emprestada ficam na aba Emprestada; as do tipo Fixo ficam na aba Fixo. Manutenção e Descartada seguem o status da peça.\n\nO inventário carrega **todas** as peças (sem teto oculto). Com permissão de **Ver = Próprios**, só aparecem peças com retirada ativa no seu cadastro.",
      },
      {
        subtitulo: "Ao bipear, a peça aparece como código não reconhecido?",
        texto:
          "Confirme que a peça está cadastrada e que os filtros da página não atrapalham a conferência na tabela. O leitor pode omitir zeros à esquerda do código de barras — a busca tenta completar automaticamente para 12 dígitos. Se ainda falhar, digite o **código da peça** (ex.: CAM-000001) no campo e clique em Buscar.",
      },
      {
        subtitulo: "A etiqueta PDF não baixou depois de cadastrar a peça?",
        texto:
          "O download da etiqueta é opcional — você pode fechar o modal e baixar depois pelo botão Baixar etiqueta nos detalhes da peça. Para acessar os detalhes, clique no código da peça (ex.: CAM-000003) na tabela. Se o download falhar mesmo tentando, verifique se o bloqueador de pop-ups do navegador está impedindo o download.",
      },
      {
        subtitulo: "Não consigo registrar uma movimentação?",
        texto:
          "Confirme permissão de edição para Figurinos em Gestão de Usuários. Alguns status de peça bloqueiam certas ações (por exemplo, descarte definitivo). Verifique campos obrigatórios do formulário. A interface exibe mensagens genéricas em português — detalhes técnicos ficam no console do navegador para suporte.",
      },
    ],
  },
  roteiro_mesa: {
    titulo: "Roteiro de Mesa",
    blocos: [
      {
        subtitulo: "Não vejo nenhum bloco de conteúdo?",
        texto:
          "Perfis com múltiplos estúdios devem selecionar um estúdio na barra de filtros (ou **Todos Estúdios** para ver tudo no escopo). Operadores com escopo fixo já entram com o estúdio da operadora.\n\nSe o estúdio já está selecionado e os blocos continuam vazios, confirme permissão de visualização e se há campanhas ou sugestões cadastradas para aquele estúdio.",
      },
      {
        subtitulo: "A campanha não aparece na Central de Notificações?",
        texto:
          "Confirme estúdio/operadora do escopo, datas de início/fim e permissões. A Central filtra por operadora; campanhas fora do período podem exigir modo Histórico na Central.\n\nA campanha precisa estar ativa no intervalo selecionado na Central e vinculada ao estúdio/operadora do escopo do operador.",
      },
      {
        subtitulo: "Filtros de jogo ou tipo escondem itens?",
        texto:
          "Os filtros Jogo e Tipo aplicam-se às sugestões dos blocos Abertura, Durante o jogo e Fechamento — não ao bloco Campanhas. Volte Jogo e Tipo para 'Todos' para ver o conjunto completo de roteiros do bloco.",
      },
      {
        subtitulo: "Erro ao salvar bloco ou campanha?",
        texto:
          "Verifique campos obrigatórios (título, texto, estúdio, datas em campanhas) e conexão. A interface exibe uma mensagem genérica em português — os detalhes técnicos ficam registrados para o suporte.\n\nSe o problema persistir, entre em contato com o suporte técnico.",
      },
      {
        subtitulo: "Não consigo editar uma sugestão de roteiro?",
        texto:
          "A edição exige permissão de Editar na página Roteiro de Mesa (Gestão de Usuários → Permissões). Sem ela, o ícone de lápis não aparece. Com a permissão, o modal permite alterar tipo, jogos e texto; o estúdio do registro permanece o mesmo.",
      },
      {
        subtitulo: "Não consigo excluir uma sugestão ou campanha?",
        texto:
          "A exclusão exige permissão de Excluir na página Roteiro de Mesa. Sem ela, os ícones de exclusão não aparecem. Ao clicar, o pop-up padrão pede confirmação. Confirme também que o estúdio do item está dentro do escopo do usuário.",
      },
    ],
  },
  incidentes: {
    titulo: "Incidentes",
    blocos: [
      {
        subtitulo: "A lista de incidentes está vazia?",
        texto:
          "Confirme que está na aba **Tickets**, o mês selecionado no carrossel (ou **Histórico**) e os filtros de Estúdio, Time, Staff, Incidente, Tipo e Relator — cada um restringe a lista e os KPIs. Se aparecer mensagem de erro, use **Tentar de novo**. Se você tem permissão de Ver = Próprios, a página mostra apenas os incidentes em que você está envolvido como prestador.",
      },
      {
        subtitulo: "A aba Sinais está vazia?",
        texto:
          "Confirme o mês (ou **Histórico**), o filtro de **Estúdio** e, se visíveis, **Staff** (SM) e **Relator**. Esta aba não tem busca por ID ou mesa. Os totais vêm da sincronização com o Grafana. Se aparecer mensagem de erro, use **Tentar de novo**. Se o período deveria ter dados e a lista continua vazia, entre em contato com o suporte."
      },
      {
        subtitulo: "O botão Novo Incidente não aparece?",
        texto:
          "O botão exige permissão de **Editar** = Sim na página Incidentes (Gestão de Usuários → Permissões). Sem ela, a página fica em modo consulta. Solicite a liberação ao administrador se precisar registrar incidentes.",
      },
      {
        subtitulo: "O ícone Editar não aparece na tabela?",
        texto:
          "Assim como o **Novo Incidente**, o lápis na coluna Ações só aparece com **Editar** = Sim. Com Editar = Próprios ou Não, a tabela permanece só com a ação de visualizar.",
      },
      {
        subtitulo: "Posso alterar o protocolo ao editar?",
        texto:
          "O protocolo não é digitado à mão — permanece somente leitura. Se você mudar a categoria **Incidente** para outra família (Caso ↔ Erro ↔ Oculto), ao salvar o sistema gera um novo protocolo na série correspondente (ex.: de `CASO-` para `ERRO-`). Trocar só o **Tipo** (ex.: Game before time → Ball out) ou mudar entre categorias da mesma família Erro (Erro, Não Avisado, Avisado/Resolvido, Avisado/Não Resolvido) mantém o mesmo protocolo.",
      },
      {
        subtitulo: "O campo Tipo não tem opções ou está vazio?",
        texto:
          "Para Game Presenter, o tipo de incidente depende da mesa selecionada — escolha a mesa primeiro para carregar a lista de tipos daquele jogo. Para Shuffler, a lista de tipos é fixa e não depende da mesa.",
      },
      {
        subtitulo: "Não aparecem scripts na Descrição?",
        texto:
          "Os scripts só aparecem depois de escolher um **Tipo** que tenha template cadastrado. Se o tipo não tiver script, escreva a descrição livremente. Com mais de um script, os chips mostram a variante (por exemplo Rescan ou Cancelou) — o texto continua editável após aplicar.",
      },
      {
        subtitulo: "A mesa que eu procuro não aparece na lista do formulário?",
        texto:
          "Mesas de Roleta não aparecem na lista quando o time selecionado é Shuffler, pois esse time não atua nesse jogo. Confirme também se a mesa está cadastrada e ativa em Gestão de Mesas.",
      },
      {
        subtitulo: "Não encontro o prestador na lista do formulário?",
        texto:
          "A lista de prestadores é filtrada pelo time selecionado (Game Presenter ou Shuffler) e inclui apenas funcionários ativos ou indisponíveis vinculados a esse time (ou papéis de apoio como Service Manager, Shift Leader, Performance Coach e Academy). Verifique o cadastro em Gestão de Prestadores se o nome não aparece.",
      },
      {
        subtitulo: "As setas ou a tecla Tab não funcionam como esperado no formulário?",
        texto:
          "Nos campos pesquisáveis, clique no campo e comece a digitar. Use **↑/↓** para destacar um resultado, **Home/End** para ir ao início/fim e **Enter** para selecionar. A tecla **Tab** avança para o próximo controle do formulário sem percorrer cada opção — o campo em foco fica com um contorno colorido. **Escape não fecha o modal**, evitando a perda acidental do preenchimento. Se o navegador mantiver um comportamento antigo, atualize a página e tente novamente.",
      },
      {
        subtitulo: "O anexo não foi enviado ao salvar o incidente?",
        texto:
          "Cada arquivo tem limite de 50 MB. Se o arquivo exceder esse tamanho, uma mensagem indica qual anexo excedeu o limite — reduza o tamanho do arquivo ou envie um formato mais leve e tente novamente.",
      },
      {
        subtitulo: "Não vejo as colunas Prestador, Time ou Relator na tabela?",
        texto:
          "Essas colunas ficam ocultas quando sua permissão de Ver é **Próprios** — nesse modo, você já sabe que os registros são seus. Se você deveria ver todos os incidentes, solicite ao administrador a permissão Ver = Sim em Gestão de Usuários → Permissões → Incidentes.",
      },
    ],
  },
  academy_performance_hub: {
    titulo: "Performance Hub",
    blocos: [
      {
        subtitulo: "Não vejo Performance Hub no menu?",
        texto:
          "Verifique em **Gestão de Usuários → Permissões** se o perfil tem permissão de **Ver** diferente de **Não**. Administradores veem a página automaticamente; demais perfis começam bloqueados até liberação explícita.\n\nConfirme também se fez login novamente ou atualizou a sessão após alterar permissões.",
      },
      {
        subtitulo: "Não aparecem as abas Gerenciamento ou Configuração?",
        texto:
          "**Gerenciamento** e **Configuração** exigem permissão de **Criar = Sim**. Com apenas **Ver** ou **Editar**, só a aba Avaliações fica disponível — comportamento esperado.",
      },
      {
        subtitulo: "Sou prestador e a lista está vazia?",
        texto:
          "Com **Ver = Próprios**, só entram avaliações publicadas (**Aguardando**, **Feedback** ou **Aprovado**) do **seu** cadastro — o filtro de Time some e a lista não depende do nome do perfil coincidir letra a letra com o avaliado: a plataforma usa o prestador ligado ao e-mail de login (e-mail pessoal ou E-mail Spin) e o `staff` da avaliação.\n\nSe a lista continuar vazia: confira o mês/Histórico; se o login não estiver vinculado a um prestador em Gestão de Prestadores, ou o e-mail não bater com o cadastro, peça ajuste ao RH. Rascunhos não aparecem nesta aba.",
      },
      {
        subtitulo: "Alguns prestadores não aparecem para avaliar?",
        texto:
          "A lista inclui só prestadores **ativos** ou **indisponíveis** do time **Game Presenter** ou **Shuffler** no Organograma (Gestão de Prestadores). Encerrados não entram.\n\nNa **Agenda de Avaliações**, quem ainda não chegou na data de go-live / início no mês selecionado fica de fora até essa competência — use o carrossel para o mês em que a pessoa já está no estúdio.\n\nSe o colaborador aparece em **Gestão de Staff** no time certo e mesmo assim falta no Performance Hub, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não encontro o botão Analisar?",
        texto:
          "Com **Ver = Próprios**, o botão **Analisar** aparece só em status **Aguardando**. Em **Feedback** e **Aprovado** ficam **Ver** e **Histórico** (nesta ordem).\n\nCom **Ver = Sim**, em **Aguardando**, **Feedback** e **Aprovado** ficam **Ver** e **Histórico** na aba Avaliações; **Aplicar Feedback** continua só na aba **Feedback**.\n\nSe **Solicitar Feedback** ou **Aprovar** não gravar, confira se o login está vinculado ao prestador avaliado (e-mail / E-mail Spin) e se a atualização de permissões do Performance Hub foi aplicada no banco. A mensagem de erro no pop-up indica falha de gravação.",
      },
      {
        subtitulo: "Erro ao enviar o vídeo da avaliação?",
        texto:
          "O limite da página é **500 MB** por arquivo. Um vídeo de ~126 MB ou **300.000 KB** está **dentro** desse teto.\n\nSe a mensagem disser que o armazenamento recusou o tamanho, o envio chegou ao servidor e foi barrado lá — não é a internet. Grave em **720p** ou envie um trecho mais curto; se o arquivo já estiver abaixo de 500 MB, entre em contato com o suporte.\n\nArquivos grandes sobem em partes (progresso **Enviando X%…**). Mantenha a aba aberta até 100%. Se aparecer falha de conexão, tente de novo.\n\nSe a mensagem falar de permissão, confirme em **Gestão de Usuários → Permissões** se o perfil tem permissão de **Criar = Sim** em Performance Hub (Gerenciamento). Use **MP4** ou **MOV (H.264)** — WebM não funciona no iPhone.",
      },
      {
        subtitulo: "Toque em Assistir e o vídeo não abre no iPhone?",
        texto:
          "No **Safari** (iPhone/iPad), **Assistir** abre o vídeo no **player nativo** do sistema (tela cheia). Use **Voltar** no Safari para retornar à plataforma.\n\nAguarde alguns segundos em vídeos grandes (4G pode demorar). Se nada acontecer, atualize a página e tente de novo em Wi‑Fi.\n\nErro de formato ou reprodução: o arquivo pode estar em **WebM** (incompatível com iPhone) — peça ao coach um **MP4 (H.264)**. Se o botão ficar em **Abrindo…**, confira se o login ainda está ativo.",
      },
      {
        subtitulo: "A coluna Vídeo mostra «Vídeo removido»?",
        texto:
          "Comportamento esperado: o vídeo é apagado **90 dias após a avaliação ser concluída**, porque serve ao ciclo de avaliação e feedback. Notas, comentários e o nome do arquivo continuam disponíveis.\n\nSe precisar rever a gravação depois desse prazo, guarde uma cópia própria antes. Se o vídeo desapareceu **antes** de 90 dias da conclusão, entre em contato com o suporte.",
      },
    ],
  },
  academy_portal: {
    titulo: "Portal da Academy",
    blocos: [
      {
        subtitulo: "Não vejo Portal da Academy no menu?",
        texto:
          "Verifique em **Gestão de Usuários → Permissões** se o perfil tem permissão de **Ver** diferente de **Não**. Administradores veem a página automaticamente; demais perfis começam bloqueados até liberação explícita.",
      },
      {
        subtitulo: "Não aparece a aba Gerenciamento?",
        texto:
          "A aba **Gerenciamento** exige permissão de **Editar** (Sim ou Próprios) na página Portal da Academy. Com apenas **Ver**, só as abas Comunicados, Dicas e Manuais ficam disponíveis.",
      },
      {
        subtitulo: "Não foi possível carregar as postagens?",
        texto:
          "Atualize a página e tente novamente. Se a mensagem continuar no **Gerenciamento**, o suporte deve conferir se a atualização do fluxo de **Aprovação** do Portal da Academy foi aplicada no ambiente. A leitura das postagens continua disponível em modo de compatibilidade, mas publicar ou aprovar depende dessa atualização.",
      },
      {
        subtitulo: "Não vejo o botão Editar ou Arquivar em algumas postagens?",
        texto:
          "Com Editar = **Próprios**, **Editar** e **Arquivar** só aparecem nas postagens criadas por você. Com Editar = **Sim**, valem para todas. Postagens **Arquivadas** têm só o ícone **Ver** (abas Ver e Histórico no modal).",
      },
      {
        subtitulo: "Minha postagem ficou em Aprovação?",
        texto:
          "Com Editar = **Próprios**, Comunicados e Dicas vão para **Aprovação** até alguém com Editar = **Sim** clicar em **Aprovar** no Gerenciamento. Enquanto isso, a postagem não aparece nas abas de leitura.",
      },
      {
        subtitulo: "Não consigo criar Manual?",
        texto:
          "Manuais só podem ser criados com Editar = **Sim**. Com Editar = **Próprios**, a Nova Postagem oferece só Comunicados e Dicas.",
      },
      {
        subtitulo: "Qual Jogo? está vazio no modal?",
        texto:
          "A lista vem de **Gestão de Estúdios → Mesas** (coluna Jogo). Cadastre ou edite mesas com tipo de jogo preenchido; novos valores passam a aparecer automaticamente no Portal da Academy.",
      },
      {
        subtitulo: "Imagem ou vídeo do Manual não aparece ao visualizar?",
        texto:
          "No **Gerenciamento**, use o campo **Imagem/Vídeo** (não só Anexo) e publique a postagem. Ao abrir **Visualizar** na aba Manuais, a mídia deve aparecer abaixo da descrição. Se o arquivo não subir ao salvar, tente outro formato (JPG, PNG, MP4, WebM) ou entre em contato com o suporte.",
      },
      {
        subtitulo: "Não aparece o botão Ver ciência no manual?",
        texto:
          "O botão **Ver ciência** nos cards de Manuais só aparece com permissão de **Editar = Sim** no Portal da Academy **e** quando a postagem foi cadastrada com **Exige ciência do colaborador? = Sim**. Com apenas Ver, você registra a própria ciência no modal (**Lido e Ciente**), mas não consulta quem já aceitou.",
      },
    ],
  },
  playbook_influencers: {
    titulo: "Playbook Influencers",
    blocos: [
      {
        subtitulo: "O bloco de confirmação não aparece na aba?",
        texto:
          "O bloco de ciência só aparece para usuários com perfil de influencer ativo. Verifique se o seu usuário está cadastrado com o papel correto na plataforma. Se o perfil estiver correto e o bloco ainda não aparecer, recarregue a página. Caso persista, contate o administrador para verificar as permissões da sua conta.",
      },
      {
        subtitulo: "Cliquei em Confirmar Ciência mas nada aconteceu?",
        texto:
          "Verifique se a caixa de confirmação foi marcada antes de clicar no botão — o botão fica inativo enquanto a caixa não estiver selecionada. Se a caixa estava marcada e o botão não respondeu, pode ter ocorrido uma falha temporária de conexão. Aguarde alguns segundos e tente novamente. Se o erro persistir, recarregue a página.",
      },
      {
        subtitulo: "A barra de progresso não avança mesmo após confirmar?",
        texto:
          "Após confirmar, a barra deve atualizar imediatamente. Se não atualizar, recarregue a página para sincronizar o estado. Verifique também se a aba que você confirmou é realmente uma das três obrigatórias (Dealers, Agendamento e Jogos).",
      },
      {
        subtitulo: "O Painel de Auditoria não aparece para mim?",
        texto:
          "O painel de auditoria é visível apenas para gestores, administradores, executivos e demais papéis com permissão de editar. Influencers não visualizam o painel de outros — apenas o próprio bloco de confirmação. Se você tem papel de gestor e o painel não aparece, verifique se a sua permissão de Editar no Playbook Influencers está ativa em Gestão de Usuários.",
      },
      {
        subtitulo: "Um influencer aparece como pendente mas já me disse que confirmou?",
        texto:
          "A listagem do painel exibe apenas influencers ativos com perfil cadastrado. Se o influencer foi marcado como inativo após confirmar, pode não aparecer na contagem de confirmados. Verifique o status do influencer em Gestão de Influencers. Se o status estiver ativo e o nome ainda aparecer como pendente, a confirmação pode não ter sido gravada — peça ao influencer que repita o processo.",
      },
      {
        subtitulo: "A página não carrega ou aparece em branco?",
        texto:
          "Verifique a sua conexão com a internet. Se o problema persistir, recarregue a página ou faça logout e login novamente. Se o acesso ao Playbook Influencers sumir completamente do menu, o seu perfil pode ter tido a permissão de visualização removida — contate o administrador.",
      },
    ],
  },
  links_materiais: {
    titulo: "Links e Materiais",
    blocos: [
      {
        subtitulo: "O botão Emitir está desabilitado?",
        texto:
          "O botão fica inativo em três situações:\n— Você não tem permissão de Criar nesta página (um aviso amarelo aparece explicando o motivo).\n— O campo UTM está vazio — preencha antes de emitir.\n— Você tem Ver = Sim e não selecionou um influencer ou afiliado na lista da aba ativa.\n\nVerifique qual situação se aplica e siga a instrução correspondente. Se precisar de permissão de Criar, entre em contato com o administrador e peça que ative Criar em Links e Materiais na Gestão de Usuários.",
      },
      {
        subtitulo: "Apareceu um aviso de perfil incompleto ou Playbook pendente ao tentar emitir?",
        texto:
          "Na aba Influencers, o link só pode ser emitido quando o perfil do influencer está completo e o Playbook foi confirmado. O aviso indica qual requisito está faltando e oferece um botão para ir direto à página correspondente. Complete o requisito indicado e volte para emitir o link.",
      },
      {
        subtitulo: "O UTM foi preenchido automaticamente com um nome errado?",
        texto:
          "Na aba Influencers, o UTM vem do nome artístico do perfil. Na aba Afiliados, vem do nome (afiliado não usa nome artístico). Atualize o cadastro correspondente e volte para emitir, ou edite o campo UTM manualmente antes de emitir — use apenas letras sem acento, números e _.",
      },
      {
        subtitulo: "O link já foi emitido mas não aparece na tela?",
        texto:
          "Se você acabou de entrar na página e o link não carregou, aguarde o indicador de carregamento desaparecer. Se demorar mais de alguns segundos, recarregue a página. Se o link já foi emitido anteriormente por outro gestor, ele será carregado automaticamente ao selecionar a pessoa na lista da aba ativa.",
      },
      {
        subtitulo: "O QR Code não aparece após emitir?",
        texto:
          "As prévias dos QR Codes são geradas automaticamente após a emissão do link. Se o quadro de prévia mostrar apenas o placeholder por mais de 10 segundos, pode ter havido uma falha na geração da imagem. Recarregue a página — o link já estará salvo e as prévias serão geradas novamente.",
      },
      {
        subtitulo: "Não consigo baixar o PNG do QR Code?",
        texto:
          "Verifique se o seu navegador está bloqueando downloads automáticos. Na maioria dos navegadores, um ícone aparece na barra de endereço quando um download é bloqueado — clique nele e permita o download desta página. Se o botão mostrar Gerando… por mais de 15 segundos sem baixar, recarregue a página e tente novamente.",
      },
      {
        subtitulo: "Como gestor, não vejo ninguém na lista?",
        texto:
          "A lista exibe influencers ou afiliados conforme a aba ativa. Com Ver = Sim, a lista inclui todos os perfis daquele canal. Com Ver = Próprios (ex.: Agência), só entram os do seu escopo. Se a lista estiver vazia, confirme a permissão de Ver e o escopo em Gestão de Usuários.",
      },
      {
        subtitulo: "Só vejo uma das abas (Influencers ou Afiliados)?",
        texto:
          "Com Ver = Próprios, isso é esperado: Influencer ou Agência vê apenas Influencers; Afiliado vê apenas Afiliados. Com Ver = Sim, as duas abas aparecem.",
      },
    ],
  },
  spin_na_rede: {
    titulo: "Spin na Rede",
    blocos: [
      {
        subtitulo: "A página não carrega ou fica em branco?",
        texto:
          "Verifique sua conexão com a internet e recarregue a página. Se o problema persistir, faça logout e login novamente. Caso a Spin na Rede não apareça mais no menu, seu acesso à seção Conteúdo pode ter sido removido — contate o administrador.",
      },
      {
        subtitulo: "Não aparece nenhuma menção mesmo com o agregador ativo?",
        texto:
          "A ausência de itens pode significar que nenhuma publicação passou pelo filtro de relevância ainda, ou que o agregador RSS ainda não foi configurado para o ambiente de produção. A mensagem na tela indica exatamente isso. Se você espera ver publicações recentes e elas não aparecem, informe o time técnico para verificar o status do agregador.",
      },
      {
        subtitulo: "As miniaturas das matérias não aparecem?",
        texto:
          "Miniaturas são carregadas diretamente do site de origem e dependem da disponibilidade do servidor externo. Se a imagem não aparecer, o cartão continua funcional com título, texto e link — a miniatura é apenas visual e não afeta o acesso à matéria.",
      },
      {
        subtitulo: "O link 'Ir para a matéria' não abre nada?",
        texto:
          "Verifique se o seu navegador está bloqueando popups ou novas abas desta página. Procure um ícone na barra de endereço indicando popup bloqueado e permita para este site. Se o link continuar sem resposta, a matéria original pode ter sido removida ou o URL alterado.",
      },
    ],
  },
  informativos: {
    titulo: "Informativos",
    blocos: [
      {
        subtitulo: "Não vejo a aba Gerenciamento de Informativos?",
        texto:
          "A aba só aparece para usuários com permissão de Editar em Informativos na Gestão de Usuários. Peça ao administrador para liberar Ver e Editar (e Criar/Excluir, se necessário).",
      },
      {
        subtitulo: "Publiquei um informativo mas não aparece na Home?",
        texto:
          "Confirme que o status está Publicado e que o perfil do usuário foi marcado no campo Perfil ao criar o informativo. Para o perfil Operador, verifique também o campo Operadora: Todos envia a todas as operadoras; uma operadora específica só aparece na Home dos operadores daquela parceira. A integração na Home depende do perfil logado e, no caso de Operador, do escopo de operadora configurado na postagem.",
      },
      {
        subtitulo: "Não consigo aprovar um informativo?",
        texto:
          "O botão Aprovar só aparece em status Aprovação e para quem a regra dos perfis alvo autoriza: Investidor/Operador → Administrador ou Executivo; Agência/Influenciador/Afiliado → Administrador, Executivo ou Gestor de Aquisição; gestores de departamento → Administrador, Executivo ou Gestor de RH. Misturas usam a regra mais restritiva. Exceto Administrador, ninguém aprova a própria postagem.",
      },
    ],
  },
  rh_portal: {
    titulo: "Portal de RH",
    blocos: [
      {
        subtitulo: "O portal não carrega os comunicados ou aparece em branco?",
        texto:
          "Verifique a conexão com a internet e recarregue a página. Se o erro persistir, faça logout e login novamente. Se a mensagem de erro aparecer em português indicando que não foi possível carregar, aguarde alguns minutos e tente novamente — pode ser uma instabilidade temporária do banco de dados.",
      },
      {
        subtitulo: "Não consigo ver a aba Gerenciamento de Postagens?",
        texto:
          "A aba Gerenciamento de Postagens aparece apenas com permissão de Editar = Sim no Portal de RH. Editar = Próprios não libera essa aba. Se você precisa desse acesso, solicite ao administrador o ajuste em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "Não vejo algumas políticas na aba Políticas?",
        texto:
          "Com permissão de **Ver = Próprios**, a lista mostra só documentos cujo **Aplicável a** inclua **Todos os prestadores** ou a diretoria, gerência ou time do seu cadastro em Gestão de Prestadores. Se faltar vínculo no organograma, você pode não ver políticas direcionadas a times específicos. Perfis internos (não prestadores) devem usar **Ver = Sim**. Comunicados não usam esse filtro. **RH Talks** usam o mesmo filtro de Aplicável a que Políticas.",
      },
      {
        subtitulo: "Cliquei em 'Lido' mas o badge 'Novo' voltou?",
        texto:
          "O badge Novo desaparece após o clique quando a operação é registrada com sucesso. Se voltou após recarregar a página, pode ter ocorrido uma falha no registro. Tente clicar em Lido novamente. Se o problema persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Tentei publicar uma postagem mas deu erro?",
        texto:
          "Verifique se todos os campos obrigatórios (marcados com asterisco vermelho) estão preenchidos. Se todos estão preenchidos e o erro persiste, pode ser uma instabilidade temporária. Aguarde alguns segundos e tente novamente. Rascunhos são salvos mesmo que a publicação falhe — verifique na aba Gerenciamento se o rascunho foi salvo.",
      },
      {
        subtitulo: "Uma postagem que aprovar não aparece na lista de publicados?",
        texto:
          "Após aprovar, a página atualiza automaticamente. Se a postagem não aparecer nos publicados, desligue o **Histórico** (ativo por padrão) e confira o mês do carrossel — ela pode ter sido publicada em outro mês. Ou use a aba Gerenciamento com filtro Status: Publicado.",
      },
      {
        subtitulo: "Não aparece o botão Ver Lidos no comunicado?",
        texto:
          "O botão **Ver Lidos** só aparece com permissão de **Editar = Sim** no Portal de RH. Com apenas Ver, você marca a própria leitura com **Lido**, mas não consulta a lista de leitores.",
      },
      {
        subtitulo: "Não aparece o botão Ver ciência no documento?",
        texto:
          "O botão **Ver ciência** nos cards de Políticas e normativas só aparece com permissão de **Editar = Sim** **e** quando a postagem foi cadastrada com **Exige ciência do colaborador? = Sim**. Com apenas Ver, você registra a própria ciência no modal do PDF (**Li e estou ciente**), mas não consulta quem já aceitou.",
      },
      {
        subtitulo: "O time do autor no card está errado?",
        texto:
          "O rodapé do card usa o **time** do organograma ligado ao e-mail do autor em Gestão de Prestadores. Se aparecer a diretoria (ex.: Studio Operations) em vez do time (ex.: RH), confira o vínculo de organograma desse prestador. Se o cadastro estiver correto e o erro persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não consigo editar uma postagem já publicada?",
        texto:
          "Na aba Gerenciamento, postagens com status Publicado têm o ícone de editar (lápis). A aba Gerenciamento exige Editar = Sim. Após abrir o modal, use **Salvar alterações** para gravar o conteúdo sem desarquivar nem republicar.",
      },
      {
        subtitulo: "Não consigo arquivar uma postagem publicada?",
        texto:
          "O botão Arquivar (ícone de arquivo) abre um pop-up pedindo confirmação. Toque em Arquivar no pop-up para concluir ou Cancelar para voltar. A ação não pode ser desfeita pela plataforma.",
      },
      {
        subtitulo: "O anexo ou imagem não abre ao clicar?",
        texto:
          "No celular (Safari ou Chrome), o PDF abre em nova aba após um instante — se nada acontecer, o navegador pode ter bloqueado a nova aba: permita pop-ups para este site e toque de novo em **Ver arquivo**. Se aparecer mensagem vermelha sob o link, leia a orientação (pop-up bloqueado ou falha ao gerar o link). Não é necessário estar na Rede Spin / VPN: o arquivo usa link temporário autenticado. Se o erro continuar, entre em contato com o suporte.",
      },
    ],
  },
  banca_jogo: {
    titulo: "Banca de Jogo",
    blocos: [
      {
        subtitulo: "Não consigo criar uma solicitação?",
        texto:
          "A solicitação pode estar bloqueada por dois motivos: (1) cadastro de perfil incompleto — acesse Lives → Influencers e complete todas as informações obrigatórias; (2) ciência do Playbook pendente — acesse Conteúdo → Playbook e registre sua concordância. O sistema indica qual das situações está bloqueando e oferece um botão de acesso direto para resolver.",
      },
      {
        subtitulo: "A solicitação sumiu após ser criada?",
        texto:
          "A tabela de Solicitações exibe apenas pedidos com status Solicitado ou Aprovado — pedidos Liberados aparecem apenas no Consolidado de Bancas. Se você não vê a solicitação, confirme o mês selecionado no carrossel — a solicitação pode ter sido criada em outro período. Ative o Histórico para ver as 13 competências mensais — a atual e as 12 anteriores.",
      },
      {
        subtitulo: "Os botões Aprovar, Recusar e Liberar não aparecem?",
        texto:
          "Esses botões são exclusivos para perfis de gestão interna com permissão de edição. Aprovar e Recusar aparecem para solicitações com status Solicitado. Liberar aparece apenas para solicitações Aprovadas. Se você tem o perfil correto e os botões não aparecem, verifique se o filtro de período está correto — solicitações de outro mês não são exibidas na visualização atual.",
      },
      {
        subtitulo: "O Status da Conta no Consolidado não está correto?",
        texto:
          "O status Liberada/Bloqueada reflete o registro manual feito pela equipe de gestão. Se você acredita que o status está desatualizado, contate o gestor responsável para que ele altere diretamente pelo badge da linha no Consolidado de Bancas.",
      },
      {
        subtitulo: "O CPF aparece sempre mascarado — como revelar?",
        texto:
          "Clique no ícone de olho ao lado do CPF mascarado (***.***.***-**) para revelar o número completo temporariamente. A revelação é individual por linha e não persiste após navegar para outra página. Essa funcionalidade está disponível apenas para perfis com acesso aos dados do influencer.",
      },
      {
        subtitulo: "O Histórico do Consolidado não expande?",
        texto:
          "Clique na linha do influencer para expandir o histórico. Se o histórico aparecer vazio após expandir, significa que não há solicitações registradas para aquele influencer no período selecionado. Ative o Histórico (filtro) para ver as transações das 13 competências mensais — a atual e as 12 anteriores.",
      },
    ],
  },
  afiliados: {
    titulo: "Afiliados",
    blocos: [
      {
        subtitulo: "Não consigo salvar o perfil do afiliado?",
        texto:
          "Todos os campos financeiros são obrigatórios: Chave PIX, Banco, Agência e Conta. Verifique a aba Financeiro e preencha todos os campos antes de salvar. A mensagem de erro em vermelho indica qual campo está faltando.",
      },
      {
        subtitulo: "O afiliado está marcado como Perfil Incompleto mesmo após preencher?",
        texto:
          "Certifique-se de clicar em Salvar após preencher — campos preenchidos sem salvar não atualizam o indicador. Verifique todas as abas: a incompletude pode estar em Cadastral (nome, CPF, telefone) ou Financeiro (dados bancários). Ao salvar com sucesso, o nome deve sair do quadro de Incompletos automaticamente.",
      },
      {
        subtitulo: "Não consigo alterar o status do afiliado?",
        texto:
          "Alteração de status é restrita a Gestores e Admin. Se o badge de status não abre o dropdown, seu perfil não tem essa permissão. Entre em contato com um Gestor ou Admin para alterar o status.",
      },
      {
        subtitulo: "O afiliado não aparece na lista?",
        texto:
          "Verifique os filtros ativos: Status (chip colorido), Operadora e Busca por texto. O botão Limpar filtros remove todos de uma vez. Lembre que o filtro de status seleciona apenas o status clicado — afiliados de outros status ficam ocultos.",
      },
      {
        subtitulo: "Dados sensíveis não aparecem?",
        texto:
          "CPF e dados bancários ficam ocultos por segurança. Clique no ícone de olho ao lado do campo para revelar por 10 segundos. No modo de edição, os campos ficam visíveis permanentemente enquanto o modal estiver aberto.",
      },
      {
        subtitulo: "O vínculo com operadora não foi salvo?",
        texto:
          "Na aba Operadoras, ao marcar uma operadora como Ativa, o campo de ID é obrigatório. Se estiver vazio, o sistema exibe erro e não salva. Preencha o ID do afiliado naquela operadora antes de salvar.",
      },
    ],
  },
  afiliados_network: {
    titulo: "Network",
    blocos: [
      {
        subtitulo: "Um prospecto não aparece na lista?",
        texto:
          "Por padrão, registros com status Fechado são ocultados. Para vê-los, clique no card 'Fechado' no funil — ele funciona como filtro. Verifique também se há texto na busca que esteja filtrando o nome.",
      },
      {
        subtitulo: "Não consigo salvar um novo prospecto?",
        texto:
          "Ao salvar (+ Adicionar ou primeiro Salvar), o sistema sempre tenta criar o usuário afiliado na plataforma. Nesse momento são obrigatórios: Nome, E-mail e Operadora (aba Contato). Se faltar e-mail ou operadora, a mensagem em vermelho indica o campo. Para apenas rascunhar no funil sem criar usuário, ainda não há fluxo separado — qualquer Salvar com registro sem usuário dispara a criação.",
      },
      {
        subtitulo: "O botão ficou em 'Salvando...' por muito tempo?",
        texto:
          "Ao salvar um prospecto sem usuário criado, a plataforma aciona uma função de servidor para criar o cadastro. Em caso de lentidão, aguarde até 30 segundos. Se aparecer mensagem de erro, verifique se o e-mail já não está cadastrado na plataforma — cada e-mail aceita apenas um usuário.",
      },
      {
        subtitulo: "Os campos E-mail e Operadora estão bloqueados?",
        texto:
          "Quando o afiliado já foi criado na plataforma (o registro tem usuário vinculado), E-mail e Operadora ficam bloqueados para edição. Essas informações só podem ser alteradas pela administração do sistema, não pelo formulário de Network.",
      },
      {
        subtitulo: "As anotações não aparecem depois de adicionar?",
        texto:
          "Anotações são salvas ao clicar em 'Adicionar Anotação' — não ao clicar em Salvar. Se o botão estava desabilitado (cinza), o campo de texto estava vazio. Escreva o texto e clique em 'Adicionar Anotação' antes de fechar o modal.",
      },
      {
        subtitulo: "Salvei no Network mas o afiliado não aparece em Afiliados?",
        texto:
          "O usuário só é criado após um Salvar bem-sucedido com e-mail e operadora, quando o registro ainda não tinha acesso na plataforma. Status Fechado não é requisito. Se o Salvar falhou (e-mail duplicado, operadora ausente, timeout), o prospecto continua no Network sem usuário — corrija os dados e salve de novo. Confira também filtros de status e operadora na página Afiliados.",
      },
      {
        subtitulo: "Preciso marcar Fechado antes de criar o acesso?",
        texto:
          "Não. A criação do usuário ocorre no primeiro Salvar válido (e-mail + operadora) para registros sem vínculo, em qualquer estágio do funil. Fechado é etapa comercial de prospecção; a lista oculta Fechados por padrão, mas não controla a criação do login.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        subtitulo: "Nenhum ciclo aparece na página?",
        texto:
          "Os ciclos são gerados automaticamente a cada semana. Se a página estiver vazia, clique em Tentar novamente. Caso o problema persista, verifique se há lives realizadas e validadas no período — sem lives registradas, não há ciclo visível para influencers e agências. Gestores podem verificar as permissões de criação de ciclos com o time técnico.",
      },
      {
        subtitulo: "O ciclo que quero não aparece no dropdown?",
        texto:
          "O dropdown exibe apenas ciclos do mês selecionado no carrossel. Navegue para o mês correto ou ative o modo Histórico para ver todos os ciclos. Se uma live foi realizada em determinada semana e o ciclo não aparece, verifique se a live foi validada com status Realizada e se tem resultado registrado (duração e operadora).",
      },
      {
        subtitulo: "Os valores estimados diferem do que era esperado?",
        texto:
          "A prévia do ciclo aberto calcula estimativa com base nas lives realizadas e no cachê/hora cadastrado no perfil do influencer. Se o valor parece errado: (1) confirme que o cachê/hora está cadastrado corretamente em Lives → Influencers; (2) verifique se todas as lives do período foram validadas com duração registrada; (3) veja se o filtro de operadora está em Todas — filtrar por operadora específica mostra apenas as lives daquela plataforma.",
      },
      {
        subtitulo: "O botão Analisar ou Pagar não aparece?",
        texto:
          "Esses botões dependem do seu perfil e da permissão de edição. O botão Analisar aparece para pagamentos Em análise; Pagar aparece para pagamentos **Aguard. pagamento**. Se você tem permissão e os botões não aparecem, confirme que o ciclo está fechado — no ciclo aberto (prévia), nenhuma ação está disponível.",
      },
      {
        subtitulo: "Minhas lives estão realizadas mas não aparecem no financeiro?",
        texto:
          "Para que uma live gere pagamento ela precisa: (1) ter status Realizada; (2) ter resultado registrado com duração em horas e minutos; (3) ter operadora atribuída. Se os três pontos estão corretos e a live ainda não aparece, verifique se o mês selecionado corresponde à data da live e se o cachê/hora está cadastrado — lives com cachê zero ficam com estimativa R$ 0,00 e podem parecer ausentes.",
      },
      {
        subtitulo: "O Consolidado de Influencers não mostra um influencer?",
        texto:
          "O consolidado exibe apenas influencers com ao menos um ciclo de pagamento no período. Se um influencer não aparece, certifique-se de que ele tem pagamentos registrados no mês selecionado — pode ser necessário navegar para outro mês ou ativar o Histórico. A busca por nome/e-mail funciona sobre os resultados já carregados.",
      },
    ],
  },
  campanhas: {
    titulo: "Campanhas",
    blocos: [
      {
        subtitulo: "Não consigo criar ou editar campanhas?",
        texto:
          "Os botões Nova Campanha e Editar dependem de permissão de criação e edição, respectivamente. Se os botões não aparecem, seu perfil não tem acesso a essas ações. Entre em contato com o gestor responsável para solicitar a permissão adequada.",
      },
      {
        subtitulo: "Excluí uma campanha mas os dados nos dashboards sumiram?",
        texto:
          "A exclusão de uma campanha desfaz os vínculos com os UTMs na Gestão de Links, mas não apaga dados históricos dos dashboards. Se dados desapareceram, verifique se os UTMs que estavam associados à campanha foram remapeados — eles voltam para Pendentes e precisam de nova associação para alimentar os relatórios.",
      },
      {
        subtitulo: "A campanha inativa ainda aparece no modal de Gestão de Links?",
        texto:
          "Campanhas inativas não aparecem como opção ao mapear novos links. Se você precisa associar um link a uma campanha que ficou inativa, edite a campanha, altere o status para Ativa, mapeie o link e, se necessário, volte a inativar.",
      },
      {
        subtitulo: "A tabela está vazia mas sei que há campanhas cadastradas?",
        texto:
          "Confira o filtro de operadora no carrossel — com uma operadora específica, só entram campanhas daquela parceira (e campanhas sem operadora). Tente **Todas Operadoras**. Se o problema persistir, verifique se seu perfil tem permissão de visualização para Campanhas e recarregue a página.",
      },
      {
        subtitulo: "A aba Geração de Links não mostra nenhum link?",
        texto:
          "A lista só exibe links gerados nesta aba (botão **Novo Link**). Não é a mesma fila da Gestão de Links (UTMs detectados automaticamente). Confira também o filtro de operadora. Se a tabela permanecer vazia após gerar um link e o problema persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Não consigo gerar link para outra operadora além da Casa de Apostas e Blaze?",
        texto:
          "Por enquanto a geração de links está disponível para **Casa de Apostas** e **Blaze**. As demais operadoras serão liberadas em atualizações futuras — o modal informa quando a geração ainda não está disponível.",
      },
      {
        subtitulo: "O que significa Status Ativo ou Inativo nos links gerados?",
        texto:
          "**Ativo** indica que o link gerou resultados (métricas de visitas, registros ou FTDs) nos últimos 30 dias. **Inativo** significa que não houve resultados nesse período — o link continua cadastrado.",
      },
    ],
  },
  galeria_fotos: {
    titulo: "Galeria de Fotos",
    blocos: [
      {
        subtitulo: "Não vejo a aba Upload?",
        texto:
          "A aba Upload exige permissão de **Criar** em Gestão de Usuários → Permissões para a página Galeria de Fotos. Quem tem apenas Ver acessa a aba **Galeria** (sub-abas Gerais e Minhas Fotos).",
      },
      {
        subtitulo: "Não encontro fotos em Minhas Fotos?",
        texto:
          "Com permissão de **Editar**, todas as fotos individuais de colaboradores aparecem em **Minhas Fotos** — confira o filtro de colaborador e a busca. Com **Ver (próprios)** (perfil prestador ou equivalente), você vê todas as fotos em **Gerais** e, em **Minhas Fotos**, só as fotos atribuídas ao seu cadastro; o filtro de colaborador fica fixo no seu nome. Se não houver vínculo entre login e cadastro RH, a mensagem será **Nenhum colaborador vinculado ao seu login.** Confira se o e-mail de login coincide com o e-mail ou e-mail Spin em **Dados de Cadastro**.",
      },
      {
        subtitulo: "O envio de fotos falhou?",
        texto:
          "Confirme o tipo de foto, o evento (gerais) ou o colaborador (individuais) e que cada arquivo está em JPG, PNG ou WebP com até 25 MB. Se o problema persistir, entre em contato com o suporte.",
      },
    ],
  },
  comercial_overview: {
    titulo: "Overview Comercial",
    blocos: [
      {
        subtitulo: "Não vejo Overview Comercial no menu?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de Ver para **Overview Comercial** (página na seção **Dashboards**, distinta do Pipeline B2B). Administradores têm acesso total.",
      },
      {
        subtitulo: "Mapa ou lista de UF vazios?",
        texto:
          "A distribuição geográfica usa a **UF da sede do CNPJ** de cada marca (via empresa), preenchida pelo enriquecimento automático de cadastro. Marcas cujo CNPJ ainda não foi enriquecido não aparecem no mapa até o processamento diário.",
      },
      {
        subtitulo: "KPIs zerados mas há marcas no Pipeline?",
        texto:
          "Na aba **Operadoras**, verifique o filtro **Comercial** (**Todos Comerciais**). Na aba **Integrações**, confira **Prioridade** (**Todas Prioridades**). Os KPIs e gráficos da aba ativa respeitam só esses filtros — não há mais chips de status do funil nem filtro de Estados no Overview.",
      },
    ],
  },
  comercial_integracao: {
    titulo: "Integração",
    blocos: [
      {
        subtitulo: "Não vejo Integração no menu?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de Ver para Integração. Administradores têm acesso total. Demais perfis começam com Ver/Criar/Editar em **Não** até liberação explícita.",
      },
      {
        subtitulo: "Não aparece marca em Nova Integração?",
        texto:
          "Só entram marcas da aba **Fechado** do Pipeline B2B — Dedicada ou Network em **Contrato Assinado** ou **Ativo**. Use a pesquisa pelo nome da marca. Se o problema persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "A linha não foi criada ao fechar no Pipeline B2B?",
        texto:
          "A criação automática ocorre ao marcar **Contrato Assinado** ou **Ativo** em Dedicada ou Network. Confirme o tipo — cada produto gera no máximo uma linha automática; novas linhas extras saem de **Nova Integração**. Se o problema persistir, entre em contato com o suporte.",
      },
    ],
  },
  comercial_pipeline_b2b: {
    titulo: "Pipeline B2B",
    blocos: [
      {
        subtitulo: "Não vejo a página Pipeline B2B no menu?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de Ver para Pipeline B2B e, se for Operador, se a página está liberada na aba Escopos → Operadora. Gestores de departamento dependem só da matriz de Permissões. Administradores têm acesso total.",
      },
      {
        subtitulo: "Não consigo editar Comercial, Status ou produtos na tabela?",
        texto:
          "A edição inline exige permissão de Editar na página Pipeline B2B. Sem essa permissão, os modais de contato e Ver funcionam em modo consulta.",
      },
      {
        subtitulo: "A tabela está vazia após aplicar filtros?",
        texto:
          "Revise a busca, o filtro Comercial e os KPIs clicáveis na aba atual — eles restringem o detalhe por substatus. Limpe a busca, selecione **Todos Comerciais** e clique novamente no KPI ativo para remover o filtro.",
      },
      {
        subtitulo: "Erro ao salvar contato ou anotação?",
        texto:
          "Verifique conexão e permissão de Editar. A interface exibe mensagem genérica em português — detalhes técnicos ficam no console do navegador para suporte.",
      },
      {
        subtitulo: "Sync da Lista SPA falhou com erro de planilha ou HTTP 404?",
        texto:
          "A lista oficial é a tabela **Empresas Autorizadas** no portal do Ministério da Fazenda. O sync lê essa página HTML; links antigos de planilha sob Transparência Ativa podem estar quebrados e são ignorados. Em Status Técnico, use **Sync** na linha **Lista SPA**. Se o erro persistir após o deploy da Edge Function, entre em contato com o suporte.",
      },
    ],
  },
  comercial_pipeline_agregadoras: {
    titulo: "Pipeline Agregadoras",
    blocos: [
      {
        subtitulo: "Não vejo Pipeline Agregadoras no menu?",
        texto:
          "Confirme em Gestão de Usuários se seu perfil tem permissão de Ver para Pipeline Agregadoras. Administradores têm acesso total. Demais perfis começam com Ver/Criar/Editar em **Não** até liberação explícita.",
      },
      {
        subtitulo: "Não consigo cadastrar ou alterar status?",
        texto:
          "O botão **Cadastrar** exige permissão de Criar. Alterar Status ou Último Contato exige permissão de Editar. Sem Editar, os modais Ver e Histórico permanecem em modo consulta.",
      },
      {
        subtitulo: "A tabela está vazia?",
        texto:
          "Ainda não há seed automático — cadastre agregadoras manualmente. Se já houver registros, revise busca, filtro Comercial, aba ativa e KPI selecionado.",
      },
    ],
  },
  gestao_operadoras: {
    titulo: "Gestão de Operadoras",
    blocos: [
      {
        subtitulo: "Não consigo ativar uma operadora?",
        texto:
          "O status Ativa só pode ser definido quando a operadora tiver pelo menos uma mesa cadastrada em Gestão de Estúdios. Cadastre as mesas primeiro e tente novamente.",
      },
      {
        subtitulo: "Erro ao excluir uma operadora?",
        texto:
          "A exclusão falha quando existem registros vinculados à operadora (mesas, escalas, figurinos, etc.). Remova todos os vínculos primeiro, ou desative a operadora sem excluir para preservar o histórico.",
      },
      {
        subtitulo: "As cores do brandguide não aparecem para o operador?",
        texto:
          "Verifique se as quatro cores estão preenchidas em formato #RRGGBB e se o logo foi enviado. O operador precisa fazer logout e login novamente para que o brandguide atualizado seja carregado.",
      },
    ],
  },
  gestao_mesas: {
    titulo: "Gestão de Estúdios",
    blocos: [
      {
        subtitulo: "Erro ao cadastrar uma mesa — 'já existe uma mesa com este ID'?",
        texto:
          "O ID Spin é único por operadora (legado). Verifique se já existe uma mesa com o mesmo identificador. Se precisar corrigir o ID Spin de uma mesa existente, exclua e recadastre.",
      },
      {
        subtitulo: "A lista aparece vazia mesmo havendo mesas cadastradas?",
        texto:
          "Verifique se o filtro de operadora está em **Todas Operadoras** e se está na aba correta (**Estúdios** ou **Mesas**). Com filtro de operadora ativo, só entram estúdios e mesas vinculados àquela parceira.",
      },
    ],
  },
  status_tecnico: {
    titulo: "Status Técnico",
    blocos: [
      {
        subtitulo: "Uma integração aparece como 'Falha' — o que fazer?",
        texto:
          "Verifique os Logs Recentes na mesma página: o campo Descrição traz a causa do erro. As causas mais comuns são credencial de API expirada ou rotina de integração indisponível — as duas exigem ação do time técnico. Com permissão de Editar, use **Executar diagnóstico** para registrar um relatório em Logs Recentes (sem disparar sync). Depois de corrigida a causa, use o botão Sync na integração correspondente; se o erro persistir, entre em contato com o suporte técnico.",
      },
      {
        subtitulo: "Executar diagnóstico não faz nada ou retorna erro?",
        texto:
          "Confirme permissão de **Editar** em Status Técnico (Gestão de Usuários). Se a mensagem indicar que a rotina de diagnóstico não está disponível, entre em contato com o suporte técnico — a publicação da rotina é feita pelo time de plataforma. O diagnóstico verifica apenas o ambiente em que você está logado; não substitui os testes automatizados da esteira de deploy.",
      },
      {
        subtitulo: "O botão Sync não aparece para uma integração?",
        texto:
          "Apenas as integrações **CDA Influencers**, **CDA Afiliados**, Social Media KPIs, Spin na Rede RSS, **Painel de Notícias RSS**, **Lista SPA**, **Validação de domínios de Marcas** e **Estado / Cidade** possuem sync manual. Lobby Blaze, Lobby CDA, Lobby Esportiva Bet e Lobby Jonbet operam via job automatizado externo e não têm ação disponível na interface.\n\nSe a TV em `/painel-noticias` ficar vazia ou em «Aguardando notícias…», use **Sync** na linha Painel de Notícias (RSS) e confira se o job horário está ativo.",
      },
      {
        subtitulo: "Um prestador não consegue fazer check-in?",
        texto:
          "O sistema de ponto bloqueia IPs não cobertos por CIDR autorizado. Verifique o IP público da rede do prestador e confira se ele está dentro de algum dos prefixos listados em 'Redes Permitidas'. Se necessário, adicione o CIDR correspondente.\n\nSe o botão estiver em **Fazer Check-out**, há um check-in aberto há menos de **20 horas** — o próximo ato é encerrar esse turno (inclusive turnos que cruzam a meia-noite). Após 20h sem check-out, o sistema libera novo check-in; o turno incompleto deve ser tratado com **Justificar** no Controle de Presença.",
      },
      {
        subtitulo: "O alerta 'E-mail não enviado hoje' está aparecendo mesmo após o envio?",
        texto:
          "Os alertas são calculados com base nos registros de email_envios do dia corrente (UTC). Se o envio foi feito muito cedo ou próximo da meia-noite, pode haver defasagem de fuso horário. Verifique nos Logs Recentes se o envio aparece registrado.",
      },
    ],
  },
  tech_ops_ordem_saida: {
    titulo: "Ordem de Saída",
    blocos: [
      {
        subtitulo: "A página abre sem nenhuma ordem?",
        texto:
          "Comportamento esperado em ambiente novo: não há dados de exemplo. Use Nova O.S. Interna, Externa ou Manutenção. Se os botões não aparecem, confira a permissão de **Criar** em Gestão de Usuários.",
      },
      {
        subtitulo: "Uma OS antiga ainda aparece no mês atual?",
        texto:
          "Comportamento esperado: ordens Solicitadas ou Abertas de meses anteriores permanecem no quadro até serem Concluídas ou Canceladas. Use Atualizar para encerrar o fluxo.",
      },
      {
        subtitulo: "Não consigo escolher o mesmo local em Origem e Destino?",
        texto:
          "Na O.S. Interna, Origem e Destino devem ser diferentes — a mensagem de erro aparece ao tentar selecionar o mesmo valor.",
      },
      {
        subtitulo: "O catálogo de itens está vazio no modal?",
        texto:
          "Os itens vêm da Gestão de Estoque: só entram materiais com quantidade em estoque, equipamentos com status Estoque e lotes de jogo com quantidade atual maior que zero (na Manutenção a lista é mais ampla). Cadastre ou libere itens na Gestão de Estoque antes de solicitar a OS.",
      },
      {
        subtitulo: "Ao clicar em Solicitar aparece erro genérico?",
        texto:
          "Confirme se a migration de correção da Ordem de Saída foi aplicada no Supabase e se o usuário tem permissão de **Criar** ou **Editar** em Gestão de Usuários. Se o erro continuar após o deploy, entre em contato com o suporte.",
      },
      {
        subtitulo: "A data de retorno foi recusada?",
        texto:
          "A data de retorno (ou previsão) deve ser posterior à data de saída. Use o formato DD/MM/AAAA. Em Interna e Manutenção, marque Sem retorno / Sem previsão quando não houver data.",
      },
    ],
  },
  tech_ops_itens_alocados: {
    titulo: "Itens Alocados",
    blocos: [
      {
        subtitulo: "A aba Set está vazia?",
        texto:
          "O Set lista itens de Ordens de Saída internas **Abertas** com destino no local selecionado. Se não houver OS aberta para aquele destino, a tabela fica vazia — confirme na Ordem de Saída ou troque o local no carrossel.",
      },
      {
        subtitulo: "Não vejo Checklist nem Registrar Limpeza/Manutenção?",
        texto:
          "Esses botões exigem permissão de **Criar** em Gestão de Usuários → Permissões → Itens Alocados. Com apenas **Ver**, você continua vendo os dados e as ações Ver e Histórico.",
      },
      {
        subtitulo: "O filtro Mesa não aparece?",
        texto:
          "O seletor de Mesa só aparece quando o Local é um estúdio. Em Shuffler Room, OCR ou Academy o filtro some e a listagem considera o local inteiro.",
      },
    ],
  },
  tech_ops_estoque: {
    titulo: "Gestão de Estoque",
    blocos: [
      {
        subtitulo: "A página abre vazia, sem nenhum registro?",
        texto:
          "Comportamento esperado em ambiente recém-implantado: a Gestão de Estoque não tem dados de exemplo. Os catálogos são preenchidos pelas ações Novo Item, Novo Equipamento, Novo Item de Jogo e Novo Fornecedor. Se os botões de criação não aparecem, verifique a permissão de **Criar** em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "Um registro sumiu da tabela, mas eu não excluí nada?",
        texto:
          "A página não possui exclusão. Verifique os filtros ativos: um card de KPI selecionado (Estoque, Em uso ou Manutenção), o filtro de Categoria, o filtro de Estúdio ou o texto na busca restringem o catálogo. Clique no card Total (ou no card ativo) e limpe busca e filtros para ver a lista completa.",
      },
      {
        subtitulo: "O Estoque ou a Qtd Atual não batem com o que digitei?",
        texto:
          "Essas colunas são calculadas: Estoque do item = Quantidade Total − Em Uso − Manutenção; Qtd Atual do lote = Qtd Inicial − Consumida − Descartada. Para ajustar o total de um item, use Editar → Novas Unidades; a mudança fica registrada no Histórico com o valor anterior e o novo.",
      },
      {
        subtitulo: "Não consigo salvar a edição?",
        texto:
          "O Salvar exige um Tipo de Alteração selecionado (com os campos preenchidos) ou um texto de anotação. Anexo sem texto de anotação também bloqueia o salvamento — escreva a anotação antes de enviar o arquivo. Se o erro persistir após corrigir os campos, entre em contato com o suporte.",
      },
      {
        subtitulo: "O filtro de Estúdio não mostra o estúdio esperado?",
        texto:
          "A lista vem do cadastro de Gestão de Estúdios e exibe apenas estúdios ativos. Se o estúdio não aparece, confirme o cadastro com o administrador. A coluna Alocação dos equipamentos só mostra estúdio quando o status é Em uso.",
      },
      {
        subtitulo: "Vejo a página mas os botões Novo e Editar não aparecem?",
        texto:
          "Comportamento esperado: os botões seguem as permissões de **Criar** e **Editar** da página em Gestão de Usuários. Com apenas permissão de Ver, a página fica somente leitura — incluindo os modais Ver com Anotações e Histórico.",
      },
    ],
  },
  gestao_usuarios: {
    titulo: "Gestão de Usuários",
    blocos: [
      {
        subtitulo: "Um usuário diz que não vê determinada página no menu após alteração?",
        texto:
          "As permissões e menus são carregados no login. Após salvar qualquer alteração nas abas Permissões, Escopos (Operadora / Prestadores) ou Simulador de Login, o usuário afetado precisa fazer logout e login novamente para que as mudanças reflitam no menu.",
      },
      {
        subtitulo: "As abas Permissões, Escopos e Simulador de Login não aparecem?",
        texto:
          "Essas abas são exibidas somente para o perfil Administrador com permissão de Editar em Gestão de Usuários. Se você é administrador e as abas não aparecem, verifique se sua sessão está ativa e recarregue a página.",
      },
      {
        subtitulo: "Erro ao salvar permissões ou páginas?",
        texto:
          "Verifique sua conexão com a internet. Se o erro persistir, recarregue a página antes de tentar novamente — isso evita salvar um estado inconsistente. Em caso de erro contínuo, entre em contato com o suporte técnico.",
      },
      {
        subtitulo: "Não consigo criar um novo usuário?",
        texto:
          "O botão Novo Usuário (pill com ícone +) só aparece para administradores com permissão de Criar ativa. Verifique na aba Permissões se o perfil Administrador está configurado corretamente (o admin tem acesso total fixo, portanto o botão deve sempre aparecer). Se o e-mail informado já estiver cadastrado, o sistema retornará erro — use a busca para localizar o usuário existente.",
      },
    ],
  },
  rh_gestao_escala: {
    titulo: "Escala Estúdio",
    blocos: [
      {
        subtitulo: "Não vejo Escala Estúdio no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários e, se o seu perfil usar escopo, liberação da página nas abas Operadora ou Prestadores. Gestores de departamento usam só a matriz de Permissões. O item aparece na seção **Escala** do menu.",
      },
      {
        subtitulo: "Não consigo salvar ou aprovar a escala?",
        texto:
          "Salvar e aprovar exigem permissão de **Criar**. **Alterar Escala** (após aprovada) exige **Editar**. Se aparecer aviso de que a escala foi atualizada por outra pessoa, use **Tentar de novo** (ou recarregue) antes de salvar. Verifique também se o mês ou time selecionado está bloqueado por fluxo de aprovação em andamento.",
      },
      {
        subtitulo: "Só vejo uma aba de time?",
        texto:
          "Com permissão de **Ver = Próprios**, a Escala Estúdio mostra apenas a aba do seu time no Organograma (a grade dessa aba continua com todo o time). Com **Ver = Sim**, aparecem todas as áreas (Game Presenter, Shuffler, etc.). Ajuste em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "A lista da Escala Diária não bate com o número do Consolidado?",
        texto:
          "O clique no turno do Consolidado filtra pela **situação do dia** (Manhã, Compra - Manhã, etc.), não pelo turno cadastrado na Staff. Quem teve Compra ou Alterar Escala para outro turno no dia entra na contagem e na lista desse turno.",
      },
      {
        subtitulo: "Mudei o turno na Staff e a Escala Diária mudou?",
        texto:
          "Em **rascunho**, a coluna Turno acompanha o cadastro atual da Gestão de Staff. Depois de **Aprovar Escala**, o turno daquele mês/área fica congelado — alterações na Staff só passam a valer no próximo rascunho/aprovação. Para mudar um dia pontual no mês já aprovado, use **Alterar Escala** (escolhe o turno do dia + observação).",
      },
      {
        subtitulo: "A célula de Compra, Venda ou Troca não mostra o comentário?",
        texto:
          "O comentário aparece em células gravadas por uma negociação **concluída** no Marketplace. Propostas de troca **Em análise** ainda não alteram a escala. Atualize a Escala Estúdio após o aceite ou aprovação. Se a célula tiver sido alterada manualmente depois, o comentário da negociação deixa de aparecer porque o valor atual já não corresponde ao valor registrado pelo Marketplace.",
      },
    ],
  },
  escala_escritorio: {
    titulo: "Escala Escritório",
    blocos: [
      {
        subtitulo: "Não vejo Escala Escritório no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários → Permissões → linha **Escala Escritório**. A página nasce bloqueada para todos os perfis exceto Administrador e aparece na seção **RH**. Após liberar, faça logout e login (ou atualize a sessão).",
      },
      {
        subtitulo: "Não consigo salvar ou aprovar a escala de escritório?",
        texto:
          "Salvar e aprovar exigem permissão de **Criar** na linha **Escala Escritório** (distinta da Escala Estúdio). Confirme também se o time selecionado tem prestadores com área de atuação **Escritório**.",
      },
      {
        subtitulo: "A Situação no Calendário não acompanha a Escala Escritório?",
        texto:
          "Só a grade **aprovada** alimenta o Calendário. Use **Salvar Alterações** e **Aprovar Escala**. Enquanto não houver aprovação, o Calendário usa a escala comercial automática (úteis 09:00–18:00).",
      },
    ],
  },
  rh_staff: {
    titulo: "Gestão de Staff",
    blocos: [
      {
        subtitulo: "Busquei pelo primeiro e último nome e não apareceu?",
        texto:
          "A busca aceita várias palavras em qualquer ordem — «Alexandre Zanchetta» encontra «Alexandre Galvão Zanchetta». Confira também o carrossel de time, **Todos Estúdios** e **Todos Turnos**: filtros ativos restringem a tabela além do texto digitado.",
      },
      {
        subtitulo: "Só vejo o meu time na Gestão de Staff?",
        texto:
          "Com permissão de Ver em **Próprios**, a página mostra só o time do seu cadastro de prestador. Para ver todos os times de Game Floor e Operation Management, a permissão de Ver precisa ser **Sim**. Se o seu login não estiver ligado a um prestador desses times, a lista fica vazia — entre em contato com o RH.",
      },
      {
        subtitulo: "Mensagem «Este cadastro foi alterado por outra pessoa»?",
        texto:
          "Outra pessoa salvou o mesmo prestador enquanto o modal estava aberto. Feche o modal, recarregue a lista e edite de novo com os dados atuais.",
      },
      {
        subtitulo: "Não vejo Gestão de Staff no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários → Permissões → linha **Gestão de Staff**. A página lista prestadores dos times de Game Floor e Operation Management. Com Ver em **Próprios**, só aparece o time do seu cadastro — se o login não estiver vinculado a um prestador desse universo, a lista fica vazia. Após alterar permissão, faça logout e login (ou atualize a sessão).",
      },
      {
        subtitulo: "Não vejo o campo ID TOS?",
        texto:
          "O **ID TOS** aparece só no time **Service Manager**, na aba Função dos modais **Ver** e **Editar** — não há coluna na tabela da listagem. Em outros times o campo não é exibido. O valor precisa ser um UUID (com hífens). Se o salvamento falhar, entre em contato com o suporte.",
      },
      {
        subtitulo: "Mensagem «Este ID TOS já está cadastrado»?",
        texto:
          "Cada UUID TOS só pode estar em um Service Manager. Confira se o mesmo ID não foi colado em outro SM. Corrija o cadastro duplicado e salve de novo.",
      },
      {
        subtitulo: "Não consigo imprimir o ID de um Game Presenter?",
        texto:
          "No modal **Imprimir IDs**, a lista inclui os times visíveis na Gestão de Staff (com **Próprios**, só o seu time). O botão só aparece com permissão de **Editar**. Só entram na impressão quem tem o campo **Barcode** preenchido na edição do Staff. Cadastre o barcode, salve e tente de novo. Prestadores sem barcode aparecem na lista, mas ficam desabilitados. Se o PDF não baixar, permita downloads neste site e tente novamente; se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "O leitor não reconhece o código de barras do ID?",
        texto:
          "O PDF gera cartões **5×3,6 cm** com código **GS1-128 (UCC/EAN-128)** de **1,4×1,6 cm**. Imprima em escala **100%** (sem «Ajustar à página») para manter as medidas. Confirme que o leitor está configurado para GS1-128. Se o barcode cadastrado já usar notação GS1 com parênteses — ex.: `(21)12345` — a plataforma respeita esse formato; valores simples recebem automaticamente o identificador de aplicação **21** (número de série). Se ainda falhar, entre em contato com o suporte.",
      },
    ],
  },
  rh_calendario: {
    titulo: "Calendário",
    blocos: [
      {
        subtitulo: "Não vejo Calendário no menu (perfil Prestador)?",
        texto:
          "Para o perfil **Prestador**, a página só aparece no menu se as **duas** liberações estiverem ok:\n\n1. **Gestão de Usuários → Permissões** — perfil Prestador com Ver em **Próprios** ou **Sim** no Calendário.\n2. **Gestão de Usuários → Escopos → Prestadores** — a página **Calendário** marcada na(s) **área(s) de atuação** do usuário (Escritório, Estúdio, Facilities, TI).\n\nO menu efetivo é a interseção das duas. Se só a Permissão estiver liberada e o Escopo da área não tiver Calendário marcado, a página continua oculta. Confirme também se o usuário tem área de atuação no cadastro (escopo `prestador_tipo`). Depois de salvar, o prestador precisa **sair e entrar de novo** — as permissões do menu são carregadas no login.",
      },
      {
        subtitulo: "Turnos não aparecem no calendário?",
        texto:
          "Para prestadores do Estúdio, a Situação (Escalado/Folga) e os turnos só vêm da Escala Diária **aprovada** em **Escala Estúdio**. Rascunho, sugestão ou células só no navegador **não** alimentam o Calendário — use **Salvar** e depois **Aprovar Escala** em cada área (Game Presenter, Shuffler, etc.). Confirme também se os filtros de Time ou Staff não estão restringindo a visão. Para Escritório, se existir **Escala Escritório** aprovada, essa grade prevalece; caso contrário, verifique se a área de atuação está cadastrada corretamente e use a escala automática de segunda a sexta-feira.\n\nCom **Ver = Próprios**, líderes imediatos veem os ramos subordinados definidos no Organograma; quem não lidera vê somente o próprio calendário. Se alguém esperado não aparecer, revise o vínculo de Diretoria, Gerência ou Time no cadastro do prestador.",
      },
      {
        subtitulo: "Aparece «Não foi possível carregar a escala do calendário»?",
        texto:
          "Essa mensagem indica falha ao buscar a grade do **mês exibido** no carrossel (não confundir com mês sem escala aprovada, que mostra aviso amarelo). Atualize a página; se continuar, entre em contato com o suporte técnico para verificar a carga da grade daquele mês. Enquanto isso, Escritório / Horário Comercial continuam com a escala automática.",
      },
      {
        subtitulo: "Ao trocar o Staff, o Controle de Presença ainda mostra o check-in do anterior?",
        texto:
          "Atualize a página (Ctrl+Shift+R). Se o problema continuar após o deploy, entre em contato com o suporte — o registro de presença do prestador anterior não deve ser reaproveitado ao mudar o filtro de Staff.",
      },
      {
        subtitulo: "A Situação no Controle de Presença aparece em branco (—)?",
        texto:
          "Para **Escritório** sem Escala Escritório aprovada e para **Estúdio com Horário Comercial** (5×2), a Situação deve preencher o mês inteiro: úteis Escalado 09:00–18:00; fins de semana e feriados nacionais/SP capital = Folga. Se faltar dias, atualize a plataforma. Com **Escala Escritório** aprovada, a Situação segue as células da grade (Comercial/Folga/…). Para **Estúdio** com turnos Manhã/Tarde/Noite, Situação `—` com a Escala Diária já **Aprovada** em Escala Estúdio pode indicar falha na carga da grade — atualize a página e, se persistir, entre em contato com o suporte técnico. Confirme também: mesmo mês do carrossel; a **área do time** do prestador aprovada; célula preenchida na grade.",
      },
      {
        subtitulo: "O card Trocas fica zerado mesmo depois de uma troca aprovada?",
        texto:
          "A **Oferta de Troca** aceita no Marketplace grava **Venda** no dia que você entregou e **Compra - Turno** no dia que você assumiu — a Escala e o Calendário continuam mostrando assim, de propósito. O card **Trocas** reconhece a origem da negociação, por isso conta esses dois dias e não os soma em Venda nem em Compra. Se o card continuar em zero, confirme que a troca está **aprovada** (não Em análise) e que o mês do carrossel e o Staff filtrado são os da negociação; depois atualize a página.",
      },
      {
        subtitulo: "Não consigo registrar presença ou justificativa?",
        texto:
          "Para **Justificar** a própria falta ou pendência no **Meu Controle**, basta permissão de **Ver** no Calendário. Para **Aprovar** turnos de liderados (ou a própria presença registrada com perfil de edição), é necessária permissão de **Editar** (**Sim** ou **Próprios**). **Correções** de horário (**Esquecimento**, **Outro** ou Correção) só o **líder imediato** (ou Editar Sim) analisa por campo — o próprio prestador não aprova a própria correção. Atestado **Médico** é atendido em **Solicitações** (RH). Se o botão não aparecer, peça liberação ao administrador em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "O Status aparece Sem horário e não consigo Justificar?",
        texto:
          "No **Controle de Presença**, **Sem horário** aparece quando o turno Escalado (Manhã/Tarde/Noite) não encontra entrada e saída programadas. Em **Shuffler** (e outros times com **Todos Estúdios**), o horário vem do **primeiro estúdio ativo** com turnos preenchidos em Gestão de Estúdios — não da operadora. Se o Status continuar Sem horário, confirme os horários Manhã/Tarde/Noite do estúdio. Em **dias já passados** sem Check-in, o Status passa a **Falta** e o botão **Justificar** fica disponível mesmo sem o horário programado. No próprio dia, o Justificar só aparece depois do fim do turno (ou no dia seguinte, se o horário ainda não estiver cadastrado).",
      },
      {
        subtitulo: "O check-out da manhã aparece como check-in do outro dia?",
        texto:
          "Com a regra atual, o check-out de turno noturno fica na **mesma linha** do dia do check-in (ex.: entrada 20h e saída 08h). O botão **Fazer Check-out** vale por **20 horas** após o check-in. Se o problema continuar, peça ao suporte para revisar os **registros de presença** daquele dia.",
      },
      {
        subtitulo: "O pop-up confirma o check-in, mas o horário realizado não aparece?",
        texto:
          "Confirme se o e-mail de login (ou e-mail Spin) no cadastro do prestador está correto e é o mesmo usado para acessar a plataforma. A leitura do registro de presença depende desse vínculo — com e-mail pessoal e e-mail Spin em contas diferentes, o registro não é associado ao prestador. Após corrigir o cadastro, o horário deve aparecer na linha do turno; se continuar vazio, entre em contato com o suporte.",
      },
      {
        subtitulo: "Posso fazer Check-in em uma Folga?",
        texto:
          "Sim. Check-in e Check-out ficam disponíveis independentemente da Situação do dia para coberturas e plantões emergenciais. O dia continua identificado como **Folga**, e os horários realizados ficam pendentes de aprovação do gestor.",
      },
      {
        subtitulo: "Não vejo a aba Relatório de Presença?",
        texto:
          "A aba **Relatório de Presença** só aparece para quem tem permissão de **Editar: Sim** no Calendário (Gestão de Usuários → Permissões → linha Calendário → coluna Editar). **Editar: Próprios** não libera a aba. Administradores vêem sempre. Sem **Editar: Sim**, usam-se só **Compromissos** e **Controle de Presença**. Após alterar permissões, faça logout e login (ou atualize a sessão) para o menu refletir a mudança.",
      },
    ],
  },
  escala_marketplace_turnos: {
    titulo: "Marketplace",
    blocos: [
      {
        subtitulo: "Não vejo o botão Nova Oferta?",
        texto:
          "Publicar exige permissão de **Criar** no Marketplace e cadastro de prestador com área **Estúdio** ligado ao seu login. Sem esse vínculo o botão não aparece — confirme o cadastro em Gestão de Prestadores e a permissão em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "O dia de amanhã não aparece no modal de oferta?",
        texto:
          "A antecedência de **4h** conta até o **início do turno**, não até a meia-noite do dia. Ex.: se agora são 6h e a Manhã começa às 7h, esse turno (ou folga desejando Manhã) não aparece; a Tarde com início às 15h pode.",
      },
      {
        subtitulo: "Dias do mês seguinte não aparecem no modal de oferta?",
        texto:
          "O carrossel do Marketplace e o modal Ofertar usam o mesmo horizonte da **Escala Estúdio**: julho/2026 em diante até o **mês civil seguinte** (ex.: em agosto, setembro entra no carrossel). Se setembro já está aprovado mas os dias não aparecem no modal, confirme escala **aprovada** (não rascunho) na aba do seu time e antecedência de **4h** até o início do turno. Recarregue a página; se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Ofertas do mês seguinte não aparecem nos blocos?",
        texto:
          "Com **Histórico** ligado, a listagem inclui ofertas até o **último mês do carrossel** — que também leva o mês civil seguinte (ex.: setembro em agosto). Se você publicou para setembro e não vê no mural, confirme que **Histórico** está ativo ou navegue o carrossel até setembro; limpe filtros de tipo de ação, time, turno, dia e busca. Ofertas **Em análise** ou **Encerradas** não entram em **Todas as Ofertas** — use **Minhas Ofertas** ou **Ofertas Encerradas**.",
      },
      {
        subtitulo: "Nenhum dia aparece no modal de oferta?",
        texto:
          "Os dias vêm de **todas** as competências com escala **aprovada** no carrossel **e no mês civil seguinte** (ex.: em agosto, setembro entra se já estiver aprovado na Escala Estúdio), com início do turno a pelo menos **4h**. Venda de Turno e Oferta de Troca listam turno original e **Compra - Turno**; Venda de Folga lista **Folga** e **Venda** com ao menos um turno desejado elegível (4h + 12h de intervalo). Compra antiga sem o turno identificado e Troca não entram porque não informam qual turno deve ser negociado.",
      },
      {
        subtitulo: "Ao publicar aparece erro genérico ou de horário do turno?",
        texto:
          "A publicação precisa resolver o **horário de início** do turno (antecedência de 4h para criar e expiração de 2h). Em Game Presenter e Shuffler esse horário vem do **estúdio** (Gestão de Estúdios → turnos Manhã/Tarde/Noite), não da operadora. Confirme que o estúdio do Staff tem os horários preenchidos; Shuffler com **Todos Estúdios** usa o primeiro estúdio ativo com horário. Depois da correção no banco, tente publicar de novo — se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Minha oferta foi cancelada sem ninguém aceitar?",
        texto:
          "Ofertas ainda abertas e propostas de troca **Em análise** são canceladas automaticamente quando faltam **menos de 2h para o início do turno** ou quando a **data da oferta já passou**. Na troca, isso significa que o ofertante não aprovou a proposta a tempo: os dias reservados são liberados e nenhuma célula da escala é alterada. Se o cancelamento ocorreu antes dessa janela, confirme o horário do turno no cadastro do **estúdio** (Gestão de Estúdios) ou na Gestão de Staff e, se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "O turno que eu quero trabalhar não aparece na Venda de Folga?",
        texto:
          "A lista só mostra turnos com pelo menos **12h** de intervalo em relação ao seu último turno e ao próximo, e com início a pelo menos **4h** da publicação. Ex.: escalado na Noite do dia 12 e de folga no 13 — no dia 13 só a Noite pode caber no intervalo; se a publicação for perto demais do início da Manhã/Tarde, esses turnos também somem. Se nenhum turno atender às duas regras, o dia não pode ser ofertado.",
      },
      {
        subtitulo: "Não consigo aceitar uma oferta?",
        texto:
          "O aceite só é permitido entre prestadores do **mesmo time** do Organograma — ou, na **Liderança**, entre Shift Leader e Service Manager — nunca na própria oferta. Dá para enviar proposta **no mesmo dia**, com pelo menos **2h até o início do turno** e a escala do mês **aprovada** (a de cada participante). Publicar exige **4h**. Em Venda de Turno e Oferta de Troca você precisa estar **de folga** no dia ofertado; em Venda de Folga precisa estar **escalado no mesmo turno**. Para propor uma troca, o campo **Dia que você oferece em troca** lista somente seus dias escalados, livres de outra negociação e compatíveis com o intervalo mínimo de **12h**. Em todos os tipos a proposta fica **Em análise** até quem publicou aprovar. Quem enviou a proposta pode **desistir** nesse intervalo. Se a oferta já passou da janela de 2h ou a data é antiga, ela é cancelada automaticamente.",
      },
      {
        subtitulo: "Só vejo ofertas do meu time?",
        texto:
          "Com permissão de **Ver: Próprios**, a lista mostra apenas o seu grupo de negociação e a aba **Minhas Ofertas**. Com **Ver: Sim**, a aba padrão é **Ofertas Encerradas** (aceitas e canceladas de todos os prestadores) e o filtro de times fica disponível. Para ver o mural do **seu** grupo e as **suas** ofertas (e aprovar uma compra), use **Minhas Negociações** ao lado do Histórico — em **Todas as Ofertas** o mural passa a ser só do seu time sem mudar de aba; a aba **Minhas Ofertas** reaparece para você abrir quando quiser. Para alternar o escopo de gestão, ajuste a permissão de **Ver** na linha Marketplace em Gestão de Usuários → Permissões (após alterar, faça logout e login).",
      },
      {
        subtitulo: "Não vejo a aba Minhas Ofertas?",
        texto:
          "Com **Ver: Sim**, a segunda aba é **Ofertas Encerradas** (visão de gestão). Se o seu login também é prestador de estúdio, ligue **Minhas Negociações** ao lado do Histórico: Encerradas some e voltam **Todas as Ofertas** (só o seu grupo) e **Minhas Ofertas**. Em **Todas as Ofertas**, o botão só filtra o mural — não muda de aba; a partir de **Ofertas Spin**, leva a **Minhas Ofertas**. Sem cadastro de prestador ligado ao login, o botão não aparece.",
      },
      {
        subtitulo: "Marquei vários dias e só parte das ofertas foi publicada?",
        texto:
          "Cada dia marcado em **Venda de Turno** ou **Venda de Folga** gera uma oferta separada, validada de forma independente. Se um dia não puder ser publicado (já tem oferta aberta, entrou em outra negociação, deixou de cumprir as 4h ou as 12h), os demais continuam publicados: o mural é atualizado, o modal permanece aberto apenas com os dias que falharam e a mensagem explica o motivo. Ajuste ou desmarque esses dias e publique novamente.",
      },
      {
        subtitulo: "O filtro de dia não mostra a data que eu quero?",
        texto:
          "O filtro (**Todos os Dias**) lista somente dias com oferta **em aberto** dentro do período e dos demais filtros ativos. Se a data não aparecer, verifique o mês do carrossel (ou ative **Histórico**), limpe o filtro de tipo de ação, o filtro de times e a busca. A seleção é limpa automaticamente quando o dia deixa de ter oferta — por exemplo, após alguém aceitar a última oferta daquele dia.",
      },
      {
        subtitulo: "Aceitei uma oferta e a escala não mudou?",
        texto:
          "Enviar a proposta **não** altera a escala: o status fica **Em análise** e quem publicou precisa **aprovar** em **Minhas ofertas abertas** (com **Ver: Sim**, ligue **Minhas Negociações**). Recusar ou desistir devolve a oferta ao mural, também sem mudar a escala. Se a aprovação já ocorreu, recarregue a Escala Estúdio ou o Calendário. Se continuar divergente, entre em contato com o suporte.",
      },
    ],
  },
  escala_controle_turno: {
    titulo: "Controle de Turno",
    blocos: [
      {
        subtitulo: "Não vejo Controle de Turno no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários → Permissões → linha **Controle de Turno**. A página nasce bloqueada para todos os perfis exceto Administrador. Após liberar, faça logout e login (ou atualize a sessão).",
      },
      {
        subtitulo: "O pool da Rotação está vazio no Controle de Turno?",
        texto:
          "A aba **Rotação** usa os Game Presenters da **Escala Estúdio** **aprovada** no dia, turno e estúdio selecionados, com **Chegou** / **Não chegou** do check-in do Calendário. Sem aprovação do mês ou sem GPs naquele turno, o pool fica vazio.",
      },
      {
        subtitulo: "Não consigo salvar Notificações ou o Relatório?",
        texto:
          "As abas **Notificações** e **Relatório de Turno** gravam no banco. Confirme permissão de **Criar** / **Editar** em Gestão de Usuários → Permissões → **Controle de Turno** e faça logout e login. Se o erro persistir, entre em contato com o suporte técnico para validar se o schema do Controle de Turno foi aplicado.",
      },
    ],
  },
  escala_rotacao: {
    titulo: "Rotação",
    blocos: [
      {
        subtitulo: "Não vejo Rotação no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários → Permissões → linha **Rotação**. A página nasce bloqueada para todos os perfis exceto Administrador. Após liberar, faça logout e login (ou atualize a sessão).",
      },
      {
        subtitulo: "Pool vazio ou sem escala aprovada?",
        texto:
          "A rotação usa Game Presenters com célula de trabalho (Manhã/Tarde/Noite) na **Escala Estúdio** **aprovada** do dia e estúdio efetivo (Staff ou override na própria Rotação). O pool segue o **valor da célula do dia**. Sem aprovação ou sem GPs naquele turno/dia, o pool fica vazio. Se a escala do dia está aprovada e o pool continua vazio, entre em contato com o suporte técnico.",
      },
      {
        subtitulo: "Não consigo publicar a rotação?",
        texto:
          "É necessária permissão de **Criar**. Selecione um estúdio (não «Todos Estúdios»), gere a prévia com gente suficiente para cobrir as mesas e use **Publicar**. A publicação anterior do mesmo dia/turno/estúdio é arquivada automaticamente.",
      },
      {
        subtitulo: "A prévia mostra mesas a menos ou dois GPs na mesma mesa?",
        texto:
          "A sugestão deve: cobrir **todas** as mesas do estúdio; colocar só **uma** pessoa por mesa; **não** repetir a mesma mesa no horário seguinte; limitar o GP a **no máximo 2h** contínuas em mesa antes do Break (4 slots de 30 min ou 6 de 20 min); usar o **Shift Lead** só como reserva. Se a cobertura falhar, use **Aviso — intervalo 20 min** ou **Aviso — incluir Shift Lead**. Clique de novo em **Gerar prévia** após atualizar a página.",
      },
      {
        subtitulo: "Chegou no meio do turno — como incluir?",
        texto:
          "Não recalcule slots já passados. Com check-in (**Chegou**) use **Incluir na rotação**: a grade redistribui só a partir do **próximo slot**. Se ainda faltar cobertura, use os botões de **Aviso** (20 min ou Shift Lead).",
      },
      {
        subtitulo: "Mover entre estúdios não funciona?",
        texto:
          "O move é **só na Rotação** (turno inteiro) e exige o SQL de alocação (`escala_rotacao_cockpit.sql`). Não altera Gestão de Staff nem a Escala Estúdio. Não é permitido o mesmo GP em dois estúdios no mesmo turno.",
      },
    ],
  },
  escala_solicitacoes: {
    titulo: "Solicitações",
    blocos: [
      {
        subtitulo: "Confundi com Solicitações do RH?",
        texto:
          "A seção **Escala → Solicitações** trata pedidos operacionais de escala (trocas, coberturas). A seção **RH → Solicitações** trata atestados, reuniões com RH e vagas — são páginas distintas no menu.",
      },
    ],
  },
  rh_funcionarios: {
    titulo: "Gestão de Prestadores",
    blocos: [
      {
        subtitulo: "Não vejo Gestão de Prestadores no menu?",
        texto:
          "Confirme permissão de **Ver** e a liberação da página nas abas de escopo (Gestores / Prestadores / Operadora) em Gestão de Usuários.",
      },
      {
        subtitulo: "Um prestador não aparece na lista?",
        texto:
          "O filtro de **Status** entra com os prestadores disponíveis (ativos e indisponíveis) — quem já saiu só aparece ao selecionar **Encerrado**. Confira também os filtros de Diretoria, Gerência, Setor e Contrato e limpe a busca por nome, CPF ou e-mail.",
      },
      {
        subtitulo: "A coluna Remuneração aparece vazia?",
        texto:
          "Os valores da coluna ficam ocultos por padrão — use o ícone de olho no cabeçalho para exibir ou ocultar. Se a coluna não aparece, o perfil não tem permissão de **Ver** os dados financeiros nesta página. Alterar valores exige permissão de **Editar**.",
      },
      {
        subtitulo: "Não vejo as abas Documentos, Carreira ou Acesso a Plataforma no modal?",
        texto:
          "Documentos e Acesso a Plataforma aparecem no modal **Ver** e **Editar**. **Carreira** só aparece no modal **Ver**. A aba **Dados da empresa** aparece apenas quando o contrato do prestador é **PJ**. Enviar ou excluir documentos no Editar fica pendente até clicar em **Salvar**.",
      },
      {
        subtitulo: "Os botões Novo Prestador ou RH Talks não aparecem?",
        texto:
          "**Novo Prestador** exige permissão de **Criar** e Ver os dados do cadastro, e só é exibido na aba **Head Count**. **RH Talks** aparece na aba **Anotações RH** para perfis com permissão de **Editar**.",
      },
      {
        subtitulo: "O cadastro salvou, mas o login na plataforma não atualizou?",
        texto:
          "O cadastro e o acesso são gravados em etapas. Se a sincronização falhar, a página avisa e o modal permanece aberto para tentar de novo. Confira e-mail Spin ou e-mail pessoal e o organograma. Se o problema persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "A mensagem pede para recarregar porque outra pessoa alterou o cadastro?",
        texto:
          "Alguém salvou o mesmo prestador enquanto o modal estava aberto. Feche, abra de novo e aplique as alterações sobre a versão atual.",
      },
      {
        subtitulo: "Ao salvar Novo Prestador aparece «Não foi possível salvar»?",
        texto:
          "Se a mensagem for genérica (sem listar pendências de campos), o cadastro chegou ao servidor e falhou na gravação. Confira se o **CPF** já existe em outro prestador e se o **organograma** ainda está ativo. Com o formulário completo (dados pessoais + contratação) e sem CPF duplicado, o suporte precisa aplicar a correção da função de salvar no banco. Se aparecer aviso de pendências com campos destacados, complete as abas indicadas antes de salvar de novo.",
      },
    ],
  },
  rh_organograma: {
    titulo: "Organograma",
    blocos: [
      {
        subtitulo: "Não consigo editar diretorias ou times?",
        texto:
          "O modo Gerenciamento e ações de cadastro exigem permissão de **Editar** (e **Criar** para novos registros). Com apenas **Ver**, a página abre em visualização.",
      },
    ],
  },
  rh_vagas: {
    titulo: "Vagas",
    blocos: [
      {
        subtitulo: "Não consigo publicar ou mover candidato?",
        texto:
          "Publicar vaga exige **Criar**; alterar etapa ou status do candidato exige **Editar**. Confirme a matriz em Gestão de Usuários → Permissões.",
      },
      {
        subtitulo: "Onde fica o link para compartilhar a vaga?",
        texto:
          "Em vagas **Externas** na aba **Abertas**, o botão **Compartilhar** abre o modal com o link da página de Carreiras. Use **Copiar** e envie ao candidato. Vagas internas não têm compartilhamento para o site.",
      },
    ],
  },
  rh_solicitacoes: {
    titulo: "Solicitações",
    blocos: [
      {
        subtitulo: "Atestado do Calendário não aparece aqui?",
        texto:
          "Justificativas **Médico** registradas no Calendário criam solicitação **Atestado** com status **Em análise**. Use o filtro **Tipo de solicitação** e o carrossel **Em análise**. Aguarde alguns segundos e recarregue se acabou de salvar no Calendário.",
      },
      {
        subtitulo: "Não consigo atender solicitação?",
        texto:
          "O ícone **Atender** exige permissão de **Editar** nesta página (RH). Sem Editar, use apenas **Ver**.",
      },
    ],
  },
  cs_atendimento: {
    titulo: "Atendimento",
    blocos: [
      {
        subtitulo: "Lista vazia?",
        texto:
          "Na aba **Site Spin**, os chamados entram pelo formulário do site institucional. Na aba **E-mail**, vêm da caixa **contato@spingaming.com.br**, com leitura automática a cada poucos minutos. Um chamado recém-enviado pode levar alguns minutos para aparecer — atualize a página antes de concluir que está faltando. Se a lista continuar vazia com chamados confirmados na origem, entre em contato com o suporte técnico.",
      },
      {
        subtitulo: "Não consigo atender chamado?",
        texto:
          "O ícone **Atender** exige permissão de **Editar** em Atendimento (Gestão de Usuários). Chamados novos ficam sem atendente até alguém alterar o status; quem altera passa a ser o **Atendente** na lista. Ao alterar o status, informe uma anotação no modal.",
      },
    ],
  },
  rh_central_denuncias: {
    titulo: "Central de Denúncias",
    blocos: [
      {
        subtitulo: "Não vejo Central de Denúncias no menu?",
        texto:
          "Confirme permissão de **Ver** em Gestão de Usuários. O canal público de denúncias (sem login) é distinto — protocolos internos são tratados nesta página logada. O endereço público é **/canal-denuncias-spin** no mesmo domínio da plataforma; encaminhe esse link a terceiros que precisem relatar sem acessar o menu.",
      },
      {
        subtitulo: "O relator diz que não vê minhas anotações na consulta pública?",
        texto:
          "Na aba **Anotações** do atendimento, confira se a mensagem não foi marcada como **Somente interno**. Notas internas não aparecem na consulta por protocolo. Respostas do relator entram na mesma thread com o selo Relator — atualize o modal ou recarregue a lista se a mensagem ainda não aparecer.",
      },
    ],
  },
  gestao_links: {
    titulo: "Gestão de Links",
    blocos: [
      {
        subtitulo: "Um link mapeado não aparece nos dashboards?",
        texto:
          "Após o mapeamento, a sincronização histórica ocorre automaticamente mas pode levar alguns minutos. Novos dados chegam diariamente até as 4h. Se após 24h o link ainda não reflete nos dashboards, verifique: (1) o link foi mapeado para o influencer, afiliado ou campanha corretos? Na aba Mapeados, a coluna Proprietário confirma a associação. (2) O perfil associado está ativo e presente no dashboard? Perfis cancelados podem não aparecer nos relatórios.",
      },
      {
        subtitulo: "O botão Mapear não aparece na aba Pendentes?",
        texto:
          "O botão Mapear requer permissão de edição na Gestão de Links. Se não aparece, seu perfil não tem essa permissão. Entre em contato com o gestor para solicitar acesso.",
      },
      {
        subtitulo: "O modal Mapear não mostra influencers ou afiliados?",
        texto:
          "As listas são formadas pelos usuários cadastrados com os perfis **Influencer** e **Afiliado**. Aguarde o término de **Carregando…**. Se aparecer **Membros indisponíveis**, recarregue a página; se o problema persistir, entre em contato com o suporte. Quando a permissão de Editar estiver limitada a **Próprios**, somente membros dentro do seu escopo aparecem.",
      },
      {
        subtitulo: "Quero remapear um link que já foi mapeado incorretamente?",
        texto:
          "Na aba Mapeados, clique em Reabrir na linha correspondente. O link volta para Pendentes e pode ser mapeado novamente para o influencer, afiliado ou campanha corretos.",
      },
      {
        subtitulo: "Como saber se o link pendente veio da TAP Influencers ou da TAP Afiliados?",
        texto:
          "Na aba Pendentes, use a coluna **Origem**: **TAP Influencers** ou **TAP Afiliados**. Se aparecer traço (—), o registro é anterior à coluna de origem — rode o sync CDA das duas contas em Status Técnico (após aplicar a atualização do banco) para preencher a origem nos próximos ciclos.",
      },
      {
        subtitulo: "Um UTM Source tem dados históricos mas mostra R$ 0,00 em GGR?",
        texto:
          "O GGR mostrado é calculado como Depósitos menos Saques. Se ambos são zero, pode significar que: (1) a operadora ainda não sincronizou os dados para esse UTM — aguarde a rotina diária das 4h; (2) o UTM foi detectado recentemente e não há transações registradas ainda.",
      },
      {
        subtitulo: "Há links que não quero mapear mas também não quero que apareçam como pendentes?",
        texto:
          "Use o botão Ignorar na aba Pendentes. O link vai para a aba Ignorados e não conta no indicador de pendentes. Se mudar de ideia, use Reabrir na aba Ignorados para devolvê-lo aos Pendentes.",
      },
    ],
  },
  configuracoes: {
    titulo: "Configurações",
    blocos: [
      {
        subtitulo: "Não encontro Configurações no menu lateral?",
        texto:
          "Comportamento esperado: Configurações fica no menu do avatar (canto superior), não no menu lateral. Confirme também a permissão de **Ver** para Configurações em Gestão de Usuários.",
      },
      {
        subtitulo: "Não consigo mudar o tema (claro/escuro)?",
        texto:
          "Perfis Operador usam sempre o modo escuro com a identidade da operadora — o seletor de aparência não aparece. Nos demais perfis, use os botões de tema na seção Aparência.",
      },
      {
        subtitulo: "Erro ao alterar a senha?",
        texto:
          "Confirme a senha atual e que a nova senha atende aos requisitos (8+ caracteres, maiúsculas e minúsculas, número e caractere especial) e é diferente da atual. Na tela de primeiro acesso, o botão **Definir nova senha** só habilita quando todos os requisitos estão marcados e as duas senhas coincidem. Se a sessão estiver inválida, saia e entre novamente. Se o problema persistir, entre em contato com o suporte.",
      },
    ],
  },
  simulador_login: {
    titulo: "Simulador de Login",
    blocos: [
      {
        subtitulo: "Não vejo o Simulador de Login no menu do avatar?",
        texto:
          "É necessário permissão de **Ver** em Simulador de Login (Gestão de Usuários). O atalho não aparece no menu lateral — só no menu do avatar, entre Configurações e Ajuda.",
      },
      {
        subtitulo: "A lista de perfis está vazia?",
        texto:
          "Nenhum perfil simulável foi liberado para o seu perfil viewer. Peça ao administrador para marcar as opções em **Gestão de Usuários → Simulador de Login**. Administradores veem o catálogo completo sem essa matriz.",
      },
      {
        subtitulo: "Não aparece nenhum usuário ativo?",
        texto:
          "A simulação só lista contas **ativas** daquele perfil no momento (quem está desativado não entra). No Operador, o usuário também precisa ter a operadora escolhida no escopo; no Prestador, a área escolhida. Se a equipe rotacionou, escolha outro usuário da lista — ela é atualizada a cada abertura do modal.",
      },
      {
        subtitulo: "Não consigo criar ou editar nada durante a simulação?",
        texto:
          "Comportamento esperado: a simulação é somente leitura. Encerrar a visualização restaura as permissões da sua conta real.",
      },
      {
        subtitulo: "O menu simulado não mostra páginas que o perfil deveria ter?",
        texto:
          "O menu combina a matriz de permissões do perfil simulado com o escopo (operadora ou área). Confirme a operadora/área escolhida no modal e as marcações em Gestão de Usuários (Permissões e abas de escopo). Algumas páginas de plataforma ficam ocultas de propósito na simulação.",
      },
      {
        subtitulo: "No Calendário ainda vejo Relatório de Presença e filtros de Time/Staff?",
        texto:
          "Comportamento esperado só para perfis com permissão de Editar Sim ou Ver Sim no Calendário. Ao simular um Game Presenter (ou outro perfil com Ver Próprios), a página deve mostrar só Compromissos e Controle de Presença daquela pessoa, sem Relatório nem filtros de gestão. Encerrar a visualização e iniciar de novo. Se continuar com a visão de administrador, recarregue a página; se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Na Galeria de Fotos ainda vejo fotos de outros colaboradores?",
        texto:
          "Na aba **Gerais** as fotos de evento são compartilhadas — isso é esperado. Em **Minhas Fotos**, a simulação deve mostrar só o colaborador da pessoa escolhida. Recarregue a página com a visualização ativa. Se persistir, entre em contato com o suporte.",
      },
      {
        subtitulo: "Como sair da simulação?",
        texto:
          "Clique em **Encerrar visualização** na faixa amarela no topo da plataforma ou no bloco correspondente na página Simulador de Login. Se a faixa não sumir, recarregue a página. Se o problema persistir, entre em contato com o suporte.",
      },
    ],
  },
};
