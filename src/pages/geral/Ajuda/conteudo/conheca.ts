export const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        texto:
          "O dashboard de Streamers consolida a performance do canal de influencers em três dimensões: visão executiva (financeiro e operação), análise de conversão e ranking financeiro. Todas as abas compartilham os mesmos filtros de período, influencer e operadora.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de 13 competências mensais — a atual e as 12 anteriores — permitindo comparar futuramente a competência atual com a mesma competência do ano anterior. Nesse modo a navegação de mês fica desativada e os subtítulos dos blocos principais passam a mostrar \"acumulado\" (o comparativo MoM do mês anterior deixa de aparecer nos KPIs Executivos).\n\nO filtro de influencer restringe todas as abas ao influencer selecionado. O filtro de operadora restringe aos influencers vinculados àquela plataforma. Ambos os filtros são aplicados simultaneamente em todas as abas ao trocar de aba.\n\nEnquanto uma aba carrega dados, a barra de filtros pode exibir \"Carregando…\" — os filtros permanecem os mesmos ao mudar entre Overview, Conversão e Financeiro.\n\nCom o foco em uma aba, use as setas ← → do teclado para alternar entre Overview, Conversão e Financeiro (padrão de acessibilidade com role=\"tablist\").",
      },
      {
        subtitulo: "Aba Overview — KPIs e Ranking",
        texto:
          "Apresenta os KPIs executivos agrupados em três blocos: Financeiro (GGR, Investimento, ROI), Operação (Lives, Horas Realizadas, Influencers Ativos, Depósitos) e Conversão (Registros, Custo por Registro, FTDs, Custo por FTD).\n\nO Funil de Conversão exibe as taxas de conversão do canal: de Views até FTDs.\n\nO Ranking de Influencers lista todos os influencers com dados no período com status de performance (Rentável, Atenção, Não Rentável, Bônus, Sem dados). Use os badges de status no canto superior direito para filtrar por categoria. Clique nos cabeçalhos das colunas para ordenar.",
      },
      {
        subtitulo: "Aba Conversão — Funil e Eficiência",
        texto:
          "Apresenta três blocos (com subtítulo \"acumulado\" no modo Histórico):\n\n— Comparativo de Funil: escolha dois influencers nos seletores acima para comparar seus funis de conversão lado a lado (Views → Acessos → Registros → FTDs). Os seletores listam apenas influencers com dados no período.\n\n— Ranking FTD/Hora: pódio dos três primeiros influencers em FTDs gerados por hora de live, seguido de lista paginada dos demais. Influencers sem horas registradas no período são omitidos.\n\n— Comparativo de Taxas: tabela com as taxas de conversão de cada etapa do funil por influencer. Use os badges de ação no canto superior direito para filtrar influencers por prioridade de melhoria (Divulgar o link, Converter visita, Ativar cadastro, Em dia).",
      },
      {
        subtitulo: "Aba Financeiro — PVI e Ranking",
        texto:
          "Apresenta os KPIs financeiros detalhados: FTD (valor total e ticket médio), Depósitos, Saques, WD Ratio, GGR por Jogador e PVI (Player Value Index, escala 0–100 pts — exibido em pontos, não em percentual).\n\nO gráfico de Investimento por Influencer exibe a distribuição proporcional do investimento pago. Investimentos via agentes são agrupados em 'Outros' quando aplicável.\n\nO Ranking Financeiro lista todos os influencers com métricas financeiras e perfil de jogador (Whales, Core, Recreativos, Caçadores de Bônus). Clique nos cabeçalhos para ordenar por qualquer coluna. No modo Histórico, KPIs Financeiros, Investimento e Ranking usam o subtítulo \"acumulado\".",
      },
    ],
  },
  mesas_spin: {
    titulo: "Overview Spin",
    blocos: [
      {
        texto:
          "O Overview Spin reúne os resultados financeiros e operacionais das mesas ao vivo por operadora — Baccarat, Roleta, Blackjack e Futebol Brasileiro. A página pode ter até quatro abas: **Overview** (soma Dedicado + Network), **Estúdio Dedicado**, **Estúdio Network** e **Posicionamento** (visibilidade no lobby). A aba Overview só aparece quando o seu escopo tem mesas nos dois tipos de estúdio; se a operadora opera só em Network (ou só em Dedicado), essa aba fica oculta.",
      },
      {
        subtitulo: "Abas Estúdio Dedicado e Estúdio Network",
        texto:
          "Estúdio Dedicado mostra só as mesas de estúdios dedicados; Estúdio Network só as de estúdios network (ex.: Sports Club), sempre pela fatia da operadora parceira.\n\nAs abas Dedicado e Network aparecem conforme os **estúdios vinculados** à operadora em Gestão de Estúdios (tipo dedicado ou network). Quem tem permissão de Ver **Sim** vê o filtro completo de operadoras elegíveis; com Ver **Próprios**, o filtro fica travado no escopo. Administrador vê tudo.\n\nSe só um canal existir no escopo, a aba Overview (soma) não aparece — restam o canal disponível e Posicionamento.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas laterais para navegar entre o mês atual e os dois meses anteriores. O botão Histórico exibe 13 competências mensais — a atual e as 12 anteriores — em vez de um mês específico. Nesse modo, a navegação de mês fica desativada. O Histórico permanece se você for à aba Posicionamento e voltar.\n\nQuando disponível, o seletor de operadora permite filtrar os dados por operadora. Em Estúdio Dedicado / Estúdio Network a lista contém apenas operadoras com mesas daquele tipo. Com **Todas Operadoras**, os valores financeiros são somados entre operadoras visíveis; Comparativo de mesa e Dados por mesa pedem que você selecione uma operadora.",
      },
      {
        subtitulo: "KPIs Consolidados",
        texto:
          "Apresenta os principais indicadores do período: GGR (receita bruta), Turnover (volume apostado), Margem (GGR ÷ Turnover), Apostas (quantidade de rodadas), Aposta Média, UAP (jogadores ativos únicos) e ARPU (GGR do período ÷ UAP mensal).\n\nNa aba Overview, GGR, Turnover e Apostas somam Dedicado e Network. O UAP consolidado é a soma dos UAP de cada canal (não elimina jogadores que jogaram nos dois). Em Dedicado e Network, os mesmos KPIs leem só o canal correspondente — a estrutura do bloco e a regra de comparação são iguais nas três abas.\n\nGGR, Turnover, Margem, Apostas e Aposta média comparam o mês corrente até D-1 com o mesmo recorte do mês anterior. UAP e ARPU comparam com o **mês anterior completo** (resumo mensal). Se não houver comparativo, ou se o valor anterior for quase inexistente, a variação não aparece. No modo Histórico, a comparação MoM é ocultada e o subtítulo do bloco passa a \"acumulado\".",
      },
      {
        subtitulo: "Detalhamento Diário / Mensal",
        texto:
          "Tabela com uma linha por dia no mês selecionado (subtítulo \"dia a dia\") ou por mês no modo Histórico (subtítulo \"mês a mês\"). No modo **Todas Operadoras**, cada linha pode ser expandida clicando na seta à esquerda da data para ver o desdobramento por plataforma.\n\nAlterne para o modo Gráfico usando o botão no canto superior direito da seção. No gráfico, escolha o KPI a ser exibido pelas opções acima do gráfico.",
      },
      {
        subtitulo: "Comparativo de Jogo",
        texto:
          "Tabela com os resultados separados por tipo de jogo — Blackjack (verde), Roleta (ouro), Baccarat (azul) e Futebol Brasileiro (laranja). Selecione quais KPIs exibir pelos botões 'KPIs visíveis'. O percentual abaixo de cada valor indica a participação daquele jogo no total do período (coluna Total alinhada ao resumo diário oficial).\n\nNo mês corrente, a evolução é dia a dia; no Histórico, o subtítulo da seção é \"mês a mês\" e cada linha representa um mês. Alterne para o modo Gráfico para visualizar a evolução temporal de um único KPI por jogo.",
      },
      {
        subtitulo: "Comparativo de Mesa (Blackjack)",
        texto:
          "Disponível nas abas Overview e Estúdio Dedicado. Com **Todas Operadoras**, o bloco pede para selecionar uma operadora. Com uma operadora escolhida, compare duas mesas de Blackjack lado a lado pelos seletores A e B.\n\nNa aba Estúdio Network o bloco não aparece — o inventário network não tem par de mesas Blackjack para comparar.",
      },
      {
        subtitulo: "Dados por Mesa",
        texto:
          "Exibe o desempenho diário (ou mensal no Histórico) das mesas em painéis paralelos. Com **Todas Operadoras**, o bloco pede para selecionar uma operadora. Nas abas Overview e Estúdio Dedicado: Speed Baccarat e Roleta na primeira linha; Futebol Brasileiro abaixo quando aplicável.\n\nNa aba Estúdio Network a ordem é Blackjack e Roleta na primeira linha, e Speed Baccarat e Futebol Brasileiro na segunda.",
      },
      {
        subtitulo: "Aba Posicionamento",
        texto:
          "Monitora a posição das mesas Spin no lobby das plataformas parceiras. A navegação por mês e o botão Histórico da barra não se aplicam nesta aba.\n\nSe ainda não houver coleta no dia de hoje, a aba mostra o **último horário** válido (em geral ontem) e os KPIs comparam **vs último horário**, em vez de vs ontem no mesmo horário.\n\nCom **Todas Operadoras**, cada card (Blaze, Casa de Apostas, Esportiva Bet, Jonbet) é uma mini-tabela com colunas Atual (posição com cores), Estúdio, Mesa e Anterior (última posição diferente nos últimos 7 dias). O bloco **Alertas do período** lista todas as mudanças de posição dia a dia nessa janela de 7 dias, por operadora.\n\nCom uma operadora específica: os KPIs mostram Visibilidade na vitrine (% das mesas no top 20 do lobby), Mesas no top 10, Melhor posição registrada no dia e Maior queda de posição. A lista 'Posição atual das mesas' exibe a posição de cada mesa no último snapshot, com indicador de melhora (↑) ou piora (↓). O rótulo usa Estúdio - Mesa.\n\n'Concorrentes à frente' mostra, por tipo de jogo Spin, quantos jogos de outras plataformas estão à frente (máximo entre as mesas daquele tipo). O hover lista esses jogos.\n\n'Ranking de concorrentes' lista esses mesmos jogos únicos (posição e provedor), alinhado ao bloco Concorrentes à frente.\n\nO Histórico de Posicionamento (operadora específica) exibe um heatmap das posições nos últimos dias — use os botões Dia / 7 dias / 30 dias para controlar o período.",
      },
      {
        subtitulo: "Navegação entre abas",
        texto:
          "As abas compartilham a FilterBar de mês/operadora nas seções financeiras. Com o foco em uma aba, use ← → do teclado para alternar entre as abas visíveis (padrão tablist).",
      },
    ],
  },
  dash_afiliados: {
    titulo: "Afiliados",
    blocos: [
      {
        texto:
          "O dashboard de Afiliados consolida a performance do canal de afiliados em três dimensões: visão executiva (financeiro e conversão), análise de conversão e ranking financeiro. Todas as abas compartilham os mesmos filtros de período, afiliado e operadora. As métricas vêm da integração TAP CDA — conta Afiliados, considerando apenas os perfis cadastrados como afiliado.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de 13 competências mensais — a atual e as 12 anteriores.\n\nO filtro de afiliado restringe todas as abas ao afiliado selecionado. O filtro de operadora restringe aos afiliados vinculados àquela plataforma.\n\nCom o foco em uma aba, use as setas ← → do teclado para alternar entre Overview, Conversão e Financeiro.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "Apresenta os KPIs executivos em Financeiro (GGR, Investimento, ROI) e Conversão (Registros, Custo por Registro, FTDs, Custo por FTD) — sem o bloco de Operação de lives.\n\nO Funil de Conversão usa três etapas: Acessos → Registros → FTDs (sem Views).\n\nO Ranking de Afiliados lista Afiliado, Acessos, Registros, FTDs, GGR, Investimento e Performance.",
      },
      {
        subtitulo: "Aba Conversão",
        texto:
          "Comparativo de Funil lado a lado (sem Views) e Comparativo de Taxas com colunas Afiliado, Acessos, Acesso→Reg, Registros, Reg→FTD, FTD e Ação. O bloco Ranking FTD/Hora não se aplica a este canal.",
      },
      {
        subtitulo: "Aba Financeiro",
        texto:
          "KPIs Financeiros (FTD, Depósitos, Saques, WD Ratio, GGR por Jogador, PVI), Investimento por Afiliado e Ranking Financeiro com coluna Afiliado e perfis de jogador (Whales, Core, Recreativos, Caçadores de Bônus).",
      },
    ],
  },
  dash_midias_sociais: {
    titulo: "Mídias Sociais",
    blocos: [
      {
        texto:
          "O dashboard de Mídias Sociais consolida o desempenho orgânico dos canais da Spin Gaming (Instagram, Facebook, YouTube), o impulsionamento pago via Meta Ads e os resultados de conversão das campanhas com UTMs mapeadas. Está dividido em quatro abas: Overview, Conversão, Impulsionamento e Alcance.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis desde Janeiro de 2026, quando os dados de mídias sociais passaram a ser registrados. O botão Histórico exibe 13 competências mensais — a atual e as 12 anteriores.\n\nO filtro Operadoras aparece nas abas Overview e Conversão (quando visível para o seu perfil): KPIs, funis e tabelas mostram apenas campanhas da operadora selecionada, conforme cadastro em Marketing → Campanhas. Perfil operador vê automaticamente só a própria operadora, sem dropdown. Nas abas Impulsionamento e Alcance o filtro não é exibido — impulsionamento Meta e alcance orgânico são sempre globais (páginas Spin).\n\nAs quatro abas compartilham o mesmo período. Com o foco em uma aba, use ← → do teclado para alternar (tablist).",
      },
      {
        subtitulo: "Aba Overview — Conversão por Campanha",
        texto:
          "Apresenta três blocos (KPIs e comparativos com subtítulo \"acumulado\" no modo Histórico):\n\n— KPIs Consolidados: GGR, Registros e GGR por Jogador gerados pelas campanhas com UTMs mapeadas, com comparativo ao mesmo período do mês anterior quando não está em Histórico.\n\n— Detalhamento: tabela com os totais por dia (ou por mês no Histórico) de visitas, registros, FTDs e volume financeiro.\n\n— Comparativo de campanha: tabela com a performance de cada campanha individualmente. Clique nos cabeçalhos para ordenar. O GGR é calculado como Depósitos menos Saques.\n\nCampanhas **inativas** no cadastro: no mês selecionado no carrossel, só aparecem se geraram métricas naquele período; com **Histórico** ativo, aparecem sempre. Os totais do funil incluem UTMs mapeadas a campanhas ativas e inativas.",
      },
      {
        subtitulo: "Aba Conversão — Funis de Campanha",
        texto:
          "Apresenta o funil consolidado de todas as campanhas (Visitas → Registros → FTDs) e um comparativo lado a lado entre duas campanhas selecionadas nos menus acima. Funil e blocos de campanhas usam subtítulo \"acumulado\" no Histórico.\n\nA tabela de Comparativo de Taxas lista a taxa de conversão Visita→Registro, Registro→FTD e Visita→FTD por campanha. Ordene pelas colunas para identificar as campanhas com melhor ou pior conversão em cada etapa.",
      },
      {
        subtitulo: "Aba Impulsionamento — Mídia paga Meta",
        texto:
          "Apresenta KPIs de anúncios impulsionados na conta Meta da Spin (Instagram e Facebook): posts impulsionados, investimento, interações, alcance e impressões pagas, CPM (custo por mil impressões) e custo por interação.\n\nA tabela Detalhamento por anúncio lista cada campanha com investimento, impressões, interações e cliques no período. Sem filtro de operadora — dados globais da conta de anúncios.",
      },
      {
        subtitulo: "Aba Alcance — Orgânico por Canal",
        texto:
          "Apresenta quatro KPIs de alcance orgânico (Postagens, Novos Seguidores, Impressões Totais, Engajamento Médio) com comparativo ao mês anterior (ou subtítulo \"acumulado\" no Histórico).\n\nOs cards por canal (Instagram, Facebook, YouTube) detalham as métricas individuais de cada plataforma — seguidores, alcance, impressões, engajamento e taxa de engajamento.\n\nEngajamento por formato mostra a distribuição das postagens por tipo (Reels, Foto, Vídeo, Carrossel, etc.).\n\nPostagens recentes exibe o carrossel com até cinco publicações visíveis por vez no período — use as setas ou a paginação (ex.: \"1–5 / 12\") para percorrer o restante. Clique no título da postagem para abrir o link original na plataforma.",
      },
    ],
  },
  dash_overview_influencer: {
    titulo: "Overview Influencer",
    blocos: [
      {
        texto:
          "O Overview Influencer oferece uma visão executiva da performance do canal de influencers — consolidando KPIs financeiros, operacionais e de conversão em uma única página sem abas. É a visão de referência para influencers, agências e gestores que precisam de um resumo rápido do período.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de 13 competências mensais — a atual e as 12 anteriores.\n\nO filtro de influencer restringe a visão a um único influencer — quando selecionado, todos os blocos refletem apenas os dados daquele influencer.\n\nO filtro de operadora restringe aos dados de uma plataforma específica.\n\nSe um influencer selecionado não tiver dados no novo período após trocar de mês, o filtro é removido automaticamente e uma notificação amarela é exibida no topo.",
      },
      {
        subtitulo: "KPIs Executivos",
        texto:
          "O bloco de KPIs está organizado em três linhas:\n\n— Linha 1 (Financeiro): GGR, Investimento e ROI — com comparativo ao mesmo período do mês anterior (ou subtítulo \"acumulado\" no Histórico, sem MoM).\n\n— Linha 2 (Operação): Lives, Horas Realizadas e Média de Views — métricas de produção do canal.\n\n— Linha 3 (Conversão): Registros (com total de acessos e taxa de conversão), FTDs (com valor total), Depósitos e Saques — com comparativo MoM quando não está em Histórico.",
      },
      {
        subtitulo: "Funil de Conversão",
        texto:
          "Exibe a taxa de conversão em cada etapa do funil: Views → Acessos → Registros → FTDs. As taxas laterais mostram as conversões intermediárias e a conversão direta View→FTD. No Histórico, o subtítulo da seção é \"acumulado\".",
      },
      {
        subtitulo: "Eficiência",
        texto:
          "Apresenta cinco métricas de eficiência calculadas a partir dos totais do período: FTD/Hora (FTDs gerados por hora de live), Ticket Médio de FTD, Ticket Médio de Depósito, Ticket Médio de Saque e GGR por Jogador (GGR ÷ FTDs). No Histórico, o subtítulo é \"acumulado\".",
      },
      {
        subtitulo: "Detalhamento Diário / Mensal",
        texto:
          "Tabela com os dados dia a dia (subtítulo por mês corrente) ou mês a mês no Histórico. As colunas incluem duração de live, métricas de audiência, acessos, registros, FTDs, depósitos, saques e GGR por período.\n\nAlterne para o modo Gráfico usando o botão no canto superior direito. No modo gráfico, escolha o KPI a exibir pelos botões acima do gráfico. Estado vazio: \"Sem dados para o período selecionado.\"",
      },
    ],
  },
  dash_overview_afiliado: {
    titulo: "Overview Afiliado",
    blocos: [
      {
        texto:
          "O Overview Afiliado oferece uma visão executiva da performance do canal de afiliados — consolidando KPIs financeiros e de conversão em uma única página sem abas. As métricas vêm da integração TAP CDA (conta Afiliados); o filtro lista os afiliados cadastrados na página Afiliados.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Carrossel de mês, Histórico (13 competências), filtro de afiliado (Todos Afiliados) e filtro de operadora.",
      },
      {
        subtitulo: "Blocos",
        texto:
          "KPIs Executivos (sem Lives, Horas Realizadas e Média de Views), Funil de Conversão em três etapas (Acessos → Registros → FTDs), Eficiência (sem FTD/Hora) e Detalhamento Diário/Mensal com colunas Afiliado, Acessos, Registros, # FTDs, R$ FTDs, # Depósitos, R$ Depósitos, # Saques, R$ Saques e R$ GGR.",
      },
    ],
  },
  dash_overview_prestador: {
    titulo: "Overview Prestador",
    blocos: [
      {
        texto:
          "O Overview Prestador consolida escala, presença, absenteísmo e movimentações de turno dos times de estúdio. A aba **Escala** está disponível para todos os times; a segunda aba aparece como **KPIs de Mesa** para **Game Presenter** e **Shuffler**, como **KPIs de OCR** para **Service Manager**, e fica oculta para **Shift Leader**.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis (a partir de julho/2026). O botão Histórico exibe o acumulado das competências na janela canônica, o rótulo central do carrossel passa a \"Todo o período\" e as setas ficam desabilitadas.\n\nPara perfis com escopo amplo: filtro **Time** com Game Presenter (padrão), Shuffler, Shift Leader e Service Manager — não há opção \"Todos os Times\". O filtro **Staff** é opcional: vazio mostra **Todo o time** (consolidado); ao escolher um prestador, a visão passa a ser individual (na Escala, nos KPIs de Mesa e nos KPIs de OCR).\n\nCom permissão de **Ver** em **Próprios**, os filtros de Time e Staff não aparecem — os resultados ficam fixos no cadastro vinculado ao seu login.",
      },
      {
        subtitulo: "Visão de time vs individual",
        texto:
          "Na visão de time a unidade dos KPIs é **jornada** (prestador × dia escalado). Na visão individual a unidade volta a ser **dia**. Todos os times da v1 exibem **Movimentações de turno** na Escala. Shift Leader e Service Manager usam dois turnos (Diurno/Noturno). Cobertura por estúdio e Distribuição por estúdio existem apenas para Game Presenter.",
      },
      {
        subtitulo: "Aba Escala — Resumo e aderência",
        texto:
          "Quatro cards com comparativo ao mês anterior inteiro (sem MoM no Histórico): jornadas/dias e horas **escaladas** no mês publicado (alinhadas à Escala Estúdio) vs **realizadas** só até **hoje** no mês corrente — dias futuros da escala não entram em presença, pontualidade nem controle de presença.\n\nEm seguida, Aderência (time) ou Absenteísmo (individual): Presença (só no time, realizadas ÷ escaladas até hoje), Pontualidade, **Controle de Presença** (check-in/check-out não registrados) e Atestados.",
      },
      {
        subtitulo: "Aproveitamento, movimentações e estúdio",
        texto:
          "O bloco Aproveitamento compara escalado vs realizado em barras.\n\nQuando o time negocia turno, o gráfico **Movimentações de turno** agrupa **Trocas realizadas**, **Turnos vendidos** e **Folgas vendidas** (sem contar a compra, que espelha a venda). Uma troca aceita muda dois dias na escala e conta como troca. No Game Presenter individual, **Distribuição por estúdio** aparece ao lado das movimentações (dias realizados por estúdio). No Game Presenter time, há ainda **Cobertura por turno**, **Cobertura por estúdio** e **Pontos de atenção**.",
      },
      {
        subtitulo: "Como ler as coberturas",
        texto:
          "Nas tabelas **Cobertura por turno** e **Cobertura por estúdio**, a coluna **Prestadores** conta pessoas distintas com jornada no período — quem apenas trocou o dia entra em Movimentações, sem ocupar vaga do turno. Um prestador que assume um turno comprado fora do seu turno habitual aparece nos dois turnos, por isso a soma das linhas pode passar do Total, que é sempre a contagem de pessoas distintas. Só a escala do time selecionado entra na conta: dias em treinamento ou em outra área não contam.",
      },
      {
        subtitulo: "Detalhamento Diário",
        texto:
          "Tabela com Data, Ocorrência e Detalhe (e Prestador na visão de time), ordenável e paginada. Ocorrências: Troca, Atestado, Atraso, Esquecimento, Outro, Compra e Venda — conforme o time. Troca/Compra/Venda mostram o colega da negociação no Marketplace quando houver snapshot. Estado vazio: \"Sem dados para o período selecionado.\"",
      },
      {
        subtitulo: "Aba KPIs de Mesa",
        texto:
          "A aba **KPIs de Mesa** (Game Presenter e Shuffler) depende do time:\n\n— **Game Presenter:** cards de Rodadas, médias por jogo (Blackjack, Baccarat, Futebol Brasileiro, Roleta) e Incidentes; **Por Jogo** com Rodadas, Velocidade, Reação e Incidentes — **Bola e Cilindro só na Roleta** (nos demais jogos aparece «—»). Na visão **individual** (Staff selecionado ou Ver = Próprios), ao lado de Velocidade/Reação (e Bola/Cilindro na Roleta) aparece um ícone colorido (verde → amarelo → vermelho → roxo) conforme faixas de tempo (s) ou % — sem texto de avaliação. Na visão de time (Staff vazio) os ícones não aparecem; há **Pontos de atenção** por prestador. **Detalhamento Diário** com Data, Rodadas, Total de Incidentes, Casos, Erros e Outros.\n\n— **Shuffler:** cards e tabelas só de incidentes (Incidentes, Casos, Erros, Outros), sem Roleta em Por Jogo; na visão de time há Pontos de atenção.\n\n**Erros** = Erro + Não Avisados + Avisado/Não Resolvido. **Outros** = Oculto + Avisado/Resolvido. Período = mês civil completo (sem recorte MTD), com fechamento **D-1**: rodadas/Grafana e Incidentes só incluem até o dia anterior. Sem linhas: \"Sem dados para o período selecionado.\"",
      },
      {
        subtitulo: "Aba KPIs de OCR",
        texto:
          "No time **Service Manager**, a segunda aba chama-se **KPIs de OCR** e avalia o desempenho dos SMs no atendimento.\n\n**Sinais** vêm dos sinais resolvidos pelo SM selecionado — ou por todos os SMs do time quando o filtro está em **Todo o time**. **Tickets** são os incidentes em que o SM é o **relator** (quem abriu o ticket); em Todo o time, entram todos os tickets relatados pelos SMs do time.\n\nCards: Sinais, TMA Total, TMA de Atendimento, TMA de Resolução e Tickets (com comparativo ao mês anterior em formato de relógio nos TMAs; tempos e tickets usam semântica inversa — menor é melhor). Tabelas: **Por Jogo**, **Por Estúdio** (expanda o estúdio para ver as mesas) e **Equipe** (só na visão de time — ranking por SM: sinais, TMAs e tickets) e **Detalhamento Diário**. O período do mês corrente inclui até **hoje** (mesmo critério da aba Sinais em Incidentes). Shift Leader não tem esta aba.",
      },
    ],
  },
  dash_headcount: {
    titulo: "Headcount",
    blocos: [
      {
        texto:
          "O Headcount é o dashboard executivo de pessoas da Spin, com três abas — Overview, Contratação e Distratos. Serve diretoria e investidores; é distinto da aba operacional Head Count em Gestão de Prestadores e do Overview Prestador (escala individual).",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Navegue pelos meses com as setas. O botão **Histórico** mostra a janela de 13 competências mensais — a atual e as 12 anteriores (rótulo **Todo o período**). Filtre por **diretoria** (Todas as diretorias por padrão). Na segunda linha, alterne entre as abas Overview, Contratação e Distratos.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "No modo mês: KPIs HC Ativo, Contratação e Distrato na primeira linha; Variação, Turnover e Permanência na segunda (comparação com o mês anterior só com o valor). Pizza do HC por gerência (total no centro; hover na lista mostra HC por time) e barras por tipo de contrato.\n\nNo **Histórico**: KPIs HC Ativo, Distrato, Turnover e Permanência Média, mais a tabela **Mês a Mês** com Headcount, Contratação, Distrato e Turnover dos últimos 13 meses.",
      },
      {
        subtitulo: "Aba Contratação",
        texto:
          "KPIs de vagas abertas, em andamento e fechadas. Origem das candidaturas (campo «Como chegou até nós?») em pizza; funil com as etapas das candidaturas. Tabela com vagas abertas e em andamento — título, datas, repasse, quantidade de candidatos e status. No Histórico, os mesmos blocos consideram as 13 competências.",
      },
      {
        subtitulo: "Aba Distratos",
        texto:
          "KPIs de distratos, voluntário, não voluntário e permanência (até 30 dias em dias; acima disso em meses — o card de Permanência não aparece no Histórico). Lista de áreas com quantidade de distratos e pizza por tipo de contrato. Tabela ordenada por data de término (mais recente primeiro). No Histórico, os blocos usam os 13 meses.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        texto:
          "Calendário central de todas as lives da operação. Permite visualizar, agendar e acompanhar ativações — passadas, presentes e futuras — de todos os influencers, plataformas e operadoras. O acesso e as ações disponíveis variam conforme o perfil do usuário.",
      },
      {
        subtitulo: "Modos de Visualização",
        texto:
          "A agenda oferece três modos, selecionáveis no filtro em pill (ícone de calendário em intervalo — Mês, Semana ou Dia):\n\n— Mês: grid completo do calendário. As células variam de cor conforme o estado do dia — azul para hoje, verde para dias futuros e vermelho para dias passados. Cada célula exibe até 8 lives; quando há mais, um link '+N mais' abre a visualização Dia automaticamente.\n— Semana: sete colunas com as lives de cada dia. O número do dia aparece em destaque com a mesma codificação de cores do modo Mês.\n— Dia: lista detalhada de todas as lives do dia selecionado, com logo da plataforma, nome do influencer, badges de plataforma e status, horário e link clicável abaixo de cada item.",
      },
      {
        subtitulo: "Navegação e Filtros",
        texto:
          "Use as setas para avançar ou recuar no período conforme o modo (mês, semana ou dia). O botão **Hoje** (pill alinhado aos outros filtros da barra, ícone distinto do Histórico dos dashboards) volta para a data atual e abre a visualização Dia — fica destacado quando você já está no dia de hoje nesse modo.\n\nO seletor **Mês / Semana / Dia** usa o mesmo estilo de pill: **Mês** é o padrão (aparência neutra); **Semana** e **Dia** aparecem destacados quando selecionados.\n\nNa mesma linha, para perfis com escopo amplo: **Influencers** (**Todos Influencers** por defeito; pesquisa no painel com mais de cinco nomes) e **Operadoras** (**Todas Operadoras**).\n\nOs filtros de Status (Agendada, Realizada, Não Realizada) e Plataforma ficam numa segunda linha abaixo.\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo.",
      },
      {
        subtitulo: "Criando uma Nova Live",
        texto:
          "No bloco **Calendário** (subtítulo *Data e hora das lives dos influencers*), use **Nova Live** no canto direito da mesma linha do título para abrir o formulário. Enquanto o sistema verifica pré-requisitos (perfil e Playbook), o botão exibe \"Verificando...\" com spinner.\n\nPreencha:\n\n— Influencer: selecione o parceiro responsável (disponível para gestores, executivos e operadores). Quando o próprio influencer agenda, o cadastro é fixo no perfil logado.\n— Data e Horário: quando a live está programada\n— Plataforma: botões visuais com logo — Twitch, YouTube, Kick, Instagram, TikTok, Discord, WhatsApp ou Telegram\n— Link: obrigatório para salvar. É pré-preenchido automaticamente com o link cadastrado no perfil do influencer para a plataforma selecionada, e atualiza automaticamente ao trocar de plataforma. Se o perfil não tiver o link da plataforma selecionada, o campo fica em branco e deve ser preenchido manualmente.\n\nAo salvar uma nova live, a operadora é definida automaticamente a partir do vínculo ativo do influencer em Influencers → Operadoras (primeira operadora ativa). Assim a live fica visível no escopo da operadora correspondente.",
      },
      {
        subtitulo: "Restrições de Data e Permissão",
        texto:
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — o agendamento para o mesmo dia não é permitido. Apenas Admin e Gestor podem criar ou editar lives em datas e horários passados.\n\nLives com status Realizada ou Não Realizada são bloqueadas para edição por influencers, agências e operadores — o modal abre em modo somente leitura para esses perfis. Apenas Admin e Gestor podem editar ou corrigir lives já validadas.\n\nPerfis com permissão **Ver** na Agenda, mas **sem Editar**, ao clicar numa live no calendário veem o modal **Live agendada** (data, horário e link **Assista** na plataforma com ícone e nome) — sem formulário de edição; fecham pelo X no topo.",
      },
      {
        subtitulo: "Bloqueio de Agendamento",
        texto:
          "Ao clicar em Nova Live, o sistema verifica automaticamente os pré-requisitos do influencer. Se algum estiver pendente, um modal de bloqueio é exibido com os itens faltantes e botões de ação direta:\n\n— Perfil incompleto: dados obrigatórios do cadastro em Influencers não foram preenchidos. O botão 'Ir para Influencers' leva diretamente à página para completar o cadastro.\n— Playbook pendente: o influencer ainda não registrou ciência nos termos obrigatórios. O botão 'Ir para Playbook Influencers' leva aos termos.\n\nSe todos os pré-requisitos estiverem ok, o formulário de Nova Live abre normalmente (sem o modal de bloqueio).",
      },
      {
        subtitulo: "Excluindo uma Live",
        texto:
          "Ao editar uma live, o botão Excluir no rodapé do modal abre o pop-up padrão de confirmação — disponível para perfis com permissão de exclusão e conforme as regras de status (lives validadas só para Admin e Gestor). Toque em Excluir no pop-up para concluir ou Cancelar para voltar.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Influencer / Agência: visualiza e agenda apenas as próprias lives ou as dos influencers sob sua gestão.\n— Operador: visualiza todas as lives dos influencers que atuam na sua operadora.\n— Gestor / Executivo / Admin: visão completa de todas as lives de todos os influencers e operadoras.",
      },
    ],
  },
  resultados: {
    titulo: "Resultados",
    blocos: [
      {
        texto:
          "Fila de validação das lives pendentes. Exibe apenas lives com status Agendada cujo horário já passou há mais de 5 horas — a janela garante que a live terminou antes do registro. Lives ainda em andamento ou recém-encerradas não aparecem aqui.\n\nUm contador amarelo no topo da lista informa quantas lives estão aguardando validação. Quando não há nenhuma pendente, a página exibe 'Nenhuma live pendente de validação.'",
      },
      {
        subtitulo: "Validando uma Live",
        texto:
          "Clique em Validar na live desejada para abrir o formulário. Os campos disponíveis são:\n\n— Status: Realizada ou Não Realizada\n— Operadora: obrigatório para qualquer status. É o vínculo que conecta a live ao cálculo de pagamentos no módulo Financeiro\n— Observação: campo livre, opcional\n\nPara lives Realizadas, campos adicionais ficam disponíveis:\n— Horário Real de Início: pré-preenchido com o horário agendado da live — altere se ela começou em horário diferente\n— Duração: horas e minutos separados; ambos não podem ser zero simultaneamente\n— Média de Views: audiência média ao longo da live\n— Máximo de Views: pico de audiência; não pode ser menor que a Média",
      },
      {
        subtitulo: "Live Não Realizada",
        texto:
          "Ao selecionar Não Realizada, um aviso amarelo confirma que nenhum resultado será registrado e os campos de resultado (duração, views) são ocultados. A operadora continua obrigatória mesmo para lives não realizadas — é necessária para o módulo Financeiro fechar o ciclo corretamente.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Para perfis com acesso a múltiplos influencers ou operadoras, os filtros aparecem no topo da página. Eles permitem isolar as lives de um influencer específico ou de uma operadora, facilitando o trabalho em volumes maiores.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "Influencers e agências veem apenas as próprias lives pendentes de validação. Operadores veem as lives dos influencers da sua operadora. Gestores e executivos têm visão completa.\n\nO botão Validar aparece apenas para perfis com permissão de edição. Se o botão não aparecer, o perfil pode não ter essa permissão configurada — entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "Excluindo uma Live",
        texto:
          "O botão Excluir (ícone vermelho no card) aparece para perfis com permissão de exclusão. O clique abre um pop-up pedindo confirmação — toque em Excluir para concluir ou Cancelar para voltar. A ação não pode ser desfeita.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        texto:
          "Histórico completo das lives validadas na operação — realizadas e não realizadas. É onde o resultado final de cada ativação fica registrado após a validação em Resultados. O Financeiro consome operadora, período e influencer das lives realizadas para o cálculo de pagamentos do ciclo correspondente.",
      },
      {
        subtitulo: "Navegação e Período",
        texto:
          "Use as setas para navegar entre semanas (rótulos acessíveis \"Semana anterior\" / \"Próxima semana\") ou ative o botão Histórico para ver o acumulado de 13 competências mensais — a atual e as 12 anteriores. No modo Histórico, as setas ficam desabilitadas, os KPIs e a lista refletem o acumulado e o subtítulo dos blocos pode indicar \"acumulado\".\n\nOs filtros de Influencer (multi-seleção; agregadora **Todos Influencers**; pesquisa no painel quando há mais de cinco nomes) e Operadora aparecem na mesma linha da navegação, para perfis com acesso a múltiplos escopos. Enquanto os dados carregam, um indicador de carregamento pode aparecer na área principal.",
      },
      {
        subtitulo: "Filtro de Status",
        texto:
          "Na segunda linha dos filtros, os chips de Status permitem isolar o tipo de live: Realizada (verde), Não Realizada (vermelho) ou Todos (padrão ativo). O filtro ativo fica destacado — clique nele para desativar ou escolha outra opção.",
      },
      {
        subtitulo: "KPIs do Período",
        texto:
          "Três indicadores consolidados calculados sobre todas as lives do período e filtros selecionados, independentemente do chip de status da lista:\n\n— Total de Lives: quantidade total, com breakdown 'N realizadas · N não realizadas' abaixo do número.\n— Horas Realizadas: soma das durações no formato XhYm, com sublegenda 'em N lives' indicando quantas contribuíram para o total.\n— Média de Views: média das médias de views por live realizada. A sublegenda 'média das médias por live' esclarece o cálculo. Exibe '—' quando nenhuma live realizada tem views registradas.",
      },
      {
        subtitulo: "Lista de Lives",
        texto:
          "Cada live é exibida em um card com borda lateral colorida — verde para realizadas, vermelho para não realizadas. O card mostra data, horário, nome do influencer e badge de plataforma.\n\nLives realizadas exibem três blocos de resultado abaixo: Duração, Média Views e Pico Views.\n\nQuando uma observação foi registrada na validação, ela aparece em um bloco destacado abaixo dos dados principais. Se não há observação, o bloco não aparece.\n\nUm contador acima da lista informa quantas lives foram encontradas com os filtros ativos. Se nenhuma live corresponder ao período e filtros, a mensagem exibida é: \"Sem dados para o período selecionado.\"",
      },
      {
        subtitulo: "Editando uma Live",
        texto:
          "O botão Editar aparece para perfis com permissão de edição. O formulário permite ajustar o status, a operadora, a observação e os dados de resultado (duração, média e pico de views). A operadora é obrigatória para lives realizadas — é o dado usado pelo Financeiro para calcular os pagamentos do ciclo correspondente.",
      },
      {
        subtitulo: "Excluindo uma Live",
        texto:
          "O botão Excluir (ícone vermelho no card) aparece para perfis com permissão de exclusão. O clique abre um pop-up pedindo confirmação — toque em Excluir para concluir ou Cancelar para voltar. A ação não pode ser desfeita.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "Influencers veem apenas as próprias lives. Operadores veem as lives vinculadas à sua operadora. Gestores têm visão completa. Os botões Editar e Excluir aparecem somente para quem tem as permissões correspondentes.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        texto:
          "Cadastro central dos parceiros de **lives** (perfil Influencer). Reúne os dados necessários para ativar, acompanhar e pagar cada influencer — e serve de base para Agenda, Resultados, Feedback e Financeiro. Afiliados criados pelo Network ficam na página **Afiliados**, não nesta lista.\n\nPara gestores e administradores, o subtítulo da página é 'Gerencie o cadastro completo dos parceiros — perfil, canais e financeiro.' Para o próprio influencer logado, a página exibe apenas o próprio perfil com a mensagem 'Seu perfil completo na plataforma.'",
      },
      {
        subtitulo: "Quadros de Resumo",
        texto:
          "Dois cards no topo, visíveis para gestores, executivos e operadores:\n\n— Total de Influencers: quantidade total com breakdown por status (Ativo, Inativo, Cancelado). As contagens por plataforma aparecem nos chips de filtro Plataforma abaixo.\n— Perfil Incompleto: contador vermelho com os nomes dos influencers ativos com dados obrigatórios pendentes. Cada nome é um link clicável que abre diretamente o formulário de edição daquele influencer. Quando todos os perfis ativos estão completos, o card exibe 'Todos os perfis ativos estão completos!' em verde.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O bloco de filtros está organizado em quatro linhas:\n\n— Linha 1 — Status e Operadora: chips Ativo, Inativo, Cancelado; seletor de operadora para perfis com acesso a múltiplas parceiras\n— Linha 2 — Plataforma: chips por canal cadastrado na base\n— Linha 3 — Cachê por Hora: slider de R$0 até o maior cachê cadastrado\n— Linha 4 — Busca: campo de texto por nome artístico ou e-mail\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo.",
      },
      {
        subtitulo: "Card de Influencer",
        texto:
          "Cada card exibe: avatar com a inicial em gradiente de marca, nome artístico, badge de status, cachê por hora, canais ativos com links clicáveis (ícone de link externo) e tags das operadoras vinculadas.\n\nO badge de status é um dropdown interativo — Admin e Gestor podem alterar o status diretamente no card sem abrir o modal. Para outros perfis, o badge é somente leitura.\n\nO badge 'Perfil incompleto' aparece em influencers ativos com dados obrigatórios faltando. As tags de operadoras não são exibidas para o perfil Operador.",
      },
      {
        subtitulo: "Visualizando um Perfil (Ver)",
        texto:
          "O modal de visualização abre com um banner 'Modo visualização — somente leitura. Dados sensíveis protegidos.' e tem cinco abas com navegação acessível (tablist / role tab):\n\n— Cadastral: nome completo, nome artístico, e-mail, telefone e CPF (com desfoque)\n— Canais: plataformas ativas com link clicável para abrir em nova aba\n— Financeiro: cachê por hora, Chave PIX, Banco, Agência e Conta (todos com desfoque)\n— Operadoras: status do vínculo (Ativo/Inativo) e ID em cada operadora\n— Histórico: data de criação do cadastro, data da última atualização e data da última alteração de status\n\nDados sensíveis (CPF, Chave PIX e dados bancários) ficam com desfoque e exigem clique no ícone de olho para revelar — ocultam-se automaticamente após 10 segundos. Pressione Esc para fechar o modal.",
      },
      {
        subtitulo: "Editando um Perfil (Editar)",
        texto:
          "O formulário de edição tem quatro abas com navegação acessível (tablist) — Cadastral, Canais, Financeiro e Operadoras — sem a aba Histórico. Salvar Perfil confirma todas as alterações de uma vez. Pressione Esc para fechar o modal.\n\nO campo Cachê por Hora e o badge de Status são restritos a Admin e Gestor — para outros perfis, esses campos aparecem bloqueados. No modo de edição, CPF e dados bancários ficam visíveis para facilitar o preenchimento.\n\nNa aba Canais, cada plataforma ativa exige que o link correspondente esteja preenchido. Na aba Operadoras, cada operadora marcada como ativa exige o ID do influencer naquela operadora. O primeiro vínculo ativo em Operadoras é o usado pela Agenda ao definir a operadora automaticamente em novas lives.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Influencer: vê e edita apenas o próprio perfil. Não há lista nem filtros.\n— Agência: vê e gerencia os influencers sob sua estrutura.\n— Operador: visualiza influencers vinculados à sua operadora. Pode consultar, mas não pode alterar status ou cachê.\n— Gestor / Executivo / Admin: acesso completo a todos os influencers e a todas as operações de gestão.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        texto:
          "Funil de prospecção para registrar e acompanhar candidatos a parcerias. Centraliza dados de contato, negociação, plataformas e anotações de cada prospecto. Quando a parceria é confirmada e o prospecto é marcado como Fechado, a plataforma cria automaticamente o usuário do influencer.",
      },
      {
        subtitulo: "Funil de Prospecção e Cobertura de Plataformas",
        texto:
          "Os quatro cards no topo mostram a distribuição dos prospectos por etapa:\n\n— Visualizado: primeiro contato identificado, informações básicas coletadas\n— Contato: negociação em andamento, dados de contato registrados\n— Negociação: proposta enviada, cachê em discussão\n— Fechado: parceria confirmada — o prospecto vira influencer ativo na plataforma\n\nClique em um card para filtrar a lista por aquele status; clique de novo no card ativo para voltar à vista padrão. Por padrão, nenhum card está selecionado e prospectos **Fechados** não aparecem na lista — clique no card Fechado para visualizá-los.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "No bloco inferior, combine:\n\n— Plataforma: chips com contagem por canal\n— Cachê por Hora — até: slider até o maior cachê cadastrado\n— Views — até: slider até o maior volume de views cadastrado\n— Busca: por nome artístico ou e-mail\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo (inclui card do funil e plataforma). O filtro por status é feito diretamente nos cards do funil.",
      },
      {
        subtitulo: "Card de Prospecto",
        texto:
          "Cada card exibe nome artístico, StatusBadge com dropdown para alterar a etapa do funil, plataformas com métricas inline e flags na parte inferior quando preenchidas: **Live Cassino** (roxo), **Operadora** (cor do brand guide da parceira — igual Gestão de Dealers), **Origem** (cinza — tipo de contato), **Registrado** (índigo — usuário que cadastrou na plataforma) e, quando informado, **cachê negociado** (ouro/âmbar).\n\nProspectos enviados pelo site público não exibem flag Registrado até alguém atribuir na edição.\n\nAs métricas variam por plataforma: YouTube, Twitch, Kick e TikTok mostram Média de Views; Instagram, Discord, WhatsApp e Telegram mostram Seguidores.",
      },
      {
        subtitulo: "Cadastrando e Editando um Prospecto",
        texto:
          "Clique em Novo Influencer (botão com ícone + e gradiente de criação) para registrar um novo prospecto. O formulário tem Nome Artístico e Status no topo, mais três abas (tablist acessível — Contato, Canais, Anotações). Pressione Esc para fechar o modal.\n\nAbaixo de Nome e Status (Ver / Editar), **Registrado por** e **Data de Registro** do cadastro na plataforma; se **Registrado por** estiver vazio, use **Atribuir a mim** e Salvar.\n\n— Contato: Tipo de Contato (Agente, Plataforma ou Direto), Nome do Agente (quando tipo for Agente), Telefone, Cachê Negociado, Live Cassino (Sim/Não), E-mail e Operadora\n— Canais: toggle de plataformas ativas. Cada plataforma ativa exige link e métrica correspondente (Views ou Seguidores conforme a plataforma). Abaixo, seleção de Categorias em multi-seleção: Vida Real, Jogos Populares, Variedades, Esportes, Cassino\n— Anotações: campo para nova anotação e histórico com autor e data de cada anotação",
      },
      {
        subtitulo: "Fechando uma Parceria",
        texto:
          "Ao marcar um prospecto como Fechado, a plataforma cria automaticamente o usuário do influencer com as informações cadastradas. Para que o fechamento seja concluído, os seguintes campos são obrigatórios:\n\n— Nome artístico e e-mail\n— Cachê negociado maior que zero\n— Operadora (aba Contato)\n— Pelo menos uma plataforma com link e métrica preenchidos — views ou seguidores, conforme a plataforma (aba Canais)\n\nDurante o processo, o botão exibe 'Criando usuário...' com um spinner. Não feche o modal até que a confirmação apareça. A operadora selecionada é gravada automaticamente no perfil do influencer criado e no escopo de acesso na Gestão de Usuários.",
      },
      {
        subtitulo: "Anotações",
        texto:
          "A aba Anotações concentra observações ao longo da prospecção; cada anotação guarda autor e data. **Registrado por** e **Data de Registro** (cadastro na plataforma) ficam no cabeçalho do modal, abaixo de Nome e Status — distintos das anotações do funil.",
      },
    ],
  },
  gestao_dealers: {
    titulo: "Gestão de Dealers",
    blocos: [
      {
        texto:
          "Catálogo de **Game Presenters** (dealers) em operação, sincronizado com **Gestão de Staff**. A operadora consulta especialidades, turno e **estúdio** e envia solicitações — não cadastra nem edita perfil aqui.\n\n**Fluxo:** RH cadastra e define a função em **Gestão de Prestadores** → gestor configura perfil, estúdio e horários em **Gestão de Staff** → o card aparece aqui com o **mesmo estúdio** configurado no Staff (ex.: Sports Club mostra só a tag Sports Club).",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "O carrossel de turnos no topo da página filtra o elenco por período de trabalho — Manhã, Tarde ou Noite. Use as setas laterais para alternar o turno; o rótulo central mostra o turno ativo. Quando o rótulo exibe 'Todos os turnos', nenhum filtro de turno está aplicado.\n\nAo lado do carrossel fica o filtro de **estúdio** (**Todos Estúdios** por padrão, com a opção **Nenhum estúdio** para dealers ainda sem vínculo). Perfis Operador veem no filtro os estúdios ligados à sua operadora em Gestão de Estúdios — por exemplo, Blaze vê **Blaze** e **Sports Club** (network). Com um único estúdio no escopo, ele já entra selecionado.\n\nO bloco consolidado abaixo exibe o total de dealers que atendem aos filtros ativos, com chips de gênero (Feminino / Masculino) e jogo (Blackjack / Roleta / Baccarat / Futebol Brasileiro) para refinar ainda mais a listagem. Cada chip mostra a contagem parcial e pode ser ativado ou desativado com um clique.\n\nO campo de busca aceita nome real ou nickname.",
      },
      {
        subtitulo: "Cards de Dealers",
        texto:
          "Cada dealer é exibido em um card com foto (ou inicial quando não há foto), badges de status e VIP sobre a imagem, turno no rodapé da foto e, no corpo, nome artístico, nome real, tags dos jogos de especialidade, bio e, na base, as tags de gênero e **estúdio** (o mesmo definido em Gestão de Staff). Não há tag de operadora no card — o vínculo visível é o estúdio.\n\nQuando o dealer tem mais de uma foto cadastrada, setas de navegação aparecem sobre a imagem — use-as para ver todas as fotos do carrossel. O indicador de posição ('1 / 3', por exemplo) aparece no rodapé da foto.\n\nClique em Ver para abrir o perfil completo em modo somente leitura, incluindo gênero, turno, jogos, estúdio e bio do dealer.",
      },
      {
        subtitulo: "Solicitações ao Estúdio (perfil Operador)",
        texto:
          "Operadores com escopo de operadora definido encontram dois botões adicionais em cada card:\n\n— Solicitar: abre o formulário de nova solicitação para aquele dealer. Escolha o tipo — 'Solicitar troca de dealer' ou 'Deixar feedback' — e descreva o pedido com pelo menos 10 caracteres. A solicitação é enviada ao estúdio Spin e ficará visível na Central de Notificações.\n\n— Histórico: lista todas as solicitações já enviadas para aquele dealer na sua operadora. Clique em qualquer item para abrir a thread completa da conversa.\n\nUm banner amarelo no topo da página informa quantas solicitações aguardam resposta da operadora. Clique em Ver no banner para acessar a primeira pendência diretamente.",
      },
      {
        subtitulo: "Origem do cadastro no elenco",
        texto:
          "Um dealer só aparece quando o prestador está no time **Game Presenter** com status **Ativo** ou **Indisponível** em **Gestão de Prestadores** e o perfil operacional foi sincronizado a partir de **Gestão de Staff**. Se o colaborador existe em RH mas não aparece aqui, confira o time no organograma, o status e os dados em Staff — não há botão de criar ou editar dealer nesta página.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Gestor / Admin: visualização do elenco de todos os estúdios e do histórico de solicitações de todas as operadoras.\n— Operador: visualiza os dealers dos **estúdios associados à sua operadora** (dedicado e network — ex.: Blaze + Sports Club). A tag do card indica em qual estúdio o GP está. Pode **Solicitar** troca ou feedback e abrir **Histórico** de solicitações por dealer, sempre restrito à própria operadora.\n— Executivo: visualização completa, sem ações de escrita nesta página.\n\nO botão Solicitar só aparece para perfil Operador com operadora ativa no escopo. O botão Histórico exige permissão de visualização na Central de Notificações.",
      },
    ],
  },
  central_notificacoes: {
    titulo: "Central de Notificações",
    blocos: [
      {
        texto:
          "Hub de comunicação entre as operadoras e o estúdio Spin Gaming. Centraliza todas as solicitações em aberto e resolvidas — trocas de dealer, feedbacks, solicitações de roteiro de campanha e de roteiro de mesa — num único lugar, com histórico de conversa e status de cada item.\n\nA experiência é diferente conforme o perfil: gestores Spin visualizam o inbox completo organizado por tipo de solicitação; operadores veem as próprias solicitações e as campanhas da sua operadora.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre meses ou ative Histórico para ver as solicitações de 13 competências mensais — a atual e as 12 anteriores (rótulo **Todo o período**). No modo Histórico, as setas ficam desabilitadas. Solicitações ainda em aberto aparecem independentemente do mês selecionado.\n\nO filtro de operadora aparece para perfis com acesso a múltiplas operadoras, permitindo isolar as notificações de uma parceira específica em todos os blocos da página.\n\nO indicador 'Carregando…' na barra de filtros é um estado secundário que confirma que os dados estão sendo atualizados após mudança de período ou operadora.",
      },
      {
        subtitulo: "Inbox do Estúdio — perfil Gestor",
        texto:
          "Gestores e administradores Spin visualizam o inbox organizado em quatro abas:\n\n— Troca de dealer: solicitações de troca enviadas pelas operadoras para dealers específicos.\n— Feedbacks: mensagens de feedback sobre o desempenho ou comportamento de dealers.\n— Campanhas: solicitações ligadas a roteiros de campanha cadastrados no módulo Roteiro de Mesa.\n— Roteiros: solicitações ligadas a sugestões de roteiro de mesa.\n\nCada aba exibe um badge vermelho com a contagem de itens que aguardam resposta do estúdio — ou seja, onde o campo 'aguarda resposta de' está apontado para o gestor. Itens já resolvidos aparecem na mesma lista com o status 'Concluído' para consulta histórica dentro do período selecionado.",
      },
      {
        subtitulo: "Minhas Solicitações e Campanhas — perfil Operador",
        texto:
          "Operadores visualizam a página em modo diferente do inbox do estúdio:\n\n— Minhas solicitações: lista das solicitações de dealer enviadas pela operadora que ainda estão abertas (pendente ou em andamento).\n— Roteiros de mesa: solicitações de roteiro vinculadas à operadora, também em aberto.\n— Minhas Campanhas: campanhas de roteiro cadastradas para a operadora no período selecionado. Campanhas vigentes são destacadas com o badge 'VIGENTE' em verde. Quando a campanha tem uma conversa aberta com o estúdio, o botão 'Ver conversa' aparece no card.\n\nA seção Solicitações concluídas aparece na parte inferior da página e lista os itens marcados como resolvidos no período selecionado.",
      },
      {
        subtitulo: "Conversas e Status",
        texto:
          "Clique em 'Ver conversa' em qualquer card para abrir a thread de mensagens daquela solicitação. A conversa exibe todas as mensagens trocadas entre operadora e estúdio, com hora e nome do remetente.\n\nO status de cada solicitação segue o fluxo:\n— Aberta: solicitação criada, ainda sem resposta do estúdio.\n— Aguardando resposta: o estúdio já interagiu e a bola está com a operadora — ou vice-versa.\n— Concluído: marcada como resolvida pelo gestor Spin.\n— Cancelada: encerrada sem resolução.\n\nQuando o perfil não tem permissão de resposta na página, a thread abre em modo somente leitura com a mensagem 'Sem permissão para responder nesta página. Apenas visualização.'",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Gestor / Admin: inbox completo com todas as solicitações de todas as operadoras, organizadas por tipo em abas. Pode responder, questionar e marcar como resolvido.\n— Operador: visualiza apenas as próprias solicitações e campanhas. Pode abrir threads e responder mensagens. Não tem acesso ao inbox do estúdio nem às solicitações de outras operadoras.\n— Executivo: visualização completa em modo leitura. Não pode interagir nas threads.",
      },
    ],
  },
  rh_funcionarios: {
    titulo: "Gestão de Prestadores",
    blocos: [
      {
        texto:
          "Centraliza o cadastro de prestadores, o head count por área, as movimentações de RH e as anotações internas. A página tem três abas: **Head Count**, **Ações de RH** e **Anotações RH**. O acesso às abas e ações depende das permissões de Ver, Criar, Editar e Excluir configuradas em Gestão de Usuários.",
      },
      {
        subtitulo: "Filtros e busca",
        texto:
          "A barra de filtros tem três linhas. Na primeira, os seletores de **Diretorias**, **Gerências**, **Setores**, **Contratos** (CLT, PJ, Estágio, Temporário) e **Status** — cada um com opção agregadora (**Todas Diretorias**, **Todos Contratos**, **Todos Status** e assim por diante). Na segunda, a busca por **nome, CPF ou e-mail**. Na terceira, as abas da página.\n\nO padrão do filtro de status mostra os prestadores disponíveis (ativos e indisponíveis); escolha **Encerrado** para ver quem já saiu.",
      },
      {
        subtitulo: "Abas",
        texto:
          "— **Head Count**: lista de prestadores com função, líder imediato, data da função, remuneração e status. Com permissão de Criar, o botão **Novo Prestador** abre o cadastro completo.\n— **Ações de RH**: movimentações formais do prestador — revisão de contrato, período de indisponibilidade, alinhamento, término e reativação da prestação.\n— **Anotações RH**: registros internos sobre o prestador. Com permissão, o botão **RH Talks** abre o fluxo de conversa com o time.",
      },
      {
        subtitulo: "Cadastro e detalhe do prestador",
        texto:
          "O modal do prestador é organizado em abas: **Dados pessoais**, **Dados de contratação**, **Dados da empresa** (só para contrato PJ), **Dados bancários**, **Documentos**, **Carreira** e **Acesso a Plataforma**. Documentos, Carreira e Acesso aparecem no modal Ver ou Editar; a aba **Carreira** só no Ver. Os campos preenchidos em uma aba são mantidos ao alternar entre elas; um único **Salvar** grava o cadastro e os documentos pendentes.",
      },
      {
        subtitulo: "KPIs e revisão cadastral",
        texto:
          "Acima dos filtros, os cards mostram o total no filtro atual, cadastros incompletos e revisões cadastrais pendentes (ciclo de 6 meses em Dados de Cadastro). Clique no card para ir ao prestador quando houver permissão de Editar.",
      },
      {
        subtitulo: "Remuneração e dados sensíveis",
        texto:
          "Quem tem permissão de Ver na página enxerga a coluna **Remuneração** e os dados financeiros no detalhe do prestador. Os valores da tabela ficam ocultos por padrão — use o ícone de olho no cabeçalho da coluna para exibir ou ocultar. Alterar valores continua exigindo permissão de Editar. Esta página é de RH e Executivos — use **Sim** ou **Não** em Gestão de Usuários; Próprios não se aplica aqui.",
      },
      {
        subtitulo: "Acesso à plataforma",
        texto:
          "Ao salvar um prestador ou registrar Revisão de Contrato / Reativação, a plataforma tenta criar ou atualizar o login conforme o organograma. Se essa sincronização falhar, o cadastro já está gravado — a mensagem pede para tentar de novo. Encerrar a prestação desativa o acesso automaticamente.",
      },
    ],
  },
  rh_organograma: {
    titulo: "Organograma",
    blocos: [
      {
        texto:
          "Mapa da estrutura da Spin Gaming — diretorias, gerências e times — com modos de visualização e gerenciamento para quem tem permissão de editar. Use a barra de filtros para alternar entre visualização do organograma e cadastro de diretorias, gerências e times.",
      },
      {
        subtitulo: "Visualização",
        texto:
          "No modo Visualização, explore a hierarquia com carrossel de diretoria e expansão de gerências e times. No modo Gerenciamento (com permissão de Editar), cadastre ou ajuste diretorias, gerências e times vinculados.",
      },
    ],
  },
  rh_vagas: {
    titulo: "Vagas",
    blocos: [
      {
        texto:
          "Gerencia vagas abertas, candidaturas e etapas do processo seletivo interno. Publicação, triagem e movimentação de candidatos dependem das permissões de Criar e Editar na página.",
      },
      {
        subtitulo: "Filtros e candidaturas",
        texto:
          "Use os filtros de status, tipo de vaga e busca para localizar processos. Cada vaga concentra candidatos, histórico de movimentação e ações de RH conforme o perfil logado.",
      },
      {
        subtitulo: "Nova vaga",
        texto:
          "No modal **Nova Vaga**, preencha título, tipo, organograma, datas, **repasse inicial** (valor em reais), descrição e responsabilidades. Em vagas **Externas**, o campo **Tags** é obrigatório — adicione ao menos um rótulo (digite e pressione Enter). Vagas **Internas** não exibem Tags. Requisitos e Escala de trabalho não fazem mais parte do cadastro.",
      },
      {
        subtitulo: "Compartilhar vaga externa",
        texto:
          "Em vagas **Externas** abertas, use **Compartilhar** para copiar o link da página de Carreiras (`https://spingaming.com.br/carreiras/`). Oriente o candidato a preencher o formulário no site: em **Como chegou até nós?** escolha **Indicação** e em **Quem indicou?** informe o nome do Prestador — necessário para o recebimento do bônus.",
      },
    ],
  },
  rh_central_denuncias: {
    titulo: "Central de Denúncias",
    blocos: [
      {
        texto:
          "Canal interno (logado) para registrar, acompanhar e tratar protocolos de denúncia. KPIs, filtros por período, tipo e status, e atendimento pelos perfis autorizados — distinto do formulário público anônimo da Spin.\n\nPara encaminhar o canal a quem **não** tem login, use a página pública **/canal-denuncias-spin** no mesmo endereço da plataforma (sem menu). Quem relata recebe um protocolo para consultar o andamento; se se identificar, precisa do mesmo e-mail na consulta.",
      },
      {
        subtitulo: "Período",
        texto:
          "A página abre com **Histórico** ativo (**Todo o período** — competência atual e 12 anteriores). Desligue Histórico para navegar mês a mês pelas setas do carrossel.",
      },
      {
        subtitulo: "Atendimento",
        texto:
          "Filtre por tipo de denúncia, incluindo **Elogios**, status e período. Abra o protocolo para registrar andamento, parecer e encerramento conforme permissão de Editar.\n\nNa aba **Anotações** do atendimento, registre mensagens à investigação. Por padrão elas ficam **visíveis na consulta pública** (protocolo); marque **Somente interno** para notas que o relator não deve ver. Respostas do relator na página pública entram nesta mesma thread com o selo Relator — use o espaço como conversa para dúvidas e evidências.",
      },
    ],
  },
  rh_dados_cadastro: {
    titulo: "Dados de Cadastro",
    blocos: [
      {
        texto:
          "Página de autoatendimento cadastral do prestador e consulta/atualização por perfis com permissão ampliada. Seis abas: **Histórico de trabalho** (somente leitura — vínculo na Spin), **Dados cadastrais**, **Documentos**, **Formação e Competências**, **Experiência Profissional** (empregos anteriores) e **Histórico** de movimentações RH.",
      },
      {
        subtitulo: "Permissões e filtros",
        texto:
          "— **Ver/Editar Próprios:** abre direto o cadastro vinculado ao seu e-mail de login (e-mail pessoal ou E-mail Spin), sem filtro Staff.\n— **Ver Sim:** barra de filtros com **Staff** (seleção única — um prestador por vez) e botão **Meu Cadastro** para voltar ao seu registro; abas abaixo do filtro.\n— **Ver Sim + Editar Próprios:** pode consultar qualquer prestador, mas salvar/upload/excluir só no próprio cadastro (cadastros alheios em modo leitura).\n— **Ver Sim + Editar Sim:** pode atualizar dados cadastrais, documentos, formação/competências e experiência profissional de qualquer prestador listado — independente da permissão em Gestão de Prestadores.\n\nA revisão cadastral obrigatória aparece apenas no **seu** cadastro: a **primeira** deve ser feita no primeiro acesso (cadastro em Gestão de Prestadores não conta); depois, o ciclo é de 6 meses. Não se aplica às abas Formação e Competências nem Experiência Profissional.",
      },
      {
        subtitulo: "Documentos e revisão",
        texto:
          "Na aba Documentos, envie PDF ou imagens (até 15 MB por arquivo). A revisão periódica **só é concluída** quando o cadastro estiver **100% completo** — salvar parcialmente ou enviar apenas um documento **não** encerra o bloqueio. Você pode avançar por etapas nas abas; ao resolver a última pendência, a revisão é registrada automaticamente, ou use **Confirmar sem alterações** se nada mudou. Requisitos: todos os campos em Dados cadastrais (exceto Nickname); documentos obrigatórios do seu tipo de contrato (exceto Outros); ao menos 1 formação acadêmica e 1 idioma; ao menos 1 experiência profissional (exceto Estágio e Temporário). Enquanto houver pendências, **Confirmar sem alterações** permanece desabilitado e a lista aparece no banner de revisão.",
      },
      {
        subtitulo: "Formação e Competências",
        texto:
          "Cadastre formação acadêmica, idiomas (lista fixa da plataforma), cursos complementares e itens de portfólio. Vídeos e áudios entram por link externo; demais tipos aceitam URL ou arquivo (PDF, imagem ou Word, até 15 MB). Prestadores com vínculo encerrado consultam em modo leitura. Cada inclusão, alteração ou exclusão gera registro na aba Histórico.",
      },
      {
        subtitulo: "Experiência Profissional",
        texto:
          "Registre cargos e empresas onde trabalhou **antes** do vínculo na Spin — distinto da aba Histórico de trabalho (contratação atual, somente leitura). Informe cargo, empresa, mês/ano de início e, se houver, mês/ano de fim; sem data de fim o período aparece como «… — atual». Descrição opcional (até 500 caracteres). Alterações geram evento na aba Histórico.",
      },
    ],
  },
  rh_figurinos: {
    titulo: "Figurinos",
    blocos: [
      {
        texto:
          "A página de Figurinos gerencia o estoque de peças de roupa e acessórios utilizados pelos dealers nas transmissões. Permite cadastrar peças, registrar retiradas e devoluções, controlar manutenções e gerar etiquetas com código de barras para identificação física.",
      },
      {
        subtitulo: "Filtros e Consolidado",
        texto:
          "No topo, cinco cards (formato Financeiro — rótulo em caixa alta acima do valor) mostram **TOTAL DE PEÇAS**, **DISPONÍVEIS**, **EMPRESTADAS**, **FIXOS** e **EM MANUTENÇÃO**; os números refletem os filtros ativos.\n\nAbaixo, a barra de filtros (sem título de seção) reúne estúdio, categoria, tamanho, cor, gênero, pesquisa, bipagem e abas de status.",
      },
      {
        subtitulo: "Abas de Inventário",
        texto:
          "O inventário é dividido em cinco abas:\n— Disponíveis: peças prontas para retirada (colunas: Código, Estúdio, Categoria, Tamanho, Cor, Gênero, Classificação e Ações)\n— Emprestada: peças com retirada ativa do tipo Emprestada\n— Fixo: peças com retirada ativa do tipo Fixo\n— Manutenção: peças em costura, lavagem ou processo de descarte\n— Descartada: peças retiradas definitivamente do acervo\n\nNas abas Emprestada e Fixo não há coluna Tipo de retirada — o tipo já é definido pela aba.\n\nO campo de Pesquisa localiza peças por código, código de barras, categoria, estúdio ou nome de quem realizou a retirada.",
      },
      {
        subtitulo: "Bipar Código",
        texto:
          "O botão **Bipar código** abre um modal pronto para leitores USB que funcionam como teclado (modo teclado): aponte o leitor para a etiqueta e bipe — o número aparece no campo automaticamente e a busca é feita ao pressionar Enter (ou ao clicar em Buscar). Também é possível digitar o código manualmente. Para usar a câmera do dispositivo, expanda **Usar câmera (opcional)**. Se a peça estiver disponível, o sistema abre o fluxo de Retirada; se estiver com retirada ativa (Emprestada ou Fixo), abre o fluxo de Devolução.",
      },
      {
        subtitulo: "Cadastrar Peça",
        texto:
          "Ao cadastrar uma nova peça, o código é gerado automaticamente pelo sistema com prefixo das três primeiras letras da categoria (ex.: Camisa → CAM-000001, Vestido → VES-000001). Selecione **Staff** (acervo da equipe — pode combinar com um ou mais estúdios), **Todos Estúdios** (exclusivo — peça disponível em qualquer estúdio) ou estúdios específicos, além da categoria, do tamanho, do gênero (Masculino, Feminino ou Unisex), da cor (Branco, Preto, Cinza ou Único) e da data de entrada. Após salvar, o sistema exibe o código de barras gerado e permite baixar a etiqueta em PDF para impressão.",
      },
      {
        subtitulo: "Retirada e Devolução",
        texto:
          "Para registrar uma retirada, selecione a peça na tabela (ou bipe o código) e clique em Retirada. Busque o prestador pelo nome ou setor na lista da Gestão de Prestadores e escolha o tipo: Emprestada (temporário) ou Fixo (uso contínuo). A peça passa a aparecer na aba correspondente.\n\nNa devolução, informe a condição da peça: Boa condição, Possível descarte ou Manutenção. Peças devolvidas para manutenção exigem tipo e motivo.",
      },
      {
        subtitulo: "Manutenção e Descarte",
        texto:
          "Peças disponíveis podem ser enviadas para manutenção diretamente, sem passar por retirada. Tipos disponíveis: Costura, Lavagem, Perda e Descarte. Costura e Lavagem mantêm o status de manutenção; Perda e Descarte movem a peça para Descartada.\n\nPeças em manutenção podem ser Disponibilizadas (voltam ao estoque) ou Descartadas.\n\nEssas ações (**Manutenção**, **Disponibilizar** e **Descartar**) exigem permissão de **Criar** = Sim na página Figurinos.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso é definido em Gestão de Usuários → Permissões para a página Figurinos:\n— **Ver**: consulta inventário, detalhes e histórico.\n— **Editar**: Retirada e Devolução.\n— **Criar**: Cadastrar peça, enviar para Manutenção, Disponibilizar e Descartar.\n\nSem Criar/Editar, a área fica em modo consulta.",
      },
    ],
  },
  roteiro_mesa: {
    titulo: "Roteiro de Mesa",
    blocos: [
      {
        texto:
          "Repositório de materiais ao vivo por estúdio: campanhas com vigência e blocos de roteiro (Abertura, Durante o jogo e Fechamento) com scripts, orientações e alertas. O conteúdo alimenta a Central de Notificações — operadores veem campanhas vigentes e podem abrir conversas com o estúdio quando há solicitação vinculada.",
      },
      {
        subtitulo: "Filtros e estúdio",
        texto:
          "Selecione o estúdio na barra superior (quando o perfil tem acesso a mais de um). Com **Todos Estúdios**, gestores veem o inventário completo no escopo; cada item exibe a tag do estúdio.\n\nFiltros de Jogo (Todos, Blackjack, Roleta, Baccarat, Futebol Brasileiro) e Tipo (Script, Orientação, Alerta) refinam as sugestões dentro de cada bloco — não afetam o bloco de Campanhas.\n\nEm telas estreitas, os chips de filtro podem rolar horizontalmente; use o gesto de arrastar ou as setas do touchpad para ver todas as opções.",
      },
      {
        subtitulo: "Campanhas",
        texto:
          "O bloco Campanhas no topo reúne ações promocionais com título, texto, jogos aplicáveis e período de início/fim. Campanhas ativas no período aparecem para operadores na Central (badge VIGENTE). Gestores com permissão de Criar usam '+ Campanha' para cadastrar; exclusão exige permissão de Excluir.\n\nAo criar, é possível abrir uma thread de solicitação com o estúdio — o fluxo segue o mesmo padrão da Central de Notificações.",
      },
      {
        subtitulo: "Blocos de roteiro",
        texto:
          "Três blocos fixos organizam o material:\n\n— Abertura: scripts e orientações de boas-vindas e aquecimento da mesa.\n— Durante o jogo: conteúdo para o miolo da sessão (tendências, foco no jogo, dicas).\n— Fechamento: encerramento, ultimato e mensagens de despedida.\n\nEm cada bloco, '+ Roteiro' (permissão de Criar) abre o formulário de nova sugestão. O ícone de lápis ao lado de Excluir (permissão de Editar) abre o modal para alterar tipo, jogos e texto — o estúdio do item não muda na edição. Tipos Script, Orientação e Alerta definem o estilo visual do card. Tags de jogo indicam em quais mesas o material se aplica.\n\nOperadores com pendências de campanha podem ver o banner amarelo (quando aplicável) e abrir a conversa diretamente.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso é controlado em Gestão de Usuários → Permissões para a página Roteiro de Mesa:\n\n— Ver = Sim: consulta os roteiros e campanhas do escopo (operador: filtro de Estúdio limitado aos estúdios das suas operadoras).\n— Criar = Sim: botões '+ Roteiro' e '+ Campanha'.\n— Editar = Sim: botão Editar (lápis) nos cards de sugestão de roteiro.\n— Excluir = Sim: botão Excluir nos cards.\n\nSem Criar/Editar/Excluir, a página fica em modo consulta.",
      },
    ],
  },
  incidentes: {
    titulo: "Incidentes",
    blocos: [
      {
        texto:
          "Registre e acompanhe erros de mesa cometidos por Game Presenter ou Shuffler no período — de casos avulsos a erros que geraram (ou não) aviso à operadora e resolução do jogo. Cada registro recebe um protocolo único, mesa, prestador envolvido, tipo de erro (conforme o jogo), resolução aplicada e, quando necessário, anexos de evidência.",
      },
      {
        subtitulo: "Categorias de incidente",
        texto:
          "— **Caso**: ocorrência avulsa registrada para acompanhamento, sem necessariamente ser um erro técnico.\n— **Erro**: erro de mesa classificado de forma genérica (protocolo `ERRO-`).\n— **Oculto**: erro identificado mas não visível ao jogador nem à operadora.\n— **Não Avisado**: erro ocorreu e a operadora não foi avisada a tempo.\n— **Avisado/Resolvido**: erro avisado à operadora e o jogo foi corrigido ou seguiu válido.\n— **Avisado/Não Resolvido**: erro avisado à operadora, mas sem resolução (jogo cancelado ou encerrado incorretamente).\n\nNo formulário de Shuffler, o **Local do Shoe** (Em Jogo / Fora de Jogo) continua sendo registrado no incidente; os KPIs mostram só o total por categoria."
      },
      {
        subtitulo: "Filtros e KPIs",
        texto:
          "No topo, o carrossel de mês (com opção **Histórico** para ver todo o período) e o filtro de **Estúdio**. As abas **Tickets** e **Sinais** organizam a página.\n\nNa aba **Tickets**, o filtro de **Time** (**Todos Times**, **Game Presenter** ou **Shuffler**) e os filtros de **Staff**, **Incidente**, **Tipo** e **Relator** restringem a lista e os KPIs. Usuários com permissão de Ver = Próprios não veem Staff e Relator — a página já mostra só os incidentes em que estão envolvidos.\n\nA busca da aba Tickets localiza incidentes por protocolo, prestador, nickname ou mesa. A tabela pagina a lista (50 por página). Depois de registrar um incidente, os filtros que você tinha escolhido permanecem."
      },
      {
        subtitulo: "Aba Sinais",
        texto:
          "A aba **Sinais** mostra os totais dos sinais resolvidos pelos Service Managers (origem Grafana). No bloco de filtros, centralizados: **Todos Staff** (SM que atendeu) e **Todos Relatores** (quem abriu o sinal) — não há busca por ID ou mesa. Os KPIs consolidam, no período e com os filtros aplicados: **Totais de Sinais**, **TMA Total** (Issued → Resolved), **TMA de Atendimento** (Issued → Taken) e **TMA de Resolução** (Taken → Resolved), cada um com comparativo do mês anterior **no mesmo formato de relógio** (ex.: 00:54).\n\nO **Detalhamento Diário** resume por dia (America/Sao_Paulo): quantidade de sinais e as médias de TMA Total, de Atendimento e de Resolução.",
      },
      {
        subtitulo: "Registrar um incidente",
        texto:
          "Clique em **Novo Incidente** e informe: time (Game Presenter ou Shuffler), mesa e tipo, categoria e resolução (e, para Shuffler, local do shoe), prestador (lista do time na Gestão de Staff — pesquisa por nome ou nickname; em Game Presenter a lista mostra **Nickname - Nome**, em Shuffler **Nome - Nickname**), ID da rodada (ou marque **Não tem ID**), data e hora da rodada (hora em texto, placeholder `#HH:MM:SS`), se houve necessidade de payout e uma descrição do ocorrido.\n\n**Atalhos de teclado:** nos campos pesquisáveis Mesa e Prestador, digite para filtrar, use **↑/↓** para percorrer os resultados e **Enter** para selecionar. **Escape** fecha a lista. Use **Tab** (ou **Shift+Tab**) para avançar (ou voltar) entre os campos do formulário sem passar por cada opção da lista.\n\nPara vários tipos, a **Descrição** oferece scripts prontos (templates) acima do campo — use um deles, edite o texto ou escreva do zero. Se a descrição já tiver conteúdo, aplicar outro script pede confirmação antes de substituir. É possível anexar arquivos de evidência (botão, arrastar e soltar ou **colar com Ctrl+V** uma imagem/vídeo da área de transferência; tamanho máximo de 50 MB por arquivo). Imagens e vídeos anexados mostram **pré-visualização** com o nome do arquivo antes de salvar.\n\nSe for registrar vários tickets seguidos, use **Registrar e criar outro**: o incidente é salvo, o modal permanece aberto e alguns campos (como mesa e prestador) são mantidos para acelerar o próximo registro.",
      },
      {
        subtitulo: "Consultar um incidente",
        texto:
          "Clique no ícone de olho na linha da tabela para abrir os detalhes. Em **Dados do Incidente**: abertura, relator (nickname cadastrado na Gestão de Staff), data/hora da rodada, ID da rodada, mesa, prestador (**Nome - Nickname**) e time. Em **Descrição**: resolução, payout (e **Local do Shoe** para Shuffler), texto da descrição e anexos listados como **Arquivo 1**, **Arquivo 2**, … (com link para abrir).",
      },
      {
        subtitulo: "Editar um incidente",
        texto:
          "Com permissão de Editar = Sim, clique no ícone de lápis na coluna Ações. O formulário abre com os dados preenchidos — o **Protocolo** permanece somente leitura. Se você alterar a categoria **Incidente** para outra família (Caso, Erro ou Oculto), ao salvar o sistema gera um novo protocolo na série correspondente; o modal avisa antes. Trocar só o **Tipo** (texto do catálogo do jogo) não muda o protocolo. Novos anexos são adicionados aos já existentes. Ao concluir, use **Salvar Alterações**.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso é definido em Gestão de Usuários → Permissões para a página Incidentes:\n— **Ver = Sim**: consulta todos os incidentes do escopo.\n— **Ver = Próprios**: consulta apenas os incidentes em que o prestador está envolvido (sem colunas de Prestador, Time e Relator).\n— **Editar = Sim**: exibe o botão **Novo Incidente** e o ícone **Editar** na tabela.\n\nSem Editar = Sim, a página fica em modo consulta.",
      },
    ],
  },
  rh_gestao_escala: {
    titulo: "Escala Estúdio",
    blocos: [
      {
        texto:
          "Monta e mantém a escala operacional do **estúdio** por área (time ou gerência sem times), colaborador e dia do mês. Inclui grade diária, sugestão automática, aprovação e registro de alterações conforme permissões de Criar e Editar. O motor da página é o mesmo da **Escala Escritório** (menu RH), com modo Estúdio. As abas de time seguem esta ordem e abrem em **Game Presenter** por padrão: Game Presenter, Shuffler, Shift Leader, Service Manager e **Academy** (Performance Coach + Treinamento). Também entram gerências sem times ativos (pessoas vinculadas só à gerência).",
      },
      {
        subtitulo: "Fluxo da escala",
        texto:
          "A página abre na aba **Game Presenter** (com **Ver = Sim**). Com **Ver = Próprios**, aparece só a aba do **seu time** no Organograma — a grade dessa aba mostra todo o time. Selecione o time (ou gerência sem times) e o mês no carrossel. O filtro **Estúdios** fica em **Todos Estúdios** nas áreas Shuffler, Shift Leader, Service Manager e Academy; só na aba **Game Presenter** é possível escolher um estúdio específico ou **Nenhum** (ao sair de Game Presenter, o filtro volta a Todos Estúdios). No **Consolidado** (Game Presenter + Todos Estúdios), as setas de drilldown por estúdio começam **recolhidas** — abra o turno que desejar. Clique num **turno** do Consolidado para filtrar a Escala Diária pelos colaboradores com aquele **status no dia** (inclui Compra - Turno), alinhado à contagem. Use **Sugestão de Escala** ou preencha as células manualmente — na primeira alteração manual o botão de sugestão some e passam a aparecer **Salvar Alterações**, **Aprovar Escala** e **Nova Escala**. **Compra** e **Venda** não aparecem nas opções manuais: esses estados são preenchidos exclusivamente pela automação do Marketplace. Após salvar, qualquer nova edição na grade faz **Salvar Alterações** reaparecer. **Nova Escala** (em rascunho ou após aprovada) pede confirmação e limpa a grade gravada daquele mês/área. **Aprovar** também pede confirmação.\n\nNa **Escala Diária**, as colunas de fim de semana usam o mesmo estilo dos dias úteis; cada cabeçalho de dia tem um **filtro** (ícone) para escolher quais status ver, no estilo Excel. As células usam **cores por status** (Manhã e Compra - Manhã, Tarde e Compra - Tarde, Noite e Compra - Noite, Venda, Folga, Troca, etc.) em todas as abas de time.\n\nAo **aprovar**, o turno de cada prestador (e o horário cadastrado na Staff) fica **congelado** para aquele mês/área: mudar o turno depois na Gestão de Staff **não** altera a coluna Turno nem o calendário daquele mês aprovado. Com a escala aprovada, **Alterar Escala** (permissão de Editar) permite mudar o status **e o turno do dia** (Manhã, Tarde ou Noite) a partir de hoje, com observação obrigatória — a mudança aparece no Calendário e na Rotação. Na Escala Diária, dias de trabalho aparecem como **Manhã**, **Tarde** ou **Noite**. Prestadores enxergam a escala publicada no Calendário e no Overview Prestador, dentro do escopo liberado.",
      },
      {
        subtitulo: "Baixar Excel",
        texto:
          "O botão **Baixar Excel**, acima da barra de pesquisa da Escala Diária, gera uma planilha do time e do mês selecionados. A aba **Consolidado** traz um bloco por turno (Manhã, Tarde e Noite) com estúdio nas linhas, dias do mês nas colunas e uma linha de Total; a aba **Detalhado** traz Nome, Nickname, Turno, Estúdio e o status de cada dia. O arquivo respeita os filtros aplicados na tela (estúdio, turno e busca).",
      },
      {
        subtitulo: "Comentários do Marketplace",
        texto:
          "Células alteradas por uma negociação aceita no **Marketplace** exibem um ícone de comentário. Em **Compra**, o detalhe informa quem vendeu, o turno e o estúdio onde o prestador trabalhará. Em **Venda**, informa quem comprou. Em **Troca**, os dois prestadores veem com quem trocaram e qual turno/estúdio cada um assumirá. Os dados são registrados no momento da conclusão da negociação e permanecem vinculados à célula enquanto ela mantiver o valor gravado pelo Marketplace.",
      },
    ],
  },
  escala_escritorio: {
    titulo: "Escala Escritório",
    blocos: [
      {
        texto:
          "Monta e mantém a escala mensal dos times **e gerências sem times** de **escritório** (prestadores com área de atuação Escritório) por colaborador e dia. Reutiliza a mesma interface da **Escala Estúdio**, sem filtro de estúdio e com células **Comercial**, Folga, Compra, Venda e Troca. O time **Arte** não aparece nesta página. A **Gestão de Prestadores** não muda por esta página — só a grade operacional.",
      },
      {
        subtitulo: "Fluxo e Calendário",
        texto:
          "Selecione o time ou a gerência sem times (Organograma) e o mês no carrossel. Use sugestão ou edição manual, depois **Salvar Alterações** e **Aprovar Escala** (permissão de Criar). Só a grade **aprovada** aparece no **Calendário**; enquanto não houver aprovação, o Calendário continua com a escala comercial automática (úteis Escalado 09:00–18:00). Com a Escala Escritório aprovada, as células da grade prevalecem sobre essa regra sintética.",
      },
    ],
  },
  rh_staff: {
    titulo: "Gestão de Staff",
    blocos: [
      {
        texto:
          "Lista e edita prestadores dos times de Game Floor e Operation Management vinculados à operação de mesa — turnos, siglas e dados operacionais usados na escala e no calendário.",
      },
      {
        subtitulo: "Imprimir IDs",
        texto:
          "Na barra de pesquisa e filtros, o botão **Imprimir IDs** (permissão de **Editar**) abre um modal para selecionar prestadores dos times visíveis na Gestão de Staff. Com Ver **Próprios**, a lista e a impressão ficam só no **próprio time**. Ao gerar, a plataforma baixa um PDF em **folha A4** com até **8 etiquetas de 8×6 cm** por página (grade 2×4), com guia de corte: código de barras centralizado, número do barcode e nickname. Só entram na impressão quem já tem barcode cadastrado no modal de edição.",
      },
      {
        subtitulo: "ID TOS (Service Manager)",
        texto:
          "No time **Service Manager**, o campo **ID TOS** (modais Ver e Editar — não aparece na tabela) salva o UUID do colaborador no sistema TOS. Esse valor liga os sinais atendidos ao cadastro do SM. O **ID operacional** continua sendo o Work ID usado por Game Presenters. O valor deve ser um UUID; o servidor recusa formato inválido.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Consulta exige permissão de **Ver**; alterações de turno, estúdio, skills, dealer e **Imprimir IDs** exigem **Editar**. Com Ver ou Editar em **Próprios**, a lista, a edição e a impressão ficam só no time do seu cadastro de prestador (Game Floor / Operation Management). **Sim** vê todos os times da página. A busca restringe a tabela na tela — não há alterações em lote. Times **Service Manager**, **Shift Leader** e **Shuffler** ficam sempre em **Todos Estúdios**.",
      },
    ],
  },
  rh_calendario: {
    titulo: "Calendário",
    blocos: [
      {
        texto:
          "Visão operacional da rotina: turnos publicados, trocas, compromissos, controle de presença e justificativas. Integra escala aprovada, marketplace de turnos e solicitações atendidas pelo RH.",
      },
      {
        subtitulo: "Modos e filtros",
        texto:
          "Alterne entre Compromissos, Controle de Presença e Relatório de Presença. Os filtros de Time e Staff usam os vínculos ativos do Organograma e são atualizados automaticamente quando a estrutura muda. Gerências **sem times** aparecem no filtro Time (efeito cascata): ao selecioná-las, o Staff lista quem está vinculado diretamente à gerência.\n\nCom permissão de **Ver = Sim** e vínculo de colaborador no RH, a aba **Compromissos** abre com **Meu Calendário** ativo (só a sua grade). Para ver outras pessoas, escolha **Time** ou **Staff** (ou desligue Meu Calendário e filtre). Sem filtro, a grade da empresa inteira não é carregada. Com **Ver = Próprios**, quem é líder imediato vê o próprio calendário e a cascata que lidera; quem não é líder vê somente o próprio — sem mudança.\n\nNa aba **Compromissos**, o botão **Download** gera um PDF do **seu** calendário no mês do carrossel: título **Calendário - mês/ano**, subtítulo com nome e time, grade mensal (turno + horário ou Folga; reuniões como **Reunião - com quem**) e lista diária no formato data — dia da semana: situação — mesmo se a grelha estiver filtrada por outro time ou staff.\n\nA Situação (Escalado/Folga) e os turnos de **estúdio** vêm só da Escala Diária **aprovada** em **Escala Estúdio** — rascunho, sugestão ou dados só no navegador não aparecem no Calendário. Cada área (Game Presenter, Service Manager, etc.) precisa ser aprovada à parte. A Situação de **escritório** espelha a **Escala Escritório** aprovada quando existir; senão, aplica a regra comercial automática (ver abaixo). Se a Situação estiver em branco (—) mesmo após aprovar, atualize a plataforma (carga completa da grade).\n\nAções de presença e justificativa respeitam o escopo e dependem da permissão de Editar.",
      },
      {
        subtitulo: "Check-in e Check-out",
        texto:
          "O Check-in e o Check-out podem ser registrados mesmo quando o dia estiver como **Folga** ou **Venda**, inclusive em fins de semana e plantões emergenciais. A Situação permanece Folga/Venda; Entrada e Saída realizadas ficam registradas para aprovação posterior do gestor. Dias com **Compra** (ou Compra - Turno) seguem as mesmas regras de **Escalado** no Controle de Presença (Falta, Justificar e Aprovar).\n\nNa aba **Controle de Presença**, cada linha é o turno do dia — não o dia civil do relógio. Se o check-in for à noite (ex.: 20h) e a saída na manhã seguinte (ex.: 08h), o check-out fica na mesma linha do dia do check-in. O botão **Fazer Check-out** permanece disponível por 20 horas após o check-in.\n\nCorreções de horário (**Esquecimento**, **Outro** ou Correção) ficam **Em análise**: o líder imediato aprova **entrada e saída separadamente** no ícone de comentário de cada coluna. O próprio prestador não aprova a própria correção. Justificativa **Médico** segue para **Solicitações** (RH).",
      },
      {
        subtitulo: "Cards de Escalados, Trocas, Venda e Compra",
        texto:
          "Na aba **Controle de Presença**, os quatro cards somam **dias** do mês do carrossel para o prestador filtrado.\n\n**Trocas** conta os dias que vieram de uma **Oferta de Troca** aceita no Marketplace. Na Escala e no Calendário esses dias continuam a aparecer como **Venda** (o dia que você entregou) e **Compra - Turno** (o dia que você assumiu) — o card apenas reconhece a origem da negociação, então uma troca aparece como dois dias. Uma **Troca** lançada manualmente na Escala também entra aqui.\n\n**Venda** e **Compra** contam os dias das negociações de venda: cada dia entra em um único card, nunca em dois.",
      },
      {
        subtitulo: "Escritório e Horário Comercial",
        texto:
          "Prestadores com área de atuação **Escritório** e prestadores de **Estúdio** com turno **Comercial** (escala 5×2 / Horário Comercial) usam, por padrão, a mesma regra sintética no Calendário: de segunda a sexta-feira, Situação **Escalado**, Entrada programada às 09:00 e Saída às 18:00; sábados, domingos e feriados nacionais ou da cidade de São Paulo aparecem como **Folga**.\n\nQuando existir **Escala Escritório** **aprovada** para o prestador, essa grade (Comercial / Folga / Compra / Venda / Troca) **prevalece** sobre a regra sintética. Compra, Venda ou Troca na Escala Estúdio aprovada também prevalecem no dia.\n\nOs horários programados são referência para o controle: não limitam o momento do Check-in ou Check-out. Casos de adicional noturno serão tratados em uma evolução futura.",
      },
      {
        subtitulo: "Relatório de Presença",
        texto:
          "Aba disponível apenas com permissão de **Editar: Sim** no Calendário (Gestão de Usuários → Permissões). Quem tem **Editar: Próprios** não vê esta aba. Use o carrossel de **dia** e os filtros de **Time** e **Staff** (um de cada vez) para ver o Controle de Presença autorizado no dia selecionado. Selecione ao menos um dos filtros para carregar; as colunas são as mesmas da aba mensal, com **Prestador** no lugar de **Data**. Atestado médico de **vários dias**: o Relatório mostra um dia por vez — confira o período completo no **Controle de Presença** do mês.",
      },
    ],
  },
  escala_marketplace_turnos: {
    titulo: "Marketplace",
    blocos: [
      {
        texto:
          "Ponta única onde os prestadores de estúdio negociam turnos: **Venda de Turno**, **Venda de Folga** e **Oferta de Troca**. A aba **Todas as Ofertas** mostra o mural do período em três blocos — **Ofertas de Turno**, **Ofertas de Folga** e **Ofertas de Troca** — com a **Observação** de quem publicou em cada linha. Com **Ver: Próprios** há ainda **Minhas Ofertas** (o que você publicou e o que aceitou). Com **Ver: Sim** (gestão), no lugar de Minhas Ofertas aparece **Ofertas Encerradas**, com o histórico de aceites e cancelamentos de todos os prestadores. Vendas têm aceite imediato; na **Oferta de Troca**, o aceitante envia uma proposta e a escala só muda após o ofertante original aprovar — sem aprovação de gestor.",
      },
      {
        subtitulo: "O que você vê",
        texto:
          "Com permissão de **Ver: Próprios**, a lista traz as ofertas do **seu grupo de negociação** — o próprio time do Organograma ou, para Shift Leader e Service Manager, o grupo **Liderança** (os dois times) — e a aba **Minhas Ofertas**. Com **Ver: Sim** (gestão), aparecem as ofertas de todos os times, o filtro **Times** fica disponível na primeira linha (**Todos Times**, **Game Presenter**, **Shuffler** e **Liderança**) e a segunda aba é **Ofertas Encerradas** — **Ofertas aceitas** e **Ofertas Canceladas** de todos os prestadores, filtradas pelo time. A página abre com **Histórico** selecionado; desative-o para navegar pelo carrossel mensal. O filtro de ações fica na mesma linha do carrossel; as abas ficam na linha seguinte e a pesquisa por ofertante, estúdio ou turno na última linha. Na aba **Todas as Ofertas** há ainda o filtro de dia (**Todos os Dias**), que lista somente os dias com oferta no período — com mais de cinco dias, o painel do filtro abre com pesquisa.",
      },
      {
        subtitulo: "Publicar uma oferta",
        texto:
          "Com permissão de **Criar**, use **Nova Oferta**, à direita das abas. Os dias listados vêm de **todas** as competências com escala **aprovada** (não só o mês do carrossel) e exigem pelo menos **4h até o início do turno** ofertado ou desejado — ex.: às 6h, a Manhã de hoje (início 7h) não entra; a Tarde (início 15h) pode. **Venda de Turno** e **Oferta de Troca** listam dias em que você está escalado originalmente ou com **Compra - Turno**; **Venda de Folga** lista Folga e dias com **Venda** — nesse caso você se oferece para trabalhar e escolhe o turno (também filtrado pelas 4h e pelas 12h de intervalo). Em Venda de Turno e Venda de Folga você pode **marcar vários dias de uma vez**: cada dia marcado gera uma oferta independente no mural, com a mesma observação, e na Venda de Folga o turno é escolhido dia a dia. A **Oferta de Troca** continua com um dia por oferta, porque quem aceita escolhe o dia que entrega em troca. Só é possível ter uma oferta aberta por dia. Enquanto ninguém aceitar, você pode cancelar em Minhas Ofertas.",
      },
      {
        subtitulo: "Aceitar uma oferta",
        texto:
          "O aceite só é permitido entre prestadores do **mesmo time** — e, na **Liderança**, entre **Shift Leader** e **Service Manager** (nos dois sentidos) — e nunca na própria oferta. Dá para aceitar **no mesmo dia**, desde que restem pelo menos **2h até o início do turno**. Publicar uma oferta nova exige **4h**. Em **Venda de Turno** você precisa estar livre no dia e fica com **Compra - Turno** (o ofertante fica Venda). Em **Venda de Folga** quem aceita é o colega escalado no mesmo turno, que fica com **Venda** (o ofertante fica Compra - Turno). Na **Oferta de Troca**, você precisa estar livre no dia do ofertante e escolhe, entre os seus dias escalados, qual dia/turno propõe entregar. A proposta fica **Em análise**, sai do mural e aparece em **Minhas ofertas abertas** do ofertante, que pode aprovar ou recusar. Aprovar aplica as duas transferências; recusar libera os dias e devolve a oferta ao mural. Enquanto estiver Em análise, nenhum dos dois prestadores pode usar os dois dias em outra negociação. Se o aceite — ou a aprovação final da troca — não for concluído, a oferta é **cancelada automaticamente quando faltam menos de 2h para o início do turno** ou quando a **data já passou**, liberando as reservas sem alterar a escala. **Compra - Turno** se comporta como dia escalado e **Venda** como folga. Cada prestador permanece na **própria** Escala Estúdio (Shift Leader e Service Manager não se misturam numa aba só): o Calendário e os cards de Compra/Venda/Trocas refletem o dia de cada um.",
        },
      {
        subtitulo: "Intervalo mínimo de 12h",
        texto:
          "Nenhuma oferta ou aceite pode deixar menos de **12h** entre o fim de um turno e o início do seguinte. A plataforma calcula o intervalo com a sua escala, o turno de staff e os horários da operadora. Exemplo na Venda de Folga: escalado na Noite do dia 12 e de folga nos dias 13 e 14 — ao ofertar o dia 13 só a **Noite** fica disponível (Manhã e Tarde ficariam a menos de 12h do fim do turno); no dia 14 todos os turnos voltam a caber.",
      },
    ],
  },
  escala_relatorio_turno: {
    titulo: "Relatório de Turno",
    blocos: [
      {
        texto:
          "Registre a passagem de turno e o relatório de estúdio de forma estruturada — substitui o fluxo informal de mensagens. Duas abas: **Relatório do Turno** (escalados e absenteísmo por estúdio e Shufflers) e **Relatório de Estúdio** (SOS, sinais, payout e checklist de manutenção).",
      },
      {
        subtitulo: "Relatório do Turno",
        texto:
          "Com permissão de **Criar**, use **Novo Relatório**. A **Data do turno** é o dia em que o turno começou (ontem ou hoje) — não a data da publicação; o responsável fica travado no usuário logado. Informe o turno (Manhã, Tarde ou Noite), preencha um bloco por estúdio ativo (Game Presenters escalados e atrasos/faltas/atestados; Resumo é opcional), o bloco Shufflers e o campo Geral; depois **Publicar**. A lista mostra Escalados e Absenteísmo somados de todos os blocos.",
      },
      {
        subtitulo: "Relatório de Estúdio",
        texto:
          "Turno Manhã ou Noite. Campos obrigatórios numéricos: SOSs, Sinais e Payout, além do Resumo. A **Data do turno** é o dia em que o turno começou (não a data da publicação) — útil no turno noturno que fecha na manhã seguinte. Manutenção (Roletas, Mesas, Troca de Cartas por estúdio, CC Machine, Cartas Contadas) é checklist opcional.",
      },
    ],
  },
  escala_rotacao: {
    titulo: "Rotação",
    blocos: [
      {
        texto:
          "Cockpit operacional da **rotação** dos Game Presenters nas mesas — use ~30 min antes do turno. Substitui o Excel de Month Shift and Rotation. Duas abas: **Gerar Rotação** (pool, check-in, avisos e prévia) e **Rotação Atual** (consulta da publicada). Ao **aprovar** a Escala Estúdio na aba Game Presenter, a plataforma pode gerar **prévias** de todos os dias do mês.",
      },
      {
        subtitulo: "Gerar Rotação",
        texto:
          "Escolha o dia, o turno (Manhã, Tarde ou Noite) e um **estúdio**. O pool vem dos Game Presenters **escalados** na **Escala Estúdio** **aprovada** e, como reserva, dos **Shift Leads** do mesmo dia/turno. Cada chip mostra **Chegou** / **Não chegou** (ponto do Calendário). Marque faltas, **mova** um GP para outro estúdio só neste turno (figurino: 1 GP = 1 estúdio no turno) ou traga alguém de outro estúdio. **Gerar prévia** usa todos os GPs elegíveis: cobre **todas** as mesas; 1 pessoa por mesa; **intercala** mesas (não repete a mesma no horário seguinte); no máximo **2h** contínuas em mesa antes do Break (4×30 min ou 6×20 min); Shift Lead só para cobrir, com o mínimo de mesas. Intervalo padrão **30 min**. Se a cobertura ficar apertada, use **Aviso — intervalo 20 min** ou **Aviso — incluir Shift Lead** (nunca «emergência»). Chegada no meio do turno: **Incluir na rotação** redistribui só os slots futuros. Com permissão de **Criar**, **Publicar** grava a rotação.",
      },
      {
        subtitulo: "Rotação Atual",
        texto:
          "Consulta a rotação **publicada** para o mesmo dia, turno e estúdio. Células: **Número da Mesa**, **Break** ou **X** (falta). Sem publicação, a mensagem de vazio indica ausência de rotação no período.",
      },
    ],
  },
  escala_solicitacoes: {
    titulo: "Solicitações",
    blocos: [
      {
        texto:
          "Acompanhe solicitações de escala em aberto e o histórico arquivado — trocas, coberturas e pedidos operacionais distintos das solicitações de RH (atestados, reuniões, vagas) na seção RH.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Navegue por período, time e colaborador. Status em aberto aparecem na fila principal; arquivados ficam disponíveis no histórico conforme filtros de data e status.",
      },
    ],
  },
  academy_performance_hub: {
    titulo: "Performance Hub",
    blocos: [
      {
        texto:
          "Portal de avaliação de desempenho dos prestadores dos times **Game Presenter** e **Shuffler**. Consolida status das avaliações, fila de análise, agenda e configuração de pesos do scoring.\n\nO acesso é controlado em **Gestão de Usuários → Permissões**. Por padrão, todos os perfis começam bloqueados — apenas **Administrador** entra liberado; demais perfis precisam de permissão explícita de Ver, Criar ou Editar conforme a aba.",
      },
      {
        subtitulo: "Abas e permissões",
        texto:
          "**Avaliações** — exige permissão de **Ver** (inclui escopo Próprios para o prestador ver avaliações concluídas).\n\n**Gerenciamento** — exige permissão de **Editar**; agenda de avaliações e fila «Analisar Avaliações» (pendentes, em análise, feedback).\n\n**Configuração** — exige permissão de **Criar**; edição dos pesos das dimensões e critérios. Alterações valem só para **novas** avaliações (escala 0–10).",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Selecione o **time** (Game Presenter ou Shuffler) — não há opção «Todos». Use o carrossel de mês ou **Histórico** para ver a competência atual e as 12 anteriores (**Todo o período**). Com escopo amplo, filtre por **Staff** na barra (prestadores ativos ou indisponíveis daquele time no Organograma); com **Ver = Próprios**, a lista mostra apenas suas avaliações **Concluída**.",
      },
      {
        subtitulo: "Status e ações",
        texto:
          "**Pendente** — Ver e Histórico (sem notas).\n\n**Em Análise** — Ver, **Analisar** (modal com critérios 0–10) e Histórico.\n\n**Feedback** — Ver, **Analisar** (revisão em leitura, com **Aprovar** ou **Solicitar Feedback**) e Histórico.\n\n**Concluída** — Ver e Histórico; avaliações concluídas **não** exibem Analisar.\n\nPrestador (Próprios): **Ver minha avaliação** e Histórico nas concluídas.",
      },
      {
        subtitulo: "Vídeo da avaliação",
        texto:
          "O vídeo é obrigatório para concluir a avaliação e fica guardado em área privada — o link **Assistir** abre um endereço temporário, válido por 1 hora.\n\nGrave em **720p** para o arquivo ficar leve: o limite é **500 MB** por vídeo, e arquivos maiores são recusados já na seleção.\n\nPassados **90 dias** da conclusão da avaliação, o vídeo é apagado automaticamente e a coluna passa a exibir **Vídeo removido**. Notas, comentários e o nome do arquivo permanecem no histórico.",
      },
      {
        subtitulo: "Pontuação",
        texto:
          "Três dimensões — Comunicação, Mesa e Imagem — com pesos configuráveis. A **Nota Total** usa média ponderada (critérios → dimensões → total). KPIs MTD usam média simples das notas totais concluídas no período. Valores exibidos com duas casas decimais.",
      },
    ],
  },
  academy_portal: {
    titulo: "Portal da Academy",
    blocos: [
      {
        texto:
          "Central de **comunicados**, **dicas** e **manuais** de treinamento para a operação. As abas de leitura exibem apenas conteúdo **Publicado**; arquivados ficam na aba **Gerenciamento** (permissão de **Editar**).\n\nO acesso é controlado em **Gestão de Usuários → Permissões**. Por padrão, todos os perfis começam bloqueados — apenas **Administrador** entra liberado.",
      },
      {
        subtitulo: "Abas e filtros",
        texto:
          "**Comunicados** — sub-abas Todos, Treinamentos e Geral.\n\n**Dicas** e **Manuais** — sub-abas Todos, Jogos, Imagem, Comunicação e Geral.\n\nUse o carrossel de mês ou **Histórico** para ver a competência atual e as 12 anteriores (**Todo o período**). A busca ignora acentos e maiúsculas.",
      },
      {
        subtitulo: "Nova postagem",
        texto:
          "Na aba **Gerenciamento**, **Nova Postagem** abre o modal com tipos Comunicados, Dicas ou Manuais. Campos com asterisco são obrigatórios ao publicar. Dicas e manuais do tipo **Jogos** exibem **Qual Jogo?** — **multi-seleção** alimentada pelos jogos cadastrados em **Gestão de Estúdios** (coluna Jogo), sem duplicar.\n\n**Imagem/Vídeo** e **Anexo** usam o botão **Adicionar…** (sem a barra nativa do navegador). Os arquivos aparecem numa lista abaixo, com badge **Pendente** até salvar ou publicar; dá para remover itens antes do envio.\n\n**Manuais** incluem **Versão**, **Exige ciência do colaborador?** (Sim/Não), **Introdução** e **Descrição** — **sem** campo Código no modal. Quando a ciência for **Sim**, aparece **Aplicável a** (multi-seleção de times das gerências **Game Floor** e **Operation Management**, como em Gestão de Staff). O código é atribuído automaticamente no primeiro salvamento (3 primeiras letras da categoria + sequencial, ex.: Jogos → **JOG-000001**, Imagem → **IMA-000001**), com contador independente por tipo.",
      },
      {
        subtitulo: "Editar postagem e aprovação",
        texto:
          "A aba **Gerenciamento** aparece com permissão de **Editar** (Sim ou Próprios).\n\nCom Editar = **Próprios**, você cria só **Comunicados** e **Dicas**; o botão **Enviar para aprovação** coloca a postagem em **Aprovação**. Editar e Arquivar só nas postagens em que você é o autor.\n\nCom Editar = **Sim**, você cria também **Manuais**, publica direto e usa o botão **Aprovar** nas postagens em Aprovação.\n\nEm **Manuais**, ao abrir a edição a **Versão** sobe automaticamente (ex.: 1.0 → 2.0).",
      },
      {
        subtitulo: "Manuais — cards e ciência",
        texto:
          "A aba **Manuais** lista os documentos em **cards**: código, tipo, título, **introdução** (texto do cadastro), jogos, versão e status da sua ciência.\n\nQuando o tipo do manual **não** é **Jogos**, os jogos mostram **Todos os Jogos** (preenchido automaticamente ao salvar — o campo **Qual Jogo?** não aparece no modal).\n\nClique em **Visualizar** para abrir o manual — o modal mostra introdução, descrição, **imagens/vídeos** e **anexos**. Quando a postagem exige ciência **e** você pertence a um dos times em **Aplicável a**, confirme com **Lido e Ciente**. Com **Editar = Sim**, o botão **Ver ciência** lista quem já registrou o aceite.",
      },
    ],
  },
  playbook_influencers: {
    titulo: "Playbook Influencers",
    blocos: [
      {
        texto:
          "O Playbook reúne todas as diretrizes que orientam o criador durante suas transmissões ao vivo com a Spin Gaming. O objetivo é garantir alinhamento com a operação, posicionamento correto de marca e a melhor experiência para o público.\n\nAs seções são divididas entre leitura livre e itens obrigatórios, que exigem confirmação formal de ciência antes de transmitir.",
      },
      {
        subtitulo: "Navegação por Abas",
        texto:
          "O conteúdo está organizado em oito abas: Posicionamento, Dealers, Agendamento, Jogos, Side Bets, Situações Técnicas, Fun Facts e Acesso aos Jogos.\n\nAs abas marcadas como OBRIGATÓRIO exigem confirmação de leitura. As abas sem marcação são de leitura livre e não bloqueiam nenhuma funcionalidade.\n\nCom o foco na lista de abas, use as setas ← → do teclado para alternar entre as seções.",
      },
      {
        subtitulo: "Itens Obrigatórios e Confirmação de Ciência",
        texto:
          "Dealers, Agendamento e Jogos são os três itens obrigatórios. Cada um apresenta um bloco de confirmação ao final do conteúdo.\n\nPara confirmar: marque a caixa declarando que leu e compreendeu as regras, depois clique em Confirmar Ciência. A confirmação é registrada com data e hora e não pode ser desfeita.\n\nUma barra de progresso no topo da página indica quantos dos três itens foram confirmados. Quando todos forem concluídos, a página exibe um banner de conclusão e o status muda para Playbook concluído.",
      },
      {
        subtitulo: "Aba Jogos — foco obrigatório",
        texto:
          "Na aba Jogos, a seção «Foco obrigatório — Live Cassino SPIN» exige que Blackjack, Roleta, Baccarat e Futebol Brasileiro ocorram exclusivamente nas mesas Spin Gaming — nunca em mesas de provedores concorrentes (Evolution, Pragmatic Play, Playtech ou equivalentes). Slots seguem regra separada com limite de tempo por hora de live.",
      },
      {
        subtitulo: "Barra de Progresso",
        texto:
          "A barra abaixo do cabeçalho mostra o avanço nas confirmações obrigatórias. Ela só aparece para influencers com confirmações pendentes. Quando todos os itens estiverem confirmados, a barra é substituída pelo banner de conclusão.",
      },
      {
        subtitulo: "Dots de Status nas Abas",
        texto:
          "Abas obrigatórias exibem um pequeno círculo colorido ao lado do label:\n— Vermelho: item ainda não confirmado\n— Verde: confirmação já registrada\n\nEsses indicadores somem quando todos os itens obrigatórios estão confirmados.",
      },
      {
        subtitulo: "Painel de Auditoria (Gestores)",
        texto:
          "Gestores, administradores e executivos visualizam um painel adicional em cada aba obrigatória, logo abaixo do conteúdo.\n\nO painel lista quais influencers já confirmaram a ciência daquele item e quais ainda estão pendentes, com data e hora de cada confirmação. Apenas influencers ativos com perfil cadastrado aparecem na listagem.",
      },
      {
        subtitulo: "Badge de Status no Cabeçalho",
        texto:
          "No canto superior direito do cabeçalho:\n— Para gestores: exibe quantos influencers confirmaram todos os itens obrigatórios (ex: 31 de 34 influencers confirmaram tudo).\n— Para influencers: exibe o progresso próprio (ex: 2 de 3 itens obrigatórios confirmados) ou o badge verde Playbook concluído quando tudo estiver confirmado.",
      },
    ],
  },
  links_materiais: {
    titulo: "Links e Materiais",
    blocos: [
      {
        texto:
          "A página Links e Materiais é onde influencers e afiliados geram o link de rastreamento exclusivo para a Casa de Apostas. O link é único por pessoa e deve ser usado em todas as divulgações, pois é ele que registra o desempenho de aquisição.",
      },
      {
        subtitulo: "Abas Influencers e Afiliados",
        texto:
          "A página tem duas abas com a mesma experiência de emissão, cada uma com URL base própria:\n— Influencers: link de rastreamento do canal de influencers.\n— Afiliados: link de rastreamento do canal de afiliados.\n\nA visibilidade depende da permissão de Ver em Gestão de Usuários:\n— Ver = Sim: as duas abas e o filtro com todos os influencers ou afiliados da aba.\n— Ver = Próprios: apenas o próprio link; Influencer ou Agência vê só a aba Influencers; Afiliado vê só a aba Afiliados.",
      },
      {
        subtitulo: "Link de Rastreamento",
        texto:
          "O link é formado por uma URL base fixa (conforme a aba) seguida de um parâmetro UTM personalizado.\n\nPara Influencers, o UTM usa o nome artístico do perfil. Para Afiliados, o UTM usa o nome (não há nome artístico).\n\nPara gerar:\n— O campo UTM é preenchido automaticamente com o identificador do perfil na aba ativa.\n— Edite o UTM se desejar um identificador diferente — apenas letras sem acento, números e _ (underscore) são permitidos, sem espaços.\n— Clique em Emitir para registrar o link. Uma vez emitido, o link não pode ser alterado.\n— Após a emissão, o link completo aparece na tela com um botão Copiar.",
      },
      {
        subtitulo: "QR Code do Link",
        texto:
          "Após emitir o link, três formatos de QR Code ficam disponíveis para download:\n— Apenas o QR Code: imagem limpa do código, fundo branco.\n— Gradiente escuro: QR Code no quadro Spin Gaming com fundo escuro em gradiente azul/roxo.\n— Gradiente claro: QR Code no quadro Spin Gaming com fundo claro em gradiente roxo/vermelho.\n\nTodos os formatos são exportados em PNG de alta resolução, prontos para uso em redes sociais, stream e materiais impressos.",
      },
      {
        subtitulo: "Emissão por Gestores",
        texto:
          "Quem tem permissão de Criar = Sim pode emitir o link em nome de qualquer influencer ou afiliado. Na aba ativa, selecione a pessoa no campo acima do UTM antes de clicar em Emitir.\n\nCom Criar = Próprios, só é possível emitir o próprio link (Influencer/Afiliado) ou, no caso de Agência, para influencers do próprio escopo.\n\nSe a pessoa já tiver um link emitido naquele canal, ele será exibido automaticamente ao selecionar o nome na lista.",
      },
      {
        subtitulo: "Requisitos para Emissão",
        texto:
          "Na aba Influencers, o influencer precisa ter o perfil completo e o Playbook confirmado para emitir o link. Se algum desses requisitos não estiver atendido, a plataforma exibirá um aviso indicando o que falta e oferecerá um atalho direto para a página correspondente.",
      },
    ],
  },
  spin_na_rede: {
    titulo: "Spin na Rede",
    blocos: [
      {
        texto:
          "A página Spin na Rede reúne citações e menções públicas à Spin Gaming em notícias, portais e feeds indexados automaticamente. É uma vitrine das aparições da marca na mídia, atualizada pelo agregador de RSS configurado pela equipe.",
      },
      {
        subtitulo: "Como funciona",
        texto:
          "Os itens aparecem automaticamente quando o agregador RSS capta uma publicação que menciona a Spin Gaming e ela passa pelo filtro de relevância. Cada cartão exibe o título da matéria, um trecho do conteúdo, a data de publicação, a fonte e um link direto para o artigo original.\n\nAs miniaturas são carregadas a partir da imagem da própria matéria quando disponível — se a imagem não carregar, o cartão aparece sem ela.",
      },
      {
        subtitulo: "Navegação",
        texto:
          "Os itens são exibidos do mais recente ao mais antigo. Não há filtros por período — toda a listagem disponível é mostrada de uma vez.\n\nPara acessar a matéria completa, clique em Ir para a matéria, que abre o artigo original em uma nova aba.",
      },
      {
        subtitulo: "Excluir menção",
        texto:
          "Perfis com permissão de Excluir veem o ícone vermelho no canto inferior direito de cada cartão. O clique abre a confirmação padrão da plataforma; ao confirmar, a menção sai da listagem local — o artigo na fonte externa não é alterado.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "A visualização está disponível para perfis com permissão de Ver em Spin na Rede. Quem tem permissão de Excluir vê o ícone de exclusão no canto inferior direito de cada cartão — abre o pop-up padrão de confirmação antes de remover a menção do índice. Criar e editar seguem a matriz em Gestão de Usuários (ingestão RSS é automática).",
      },
    ],
  },
  informativos: {
    titulo: "Informativos",
    blocos: [
      {
        texto:
          "A página Informativos permite criar avisos direcionados a um ou mais perfis da plataforma. O conteúdo publicado é exibido na Home dos usuários cujo perfil foi selecionado na postagem.",
      },
      {
        subtitulo: "Aba Informativos",
        texto:
          "Lista os informativos já publicados, filtrados por mês (data de postagem), modo Histórico (competência atual e 12 anteriores) e busca por palavras-chave no assunto ou na descrição.",
      },
      {
        subtitulo: "Gerenciamento de Informativos",
        texto:
          "Visível apenas para quem tem permissão de editar nesta página. Inclui tabela com todos os status (rascunho, aprovação, publicado, arquivado), filtros de status, carrossel de mês, Histórico e ações por linha: editar, aprovar, arquivar (ícone Archive + pop-up de confirmação), histórico de alterações e excluir (ícone vermelho + pop-up de confirmação, quando liberado). Use Novo Informativo para criar; no modal informe assunto, descrição com formatação e os perfis que verão o aviso na Home (Administrador e Executivo não entram como destino). Ao marcar o perfil Operador, escolha também a operadora de destino (operadoras com status Ativa em Gestão de Operadoras) ou a opção Todos.\n\nPublicação direta só quando o informativo for apenas para perfis de Estúdio ou Escritório (RH, Prestadores, Figurino, etc.). Se incluir Investidor, Operador, Agência, Influenciador, Afiliado ou qualquer Gestor de departamento, use apenas Enviar para aprovação.\n\nQuem pode aprovar: Investidor ou Operador → Administrador ou Executivo; Agência, Influenciador ou Afiliado → Administrador, Executivo ou Gestor de Aquisição; gestores de departamento → Administrador, Executivo ou Gestor de RH. Se misturar grupos, vale a regra mais restritiva. Apenas Administradores podem aprovar a própria postagem — os demais precisam de outro usuário.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Ver, criar, editar e excluir são configurados em Gestão de Usuários para a página Informativos. Sem permissão de visualização, a página não aparece no menu.",
      },
    ],
  },
  rh_solicitacoes: {
    titulo: "Solicitações",
    blocos: [
      {
        texto:
          "Centraliza o atendimento de pedidos de prestadores ao RH — atestados médicos, reuniões com RH e solicitações ligadas a vagas internas. Perfis com permissão de Editar podem registrar o parecer e alterar o status.\n\nAo registrar uma justificativa **Médico** no **Calendário** (Controle de Presença), uma solicitação do tipo **Atestado** é criada automaticamente nesta fila, com status **Em análise**.\n\nAo **agendar reunião com RH** no **Calendário** (Compromissos), uma solicitação do tipo **Reunião com RH** entra nesta fila. A reunião só aparece nos calendários do solicitante e do RH que aprovar após o atendimento.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O carrossel de status navega entre Em análise, Aprovado e Rejeitado (padrão ao abrir: Em análise). O botão **Todos Status** amplia a lista para qualquer situação.\n\nÀ direita, o filtro **Tipo de solicitação** restringe a Atestado, **Reunião com RH** ou Vagas, ou exibe **Todas Solicitações**.",
      },
      {
        subtitulo: "Tabela e ações",
        texto:
          "Com o carrossel em **Em análise**, a tabela mostra descrição (período do atestado ou data da reunião com RH) e os ícones **Ver** e **Atender** (com permissão de Editar). Em **Todos Status**, a coluna **Status** substitui a descrição; **Atender** só aparece para solicitações ainda **Em análise**.\n\nCom o carrossel em **Aprovado** ou **Rejeitado**, as colunas passam a **Atendido** (quem aprovou ou rejeitou) e **Data do Atendimento**; só o ícone **Ver** fica disponível.\n\nNo **Ver** de solicitações já atendidas, use as abas **Solicitação** (dados do pedido; atestado inclui período e anexo) e **Atendimento** (data, responsável, observação do RH; atestado inclui abono remunerado). No **Atender** (Em análise), defina status e observação do RH (obrigatória ao alterar o status). Com status **Aprovado** em **Atestado**, informe **Abono remunerado?** (**SIM** ou **NÃO**).\n\nAo **aprovar** um atestado: a **Escala** grava **Atestado** em todos os dias entre início e fim (incluindo Folga e Venda); vendas de Folga ainda abertas no **Marketplace** nesse período são **canceladas**. No **Calendário** (Controle de Presença), com abono **SIM** o Status fica **Abonado** nos dias que eram Escalado, Troca ou Compra (demais dias mantêm o Status anterior); com abono **NÃO** o Status fica **Atestado** em todos os dias do período.",
      },
    ],
  },
  cs_atendimento: {
    titulo: "Atendimento",
    blocos: [
      {
        texto:
          "Gerencia chamados do formulário de contato do site Spin, e-mails recebidos em **contato@spingaming.com.br** e interações do Instagram (**@spingamingbrasil**). A equipe acompanha protocolo, registra anotações e altera o status conforme o atendimento avança.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O carrossel de status navega entre **Aberto**, **Em Andamento** e **Arquivado** (padrão ao abrir: Aberto). **Todos Status** amplia a lista. O filtro **Staff** restringe por responsável, **Nenhum** (sem atendente atribuído) ou prestadores do time **Service Manager** no organograma.\n\nAs abas **Site Spin**, **E-mail** e **Instagram** separam a origem dos chamados. Na aba **E-mail**, o solicitante é o endereço do remetente e a tabela inclui a coluna **Assunto**. Na aba **Instagram**, dois blocos — **Mensagens** (DM) e **Comentários** — compartilham os mesmos filtros de status e Staff.",
      },
      {
        subtitulo: "Tabela e ações",
        texto:
          "As colunas mudam conforme o status selecionado. Chamados **arquivados** exibem **SLA** (tempo entre abertura e arquivamento). Na aba Instagram — **Mensagens**, **Em Andamento** mostra **Tempo de Resposta** (primeira resposta da Spin); em **Todos Status**, a coluna **SLA** combina essas regras por status. Novos chamados chegam **sem atendente**; ao **alterar o status** no modal **Atender**, o usuário logado passa a constar como **Atendente**. **Ver** abre dados conforme a origem; Instagram DM exibe a thread e **Histórico interno**; comentários exibem o post e o texto. O campo **Responder no Instagram** aparece desabilitado (Fase 2) até a integração com a Meta. **Atender** (permissão de Editar) permite alterar status e registrar anotação — obrigatória ao mudar o status.",
      },
    ],
  },
  rh_portal: {
    titulo: "Portal de RH",
    blocos: [
      {
        texto:
          "O Portal de RH centraliza os comunicados oficiais, as políticas e normativas internas e as atas das RH Talks. É o canal oficial da equipe de RH para comunicação com todos os colaboradores da Spin Gaming.",
      },
      {
        subtitulo: "Comunicados",
        texto:
          "Reúne avisos oficiais publicados pelo RH, organizados por categoria: Urgente, Geral, Pagamento e Eventos.\n\nComunicados marcados como Novo indicam que ainda não foram lidos. Clique em Lido para registrar a leitura — o badge desaparece após o clique.\n\nO texto do comunicado aparece completo no card. No rodapé, o autor é mostrado com o **time** do organograma (não a diretoria pai).\n\nCom permissão de **Editar = Sim**, o botão **Ver Lidos** no card abre a lista de quem já marcou a leitura.\n\nUm comunicado pode ser fixado no topo da lista para maior visibilidade. Quando fixado, aparece antes dos demais com o indicador Fixado.",
      },
      {
        subtitulo: "Filtros e Navegação de Comunicados",
        texto:
          "Use o carrossel de meses para navegar por período com base na data de publicação. Os pills de categoria (Todos, Urgente, Geral, Pagamento, Eventos) filtram por tipo.\n\nO botão Histórico exibe as postagens publicadas na competência atual e nas 12 anteriores (Todo o período) — o carrossel de mês fica desabilitado nesse modo. Postagens arquivadas não aparecem nestas abas de leitura.\n\nA barra de pesquisa filtra por palavras no título ou no corpo do comunicado.\n\nCom o foco na lista de abas do portal, use as setas ← → do teclado para alternar entre Comunicados, Políticas, RH Talks e Gerenciamento (quando disponível).",
      },
      {
        subtitulo: "Políticas e Normativas",
        texto:
          "Lista documentos oficiais (políticas RH, procedimentos, códigos de conduta e normas operacionais) em **cards**: código, tipo, título, **objetivo** (texto preenchido no cadastro), versão, aplicabilidade e status da sua ciência.\n\nCom permissão de Ver = Sim, você visualiza todas as políticas publicadas. Com Ver = Próprios, visualiza apenas as políticas aplicáveis a Todos os prestadores ou à sua diretoria, gerência ou time. Usuários com Editar = Sim visualizam todas as postagens, acessam o Gerenciamento e o botão **Ver ciência** em cada card (lista quem já registrou o aceite).\n\nUse os filtros por família (Políticas RH, Procedimentos, Códigos, Operações) para restringir a lista. Clique em **Visualizar** para abrir o PDF e, quando aplicável, registrar sua ciência.",
      },
      {
        subtitulo: "RH Talks",
        texto:
          "Reúne as atas das reuniões periódicas do RH com colaboradores.\n\nCada RH Talk tem um número sequencial, título e uma introdução. Clique em Ver Ata para abrir o conteúdo completo. Algumas atas são restritas a participantes: se você não estava na reunião, o botão Ver Ata estará desabilitado e um aviso informará a restrição.",
      },
      {
        subtitulo: "Gerenciamento de Postagens (Gestores)",
        texto:
          "Disponível apenas para usuários com permissão de Editar = Sim no Portal de RH. Editar = Próprios não libera esta aba.\n\nA aba exibe uma tabela com postagens (comunicados, políticas e RH Talks), incluindo arquivadas, com colunas de assunto, autor, tipo, datas e status.\n\nAções disponíveis por status:\n— Rascunho: Editar\n— Em aprovação: Editar, Aprovar\n— Publicado: Editar (modal Salvar alterações), Arquivar (ícone Archive + pop-up de confirmação)\n— Qualquer status: ver Histórico de alterações (registro de alterações da postagem, na linha da tabela)\n\nO carrossel de mês e o botão Histórico usam a data de publicação. O Histórico na barra mostra a competência atual e as 12 anteriores; o filtro Status da postagem (incluindo Arquivado) define o que aparece na tabela. Use também os filtros de tipo e a busca por palavras-chave. Clique em Nova Postagem para redigir um novo conteúdo.",
      },
      {
        subtitulo: "Criar e Publicar Postagens",
        texto:
          "Ao criar uma postagem, selecione o tipo (Comunicado, Política/Normativa ou RH Talk). Campos marcados com asterisco vermelho são obrigatórios para publicar.\n\nPolíticas e normativas novas usam cadastro normativo: tipo de documento, código, versão, PDF obrigatório, área responsável, classificação, aplicabilidade, resumo e documentos relacionados. Comunicados e RH Talks mantêm o editor de texto e anexos opcionais.\n\nSalvar grava como rascunho sem publicar. Publicar torna o item visível imediatamente (ou envia para aprovação, no caso de políticas que exigem aprovação).",
      },
    ],
  },
  banca_jogo: {
    titulo: "Banca de Jogo",
    blocos: [
      {
        texto:
          "A página Banca de Jogo gerencia as solicitações de banca que os influencers fazem para cada operadora participante. O fluxo passa por três etapas: Solicitado (pedido do influencer ou agência), Aprovado (validado internamente) e Liberado (valor entregue). A página também exibe o consolidado de bancas por influencer com o status da conta em cada operadora.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Navegue pelos meses com as setas ou ative o Histórico para ver as solicitações de 13 competências mensais — a atual e as 12 anteriores (rótulo **Todo o período**). O filtro de Influencers (pill, **Todos Influencers** por defeito; pesquisa no painel com mais de cinco nomes) permite selecionar nomes específicos; o de operadora restringe à plataforma escolhida.\n\nO filtro de operadora só aparece para perfis de gestão — influencers e agências veem apenas seus próprios dados.",
      },
      {
        subtitulo: "Solicitações",
        texto:
          "No bloco **Solicitações** (título de seção padrão), a tabela lista os pedidos em aberto (Solicitado ou Aprovado). Cada linha exibe o influencer, seu perfil (Ativo/Inativo/Cancelado), o ID da conta na operadora, o CPF mascarado — clique no ícone de olho para revelar temporariamente —, o valor e o status atual.\n\nInfluencers e agências podem criar novas solicitações pelo botão **Solicitar Banca** na mesma linha do título (ícone + no padrão de criação da plataforma). Para concluir o cadastro ou aceitar o Playbook, o sistema exibe um aviso e bloqueia a solicitação até que a pendência seja resolvida.\n\nPerfis de gestão interna podem Aprovar, Recusar ou Liberar cada solicitação. A ação de Excluir (ícone vermelho) abre o pop-up padrão de confirmação e remove a solicitação de forma irreversível.",
      },
      {
        subtitulo: "Consolidado de Bancas",
        texto:
          "No bloco **Consolidado de bancas**, a busca por nome ou e-mail fica logo abaixo do título. A tabela lista todos os influencers com ao menos uma solicitação no período. Clique em qualquer linha para expandir o histórico de bancas daquele influencer com datas, valores e status de cada transação.\n\nA coluna Status da Conta indica se a conta do influencer na operadora está Liberada ou Bloqueada. Perfis de gestão podem alterar o status diretamente clicando no badge — o modal exibe uma recomendação de manter a conta Bloqueada durante ações ativas para evitar saques indevidos.",
      },
    ],
  },
  afiliados: {
    titulo: "Afiliados",
    blocos: [
      {
        texto:
          "Afiliados centraliza o cadastro de parceiros que atuam como afiliados na plataforma. Diferente dos influencers, os afiliados são parceiros comerciais que operam canais de aquisição e tráfego — não necessariamente criadores de conteúdo. A página oferece gestão completa de perfil, dados financeiros e vínculos com operadoras.",
      },
      {
        subtitulo: "Quadros de Resumo",
        texto:
          "Dois quadros exibem o Total de Afiliados (com contagem por status: Ativo, Inativo, Cancelado) e a quantidade de Perfis Incompletos entre afiliados ativos. Clicar no nome de um perfil incompleto abre diretamente o modal de edição.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O bloco de filtros oferece:\n\n— Status: chips para Ativo, Inativo e Cancelado\n— Operadora: seletor para restringir à operadora escolhida\n— Busca por texto: nome artístico ou e-mail\n\nO botão Limpar filtros reseta todos os critérios de uma vez.",
      },
      {
        subtitulo: "Visualizar e Editar Perfil",
        texto:
          "Cada card tem botões Ver (somente leitura) e Editar. O perfil é organizado em abas com navegação por teclado (← → entre abas; Esc fecha o modal):\n\n— Cadastral: nome artístico, nome completo, e-mail, telefone e CPF\n— Operação: descrição livre do modelo de trabalho do afiliado (textarea; exibida com quebras de linha no Ver)\n— Financeiro: chave PIX, banco, agência e conta (todos obrigatórios para salvar)\n— Operadoras: vínculos ativos com IDs específicos por operadora\n— Histórico: datas de criação, última atualização e última alteração de status (somente na aba Visualizar)\n\nDados sensíveis (CPF, dados bancários) ficam ocultos por padrão no Ver e requerem clique no ícone de olho para revelar por 10 segundos; no Editar ficam visíveis.",
      },
      {
        subtitulo: "Campos Obrigatórios",
        texto:
          "Para salvar o perfil de um afiliado, todos os campos financeiros são obrigatórios: Chave PIX, Banco, Agência e Conta. Isso diferencia os afiliados dos influencers, onde os dados bancários são opcionais. Campos marcados com asterisco vermelho são obrigatórios.",
      },
      {
        subtitulo: "Status e Permissões",
        texto:
          "Alteração de status (Ativo/Inativo/Cancelado) é restrita a Gestores e Admin. Afiliados visualizam e editam apenas seu próprio perfil. Operadores visualizam apenas os afiliados de sua operadora. Esta página não oferece exclusão de cadastro — use Network para remover prospectos ou contate um administrador para desativar acesso.",
      },
    ],
  },
  afiliados_network: {
    titulo: "Network",
    blocos: [
      {
        texto:
          "Network é o funil de prospecção de novos afiliados. Registra candidatos em Visualizado, Contato, Negociação ou Fechado e, ao salvar um registro que ainda não tem usuário na plataforma, pode criar automaticamente o acesso de afiliado (e-mail e operadora obrigatórios) — isso não exige status Fechado.",
      },
      {
        subtitulo: "Funil de Prospecção",
        texto:
          "Quatro cards no topo mostram a contagem por estágio: Visualizado → Contato → Negociação → Fechado. Clicar em um card filtra a lista para aquele estágio. Por padrão, registros com status Fechado não aparecem na listagem — clique no card Fechado para visualizá-los.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O bloco de filtros oferece busca por texto (nome ou e-mail) e o Limpar filtros reseta tudo, incluindo os filtros do funil. O filtro por status é feito diretamente nos cards do funil.",
      },
      {
        subtitulo: "Lista de Prospectos",
        texto:
          "Com permissão de criar, use **Novo Afiliado** (botão com ícone + e gradiente de criação) na barra de filtros para abrir o cadastro de prospecto.\n\nCada card exibe nome, status do funil, uma prévia do campo Operação (truncado em 2 linhas) e flags na parte inferior quando preenchidas: **Live Cassino** (roxo), **Operadora** (cor do brand guide), **Origem** (cinza), **Registrado** (índigo — quem cadastrou na plataforma). Prospectos do site público não exibem Registrado até atribuição manual. O botão Ver abre o modal de visualização completa. O botão Editar abre o formulário de edição. Pressione Esc para fechar qualquer modal.",
      },
      {
        subtitulo: "Cadastro e Edição",
        texto:
          "O formulário é organizado em abas (Contato, Operação, Anotações), com navegação por teclado (← →) e Esc para fechar.\n\nAbaixo de Nome e Status (Ver / Editar), **Registrado por** e **Data de Registro**; **Atribuir a mim** quando registrador vazio (ex.: site Spin).\n\n— Contato: e-mail, telefone, tipo de contato (Direto, Agência, Site Spin), Live Cassino e operadora\n— Operação: descrição livre das atividades\n— Anotações: histórico salvo com 'Adicionar Anotação'\n\nEnquanto o registro não tiver usuário na plataforma, o modal exibe aviso de que e-mail e operadora serão obrigatórios ao salvar. Depois da criação, e-mail e operadora ficam bloqueados.",
      },
      {
        subtitulo: "Criação de usuário na plataforma",
        texto:
          "Sempre que você salva um prospecto (novo ou existente) que ainda não tem usuário na plataforma, o sistema exige e-mail e operadora e aciona a criação automática do perfil Afiliado, do cadastro de perfil e do vínculo com a operadora — em qualquer status do funil, não só em Fechado.\n\nO botão exibe 'Salvando...' durante o processo. Se a criação falhar, o prospecto permanece salvo no Network e uma mensagem vermelha descreve o erro (ex.: e-mail já cadastrado). Após sucesso, o parceiro aparece em Afiliados e pode receber e-mail de boas-vindas quando o envio estiver configurado.",
      },
      {
        subtitulo: "Anotações",
        texto:
          "Cada prospecto tem um histórico de anotações com autoria e data. **Registrado por** e **Data de Registro** referem-se ao cadastro na plataforma e aparecem no cabeçalho do modal (abaixo de Nome e Status), não na aba Anotações. Anotações são salvas individualmente ao clicar em 'Adicionar Anotação'.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        texto:
          "A página Financeiro centraliza a gestão de pagamentos dos influencers, organizada em ciclos semanais que vão de quinta a quarta-feira. Aqui é possível acompanhar o status de cada pagamento — desde a análise até a confirmação —, visualizar estimativas do ciclo em aberto e consultar o histórico consolidado por influencer.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses e o botão Histórico para ver os ciclos de 13 competências mensais — a atual e as 12 anteriores (rótulo **Todo o período**). O filtro de Influencers (pill, **Todos Influencers** por defeito; pesquisa no painel com mais de cinco nomes) permite focar em um ou mais nomes específicos; o filtro de operadora restringe os dados à plataforma selecionada.\n\nO mês exibido no carrossel determina quais ciclos aparecem no bloco de Ciclo de Pagamento — ciclos cujo último dia cai dentro do mês selecionado.",
      },
      {
        subtitulo: "KPIs",
        texto:
          "Três cards no topo (formato igual à Banca de Jogo — rótulo em caixa alta acima do valor, sem caixa branca em volta):\n\n— **R$ PAGO:** soma dos pagamentos com status Pago\n— **R$ PENDENTE:** soma dos pagamentos Em análise ou Aguard. pagamento\n— **HORAS REALIZADAS:** horas acumuladas de todos os influencers no período\n\nOs valores se atualizam conforme os filtros aplicados.",
      },
      {
        subtitulo: "Ciclo de Pagamento",
        texto:
          "O bloco **Ciclo de pagamento** (título de seção padrão) reúne o seletor de ciclo, ações e a tabela. Selecione um ciclo pelo dropdown para ver os pagamentos daquela semana. O ciclo atual aparece com a tag Atual e exibe uma prévia em tempo real — os valores são estimativas calculadas a partir das lives realizadas e dos cachês cadastrados. Os pagamentos definitivos são gerados ao encerrar o ciclo.\n\nNo ciclo fechado, a tabela exibe colunas de status e ação. Perfis com permissão de edição podem analisar (aprovar ou ajustar o valor) e registrar pagamentos. Um indicador na tabela mostra a data do pagamento quando o status é Pago.",
      },
      {
        subtitulo: "Pagamento de Agente",
        texto:
          "O botão Pagamento de Agente permite registrar valores para agências ou comissões externas dentro do ciclo selecionado. Visível apenas para perfis de operação interna (gestor, operador, shift leader e similares). Informar operadora, descrição e valor — o registro entra no ciclo como linha especial e segue o mesmo fluxo de análise e pagamento.",
      },
      {
        subtitulo: "Consolidado de Influencers",
        texto:
          "No bloco **Consolidado de influencers**, a busca por nome ou e-mail fica logo abaixo do título. A tabela lista todos os influencers com ao menos um pagamento no período. Clique em qualquer linha para expandir o histórico dos últimos 12 ciclos daquele influencer.\n\nAs colunas Total Pago, Total Horas, Pendente e Último Pagamento resumem o desempenho financeiro no recorte de tempo selecionado.",
      },
    ],
  },
  campanhas: {
    titulo: "Campanhas",
    blocos: [
      {
        texto:
          "A página **Campanhas** reúne o cadastro de campanhas de mídia e a **Geração de Links** com UTMs rastreados. Use o carrossel de operadoras (e o botão **Todas Operadoras**) na barra de filtros para restringir o que aparece nas duas abas. Campanhas sem operadora vinculada entram em qualquer filtro específico. Os UTMs mapeados na **Gestão de Links** e associados a uma campanha alimentam a página **Mídias Sociais**.",
      },
      {
        subtitulo: "Filtros e abas",
        texto:
          "Na barra superior, navegue entre operadoras com as setas ou ative **Todas Operadoras**. Abaixo, alterne entre as abas **Campanhas** e **Geração de Links** (também pela URL). Com o foco numa aba, use ← → do teclado para trocar.",
      },
      {
        subtitulo: "Aba Campanhas — indicadores e tabela",
        texto:
          "Três cards no topo: **TOTAL**, **ATIVAS** e **INATIVAS**. A tabela lista Nome, Operadora, Status (Ativa/Inativa) e data de criação.\n\n**Nova Campanha** abre o formulário (nome obrigatório; operadora opcional). Editar altera nome, operadora e status; Excluir remove a campanha e desfaz vínculos na Gestão de Links, mantendo o histórico nos dashboards.\n\nCampanhas inativas não aparecem como opção ao mapear novos links, mas mantêm UTMs já vinculados.",
      },
      {
        subtitulo: "Aba Geração de Links",
        texto:
          "Consolida **TOTAL**, **ATIVOS** e **INATIVOS**. Um link fica **Ativo** quando gerou resultados (métricas) nos últimos 30 dias; caso contrário, **Inativo**.\n\nEm **Links cadastrados**, a tabela mostra UTM, Operadora, Criado em, Usuário (quem criou), Status e Última Visita. Com permissão de **Criar**, use **Novo Link**: escolha a operadora (**Casa de Apostas** ou **Blaze**), a **campanha ativa** da mesma operadora e o campo **UTM** (utm_source na CDA; utm_campaign na Blaze). Ao gerar, a URL completa é montada com a base da operadora, o link é mapeado à campanha (como na Gestão de Links), aparece com **Copiar** e o registro entra na tabela.",
      },
    ],
  },
  galeria_fotos: {
    titulo: "Galeria de Fotos",
    blocos: [
      {
        texto:
          "A página **Galeria de Fotos** centraliza imagens de eventos e ações da Spin. Fotos **gerais** ficam na sub-aba **Gerais** (visíveis a quem tem permissão de Ver). Fotos **individuais de colaboradores** ficam em **Minhas Fotos** — a equipe com permissão de **Editar** filtra por qualquer colaborador; quem tem **Ver (próprios)** vê todas as gerais e, em Minhas Fotos, apenas as fotos atribuídas ao seu cadastro de colaborador (e-mail de login ou e-mail Spin), com o filtro travado no próprio nome.",
      },
      {
        subtitulo: "Aba Galeria",
        texto:
          "Use as sub-abas **Gerais** e **Minhas Fotos**. Em **Gerais**, filtre por evento no campo **Eventos** (**Todos Eventos** por defeito) e busque por nome do evento ou arquivo. Cada evento aparece em um bloco recolhível (seta à esquerda, **fechado por defeito**): o título e a data ficam no cabeçalho, com a **descrição do evento** logo abaixo; clique na seta para ver as fotos. Com busca ativa, os blocos com resultados abrem automaticamente.\n\nEm **Minhas Fotos**, quem tem permissão de **Editar** filtra por colaborador (**Todos Colaboradores** por defeito); demais perfis veem o filtro fixo no próprio nome.\n\nAs fotos aparecem em blocos por evento (Gerais) ou por colaborador (Minhas Fotos). Clique na miniatura para ampliar; use o ícone de download para salvar. Exclusão exige permissão de Excluir e abre o pop-up padrão de confirmação.",
      },
      {
        subtitulo: "Aba Upload",
        texto:
          "Disponível com permissão de **Criar**. Escolha o **tipo de foto** (gerais ou de colaborador). Para **Fotos gerais**, selecione ou cadastre um **evento** (**Novo Evento** — nome, data e descrição obrigatórios). Com permissão de **Editar**, use **Editar Eventos** para alterar um evento existente ou excluí-lo; se o evento tiver fotos, a confirmação avisa que as imagens serão perdidas. Para **Fotos de colaborador**, selecione o colaborador na lista com busca (seleção única). Em seguida, selecione um ou mais arquivos (JPG, PNG ou WebP, até 25 MB cada).",
      },
    ],
  },
  comercial_overview: {
    titulo: "Overview Comercial",
    blocos: [
      {
        texto:
          "O **Overview Comercial** (menu **Dashboards**, abaixo de Overview Influencer) consolida a visão de **Operadoras** (Pipeline B2B), **Agregadoras** e **Integrações** em abas no topo. É **somente leitura** — a edição permanece nas páginas de pipeline e Integração na seção Comercial.",
      },
      {
        subtitulo: "Abas e filtros",
        texto:
          "No topo do bloco de filtros escolha **Operadoras**, **Agregadoras** ou **Integrações**.\n\n— **Operadoras:** filtro **Comercial** abaixo das abas (visão consolidada do funil completo).\n— **Agregadoras:** só o filtro **Comercial**.\n— **Integrações:** filtro **Prioridade** (**Todas Prioridades**, Baixo, Médio ou Alta).",
      },
      {
        subtitulo: "Conteúdo por aba",
        texto:
          "**Operadoras** mantém KPIs, funil, produto Dedicada/Network, mapa, carteira, novas marcas e movimentação.\n\n**Agregadoras** mostra KPIs do funil (sem legenda nos cards), funil em largura total, carteira por comercial e **Movimentação recente** lado a lado em grade 2×2 (→ Conexão, → Negociação, → Fechado, Alterações totais).\n\n**Integrações** mostra totais por status (sem legenda nos cards), **SLA por etapa** (tempo médio: criação → Em andamento; Em andamento → Concluído; criação → Concluído), volume por Tipo (Dedicada/Network), por Caminho e por Agregador.",
      },
      {
        subtitulo: "Mapa e movimentação",
        texto:
          "Na aba **Operadoras**, o bloco **Distribuição geográfica** lista **UF, Estado e Marcas**; ao clicar em um estado, aparecem as marcas por **cidade**. Em **Movimentação recente**, passe o mouse sobre o número para ver quais marcas foram alteradas nos últimos 30 dias.",
      },
    ],
  },
  comercial_integracao: {
    titulo: "Integração",
    blocos: [
      {
        texto:
          "A página **Integração** acompanha a integração técnica das marcas que estão na aba **Fechado** do Pipeline B2B (Dedicada ou Network em **Contrato Assinado** ou **Ativo**). O acesso depende da permissão de Ver; o botão **Nova Integração** exige Criar; alteração de status, prioridade, caminho, PAM, agregador e comentários exige Editar.",
      },
      {
        subtitulo: "Filtros e abas",
        texto:
          "Use a busca por operador, caminho ou PAM e o filtro **Prioridade** (**Todas Prioridades**, Baixo, Médio ou Alta). As abas **Todos**, **Não Iniciados**, **Em andamento** e **Concluídos** organizam o funil de integração. Os KPIs **Concluídos**, **Em andamento** e **Não Iniciados** também filtram a tabela; **Total de Operadores** limpa o filtro de status.",
      },
      {
        subtitulo: "Tabela e Nova Integração",
        texto:
          "Cada linha vincula um Operador (marca) a um Tipo (**Dedicada** ou **Network**). Clique no **Operador** para abrir o mesmo modal de dados da marca do Pipeline B2B (domínio, licença, contatos — somente leitura). Agregador usa os nomes cadastrados em **Pipeline Agregadoras**. **Histórico** mostra alterações; **Comentar** registra o comentário visível na coluna.\n\nEm **Nova Integração**, escolha uma marca da aba **Fechado** do Pipeline B2B (lista com pesquisa) e preencha Prioridade, Tipo, Caminho, PAM e Agregador (todos obrigatórios). É possível criar mais de uma integração para a mesma marca.\n\nAo marcar Dedicada ou Network como **Contrato Assinado** ou **Ativo**, a plataforma cria automaticamente uma linha (Prioridade Baixo, Status Não Iniciado, Caminho e PAM em branco), se ainda não existir para aquele tipo.",
      },
    ],
  },
  comercial_pipeline_b2b: {
    titulo: "Pipeline B2B",
    blocos: [
      {
        texto:
          "A página **Pipeline B2B** substitui a planilha comercial da Spin Gaming: concentra empresas licenciadas, marcas (sites), contatos, status do funil e propostas de mesa **Dedicada** e **Network** de Live Cassino. O acesso depende da permissão de Ver em Gestão de Usuários; edição inline, contatos e anotações exigem permissão de Editar.",
      },
      {
        subtitulo: "Filtros e abas",
        texto:
          "Use a busca para localizar marcas por CNPJ, razão social ou nome da marca. O filtro **Comercial** restringe a lista ao responsável interno (**Todos Comerciais**, **Nenhum** ou um gestor).\n\nAs abas organizam o funil:\n— **Todos:** visão consolidada com totais hierárquicos.\n— **Disponíveis**, **Conexão**, **Negociação** e **Fechado:** KPIs clicáveis filtram o detalhe da tabela por substatus.\n— **Fechado** lista marcas com Dedicada ou Network em **Contrato Assinado** ou **Ativo** (mesmo que o Status ainda estivesse em Negociação).\n\nA aba selecionada fica registrada no endereço da página — dá para copiar o link e voltar direto na mesma aba.",
      },
      {
        subtitulo: "Tabela e edição",
        texto:
          "A coluna **Razão Social** agrupa marcas do mesmo CNPJ. Clique no nome da marca ou no ícone **Ver** para abrir domínio, portaria, requerimento e contatos (somente leitura). **Registro** abre anotações da equipe e histórico de alterações (Comercial, Status, Dedicada, Network, **Agregadora**, **Último Contato**).\n\nCom permissão de Editar, clique nas células **Comercial**, **Status**, **Dedicada**, **Network** ou **Agregadora** para alterar via lista; em **Último Contato**, clique na data para escolher ou alterar o dia do último contato comercial. **Agregadora** lista os nomes cadastrados em **Pipeline Agregadoras** (ou **—** para limpar). Contatos: clique no nome para editar ou use **+** para adicionar.\n\nAo alterar **Dedicada** ou **Network**, o Status do funil é recalculado automaticamente nesta ordem (para no primeiro match): (1) Contrato Assinado ou Ativo → **Fechado**; (2) Contrato enviado → **Negociação**; (3) Em negociação → **Conexão**. Ao marcar **Contrato Assinado** em Dedicada ou Network, a página **Integração** recebe automaticamente uma linha para aquele tipo (se ainda não existir).\n\nAs flags de **Dedicada** e **Network** usam cores em progressão do pior ao melhor cenário: vermelho (Sem interesse / Desinteresse Comercial) → cinza (Sem proposta) → amarelo (Em negociação) → azul (Contrato enviado) → roxo (Contrato Assinado) → verde (Ativo). **Desinteresse Comercial** entra na linha **Sem interesse** do consolidado de Negociação.\n\nTodas as abas exibem as mesmas colunas, na ordem: Razão Social, Marca, Contato, Comercial, Status, Dedicada, Network, Agregadora, Último Contato e Ação.",
      },
      {
        subtitulo: "Comunicar",
        texto:
          "O botão **Comunicar** na toolbar da tabela será usado para registrar comunicações com a marca (e-mail/mensagem) — fluxo em implementação posterior.",
      },
    ],
  },
  comercial_pipeline_agregadoras: {
    titulo: "Pipeline Agregadoras",
    blocos: [
      {
        texto:
          "A página **Pipeline Agregadoras** concentra a prospecção comercial de agregadoras de jogos (plataformas B2B de conteúdo). O acesso depende da permissão de Ver em Gestão de Usuários; cadastro exige permissão de Criar; alteração de status e último contato exige permissão de Editar.",
      },
      {
        subtitulo: "Filtros e abas",
        texto:
          "Use a busca por nome ou site e o filtro **Comercial** (**Todos Comerciais**, **Nenhum** ou um gestor canónico). As abas **Todos**, **Conexão**, **Negociação** e **Fechado** organizam o funil. Os KPIs **Disponíveis**, **Conexão**, **Negociação** e **Fechado** filtram a tabela por status (clique novamente para limpar).",
      },
      {
        subtitulo: "Cadastro e tabela",
        texto:
          "Com permissão de Criar, use **Cadastrar** para informar Nome, Site, Jogos e Comercial. Toda agregadora nova entra no status **Conexão**. A tabela exibe Nome, Site, Jogos, Status, Comercial, Último Contato e ações **Ver** e **Histórico**. Com Editar, altere Status e Comercial pelo popover; em Jogos e Último Contato, clique na célula (vazio mostra **—**) para editar.",
      },
    ],
  },
  gestao_operadoras: {
    titulo: "Gestão de Operadoras",
    blocos: [
      {
        texto:
          "Página de acesso restrito a administradores. Centraliza o cadastro e a configuração das operadoras parceiras da Spin Gaming, incluindo identidade visual (brandguide) e status de operação.",
      },
      {
        subtitulo: "Lista de operadoras",
        texto:
          "Exibe todas as operadoras cadastradas com status (Ativa ou Inativa), slug interno e data de criação. Os cards de resumo no topo mostram os totais. Use a busca abaixo do título do bloco para filtrar pelo nome da operadora. A tabela permite ordenação por qualquer coluna.",
      },
      {
        subtitulo: "Cadastrar ou editar operadora",
        texto:
          "Ao criar ou editar, o modal abre com três abas:\n— Dados cadastrais: nome, identificador interno (gerado automaticamente) e status de ativação.\n— Brandguide: cores de marca, logo e fonte customizada para whitelabel.\n— Operações (só na edição): template de Home do operador e lista de mesas cadastradas.\n\nNovas operadoras são criadas como inativas e podem ser ativadas a qualquer momento.",
      },
      {
        subtitulo: "Excluir operadora",
        texto:
          "A exclusão permanente só é possível quando não existirem registros vinculados (mesas, escalas, RH). Para remover o acesso sem perder histórico, desative a operadora em vez de excluir.",
      },
    ],
  },
  gestao_mesas: {
    titulo: "Gestão de Estúdios",
    blocos: [
      {
        texto:
          "Hub de cadastro de estúdios físicos Spin e das mesas vinculadas. Estúdios podem ser do tipo Dedicado ou Network e associam-se a uma ou mais operadoras parceiras.",
      },
      {
        subtitulo: "Filtros e navegação",
        texto:
          "No topo, use as setas do carrossel para alternar a operadora exibida ou o botão **Todas Operadoras** para ver todas de uma vez. Na segunda linha, alterne entre as abas **Estúdios** e **Mesas**.\n\nNa aba Estúdios, os cards **Mesas Dedicadas** e **Mesas Network** mostram a quantidade de mesas do tipo conforme o filtro de operadora. A tabela lista estúdios com nome, tipo, quantidade de mesas e operadoras vinculadas.\n\nNa aba Mesas, os cards por jogo (Baccarat, Blackjack, Roleta e Futebol Brasileiro) atualizam conforme o filtro. Use a busca para filtrar por nome da mesa, estúdio, ID Spin ou número da mesa.",
      },
      {
        subtitulo: "Cadastrar ou editar estúdio",
        texto:
          "Informe nome, tipo (Network ou Dedicado) e selecione as operadoras ativas que utilizam aquele estúdio. Na edição, a aba Operações concentra os horários de início dos turnos da manhã, tarde e noite dos dealers — usados no Calendário e na Gestão de Staff. Cada estúdio pode ter várias operadoras; cada mesa pertence a um único estúdio.",
      },
      {
        subtitulo: "Cadastrar ou editar mesa",
        texto:
          "Selecione o estúdio, informe nome, tipo de jogo, número da mesa e ID interno Spin. Para cada operadora vinculada ao estúdio, pode preencher o ID no catálogo da parceira (opcional). O ID Spin não pode ser alterado após o cadastro — exclua e recadastre se estiver incorreto.",
      },
    ],
  },
  status_tecnico: {
    titulo: "Status Técnico",
    blocos: [
      {
        texto:
          "Página de monitoramento operacional. Quem tem permissão de **Ver** acompanha integrações, alertas e logs; quem tem **Editar** liberado em Gestão de Usuários pode disparar syncs, e-mails, diagnóstico da plataforma e gerenciar redes de check-in. O perfil Administrador mantém acesso total.",
      },
      {
        subtitulo: "Painel de integrações",
        texto:
          "Exibe o status de cada pipeline de dados (**CDA Influencers**, **CDA Afiliados**, Social Media, Spin na Rede RSS, **Painel de Notícias RSS**, automações do Pipeline B2B — **Lista SPA**, **Validação de domínios de Marcas** e **Estado / Cidade** por CNPJ — Lobby, e-mails agendados e transacionais) e a linha **Diagnóstico da Plataforma**, com horário da última execução, volume de verificações/envios e erros. **Estado / Cidade** consulta a Brasil API e preenche município e UF no cadastro da empresa (execução diária, por volta das 8h30). E-mails de **Relatório** e **Agenda** têm ação **Enviar**; **Boas-vindas** e **Reset de senha** são só acompanhamento (disparo automático ao criar conta ou redefinir senha). O diagnóstico manual fica **OK** quando a execução conclui; achados (avisos e falhas de credenciais ou integrações) aparecem na coluna Erros e em **Logs Recentes**. Com permissão de Editar, use **Executar** na linha de diagnóstico ou **Sync** nas integrações com botão.\n\nA TV do **Painel de Notícias** abre no endereço público `/painel-noticias` (sem login). O Sync do Painel de Notícias RSS atualiza as matérias dessa tela.",
      },
      {
        subtitulo: "Logs Recentes",
        texto:
          "Lista eventos técnicos das últimas horas, incluindo falhas de sync e linhas geradas pelo diagnóstico manual. Filtre por tipo; entradas de diagnóstico resumem quantos checks passaram, avisaram ou falharam na execução.",
      },
      {
        subtitulo: "Fluxo de dados",
        texto:
          "Gráfico de barras empilhadas com os últimos 14 dias. Cada cor representa uma fonte de dados — incluindo **Estado / Cidade** (empresas do Pipeline B2B enriquecidas com município/UF por CNPJ). Passe o cursor sobre uma barra para ver o detalhamento por fonte naquele dia.",
      },
      {
        subtitulo: "Alertas automáticos",
        texto:
          "A plataforma detecta automaticamente condições anômalas: syncs atrasados (> 24h ou > 36h), taxas de erro acima de 5%, e e-mails operacionais não enviados no dia. O aviso de CDA sem dados recentes considera a data de métrica de ontem (D-1), pois o sync diário grava o dia anterior. Alertas em vermelho indicam falha; em amarelo, atenção.",
      },
      {
        subtitulo: "Redes permitidas — Check-in de prestadores",
        texto:
          "Gerencia os prefixos de rede CIDR autorizados para registro de ponto dos prestadores. O check-in fica bloqueado para qualquer IP que não esteja coberto por pelo menos um CIDR configurado. Com permissão de Editar, adicione prefixos com **Nova Rede** ou remova na tabela.",
      },
      {
        subtitulo: "Testes automatizados (CI) vs diagnóstico na plataforma",
        texto:
          "A suíte Vitest no repositório (CI e pre-commit) valida helpers e imports — não substitui o diagnóstico em produção. Use **Executar diagnóstico** quando precisar de um snapshot operacional gravado em Logs Recentes no ambiente atual.",
      },
    ],
  },
  tech_ops_ordem_saida: {
    titulo: "Ordem de Saída",
    blocos: [
      {
        texto:
          "A Ordem de Saída registra movimentações de ativos Tech Ops em três abas: **O.S. Interna** (entre estúdios e áreas), **O.S. Externa** (saídas para fora) e **O.S. Manutenção** (envio a fornecedores). Os itens vêm do cadastro da Gestão de Estoque; os locais internos usam os estúdios de Gestão de Estúdios mais Estoque, Shuffler Room, OCR e Academy.",
      },
      {
        subtitulo: "Filtros e período",
        texto:
          "O carrossel cobre o mês atual e os dois anteriores. O botão Histórico mostra todo o período. Ordens ainda Solicitadas ou Abertas de meses anteriores continuam aparecendo no mês seguinte até serem Concluídas ou Canceladas.\n\nOs cards Total, Solicitadas, Abertas, Concluídas e Canceladas filtraram a listagem por status — clique de novo no card ativo (ou em Total) para limpar.",
      },
      {
        subtitulo: "Códigos e solicitação",
        texto:
          "Cada OS recebe um código automático no formato OS/INT-MMAA-####, OS/EXT-MMAA-#### ou OS/MAN-MMAA-#### (mês/ano de abertura + sequencial). Ao Solicitar, a ordem entra como Solicitada (na Manutenção o rótulo exibido é Registrada).",
      },
      {
        subtitulo: "Ver, Aprovar e Atualizar",
        texto:
          "No Ver, o título é o código da OS e o subtítulo mostra status e responsável (Interna) ou solicitante (Externa/Manutenção). A aba Dados lista os campos do fluxo e o bloco de itens; Cancelada e Concluída podem exibir quadros de cancelamento ou conclusão. Anotações inclui a observação da abertura; Histórico registra as ações.\n\nQuando a OS está Solicitada, Aprovar muda o status para Aberta (ou Concluída quando for Sem retorno). Recusar exige o Motivo do Cancelamento e muda a OS para Cancelada.\n\nNo Atualizar, escolha o tipo: Cancelar OS (motivo → Cancelada), Confirmar Retorno (data de hoje, checkboxes por item e observações → Concluída) ou Alterar OS (edita dados e itens e volta a Solicitada). As opções disponíveis dependem da aba e do status.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Depende da permissão de **Ver** / **Criar** / **Editar** em Gestão de Usuários. Não há exclusão — correções seguem por atualização de status e histórico.",
      },
    ],
  },
  tech_ops_estoque: {
    titulo: "Gestão de Estoque",
    blocos: [
      {
        texto:
          "A Gestão de Estoque centraliza o controle do inventário da operação técnica em quatro abas: **Itens** (materiais de uso geral, como cabos, energia e rede), **Equipamentos** (peças identificadas por número de série, como roletas e câmeras), **Jogo** (lotes de consumíveis — bolinhas, cartas e tecidos) e **Fornecedores** (empresas e contatos).\n\nNão há dados de exemplo: os registros são criados diretamente pelas ações de Novo Item, Novo Equipamento, Novo Item de Jogo e Novo Fornecedor.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "A barra no topo tem as quatro abas e, abaixo, a busca (por código, nome, marca, modelo, série, lote, empresa, CNPJ ou contato — sem diferenciar acentos), o filtro de Estúdio (cadastro de Gestão de Estúdios) e o filtro de Categoria, cujas opções mudam conforme a aba. Estúdio e Categoria não se aplicam à aba Fornecedores.\n\nCom o foco nas abas, use ← → do teclado para alternar entre elas (padrão tablist).",
      },
      {
        subtitulo: "Consolidado de KPIs",
        texto:
          "Nas abas Itens e Equipamentos, os cards Total, Estoque, Em uso e Manutenção mostram as quantidades por status com o detalhamento por categoria. Clique em um card para filtrar o catálogo por aquele status; clique novamente (ou em Total) para limpar.\n\nNa aba Jogo, os cards Bolinhas, Cartas e Tecidos mostram a quantidade atual de cada categoria — o clique aplica o mesmo filtro de categoria da barra.",
      },
      {
        subtitulo: "Códigos e quantidades",
        texto:
          "Os códigos são gerados automaticamente em sequência: ITM-0001 (itens), EQP-0001 (equipamentos) e JOG-0001 (lotes de jogo) — o campo Código aparece travado nos formulários de criação, já preenchido com o próximo código da fila.\n\nAs quantidades derivadas são sempre calculadas: Estoque do item = Total − Em Uso − Manutenção; Qtd Atual do lote = Qtd Inicial − Consumida − Descartada. No modal Ver do item, o Valor do Estoque = Valor Unitário × quantidade em estoque.",
      },
      {
        subtitulo: "Ver: Anotações e Histórico",
        texto:
          "O botão Ver abre o detalhamento do registro em três abas: os dados da entidade (quantidades e valores no caso de itens; contatos no caso de fornecedores), as Anotações registradas (com anexo quando houver) e o Histórico — lista de todas as ações e edições com autor e data/hora.",
      },
      {
        subtitulo: "Editar: Alterações e Anotações",
        texto:
          "O botão Editar abre um modal com duas abas. Em **Alterações**, escolha o Tipo de Alteração — Novas Unidades ou Alteração de Valor/Cadastral em Itens; Alteração de Valor/Cadastral em Equipamentos; Alteração de Contato/Cadastral em Fornecedores — e os campos correspondentes abrem pré-preenchidos com os valores atuais. Na aba Jogo os campos abrem diretamente. Em **Anotações**, registre um texto (obrigatório para salvar a anotação) com anexo opcional.\n\nO botão Salvar grava tudo de uma vez e cada mudança fica registrada no Histórico com o valor anterior e o novo.",
      },
      {
        subtitulo: "Fornecedores",
        texto:
          "O cadastro tem duas abas: Empresa (Razão Social, CNPJ, Tipo e Observação) e Contato (nome, telefone e e-mail — é possível adicionar mais de um). Na tabela, passe o mouse sobre a Empresa para ver o CNPJ e clique no nome de um contato para abrir os dados dele.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso segue a matriz de Gestão de Usuários: permissão de **Ver** exibe a página; **Criar** habilita os botões de novo registro; **Editar** habilita o botão Editar. A página não possui exclusão — registros são corrigidos por alterações, sempre com histórico.",
      },
    ],
  },
  gestao_usuarios: {
    titulo: "Gestão de Usuários",
    blocos: [
      {
        texto:
          "Página de acesso restrito a administradores. Centraliza o cadastro de usuários, a configuração de permissões por perfil e a definição de quais páginas cada grupo pode acessar no menu.",
      },
      {
        subtitulo: "Aba Usuários",
        texto:
          "Lista todos os usuários cadastrados em uma tabela com as colunas Nome do Usuário, E-mail, Perfil, Escopo, Último Login e Ações. Clique no título de qualquer coluna para reordenar — a lista abre pelo login mais recente. Usuários desativados aparecem com a etiqueta Desativado ao lado do nome.\n\nPermite buscar por nome ou e-mail, filtrar por status (Ativo / Desativado) e por perfil. Administradores podem criar novos usuários e, na coluna Ações, editar dados e escopos (lápis), redefinir a senha para a padrão (chave), desativar o acesso ou reativar um usuário desativado.",
      },
      {
        subtitulo: "Aba Permissões",
        texto:
          "Define, por perfil, o que cada papel pode Ver, Criar, Editar e Excluir em cada página da plataforma. O perfil Administrador não é configurado aqui — mantém acesso total fixo. As alterações entram em vigor no próximo carregamento de página do usuário afetado.",
      },
      {
        subtitulo: "Abas Operadora e Prestadores",
        texto:
          "Controlam quais páginas aparecem no menu para cada grupo operacional.\n— Operadora: define o menu visível para operadores de cada operadora.\n— Prestadores: define o menu por área de atuação (ex.: Escritório, Estúdio, Facilities, TI).\nGestores de departamento (Aquisição, Marketing, Operações, Academy, RH) usam só a matriz de Permissões, sem aba de escopo própria.\nO acesso efetivo de Operadora/Prestadores é o cruzamento destas marcações com a matriz de Permissões.",
      },
    ],
  },
  gestao_links: {
    titulo: "Gestão de Links",
    blocos: [
      {
        texto:
          "A página Gestão de Links centraliza o mapeamento dos UTM Sources detectados nas contas TAP da Casa de Apostas (Influencers e Afiliados) que ainda não estão associados a nenhum influencer, afiliado ou campanha. Na aba Pendentes, a coluna **Origem** indica se o link veio da TAP Influencers ou da TAP Afiliados. Ao mapear um link, os dados históricos são sincronizados nos dashboards. Novos dados chegam diariamente até as 4h.",
      },
      {
        subtitulo: "Abas de Status",
        texto:
          "Os links são organizados em três abas:\n— Pendentes: links detectados sem associação — precisam ser mapeados ou ignorados\n— Mapeados: links já associados a um influencer, afiliado ou campanha\n— Ignorados: links descartados, que não serão mapeados\n\nO contador em vermelho na aba Pendentes indica quantos links aguardam ação. Use as setas ← → do teclado com o foco na tablist para alternar entre as abas.",
      },
      {
        subtitulo: "Filtro de Operadora",
        texto:
          "Quando visível, o filtro de operadora restringe a listagem à plataforma selecionada. Ao selecionar uma operadora específica, a coluna Operadora some da tabela — os dados já estão filtrados. Selecione **Todas Operadoras** no filtro para ver tudo junto.",
      },
      {
        subtitulo: "Busca por UTM Source",
        texto:
          "Abaixo das abas, use a barra de pesquisa para filtrar a lista pelo **UTM Source**. A busca ignora maiúsculas/minúsculas e acentos. O filtro vale para a aba ativa (Pendentes, Mapeados ou Ignorados).",
      },
      {
        subtitulo: "Tabela de Links",
        texto:
          "Cada linha mostra o UTM Source detectado, o status do proprietário associado (quando aplicável), a operadora, as datas de primeiro e último registro e métricas acumuladas. A coluna Proprietário exibe o nome artístico do influencer, o nome do afiliado ou o nome da campanha.\n\nNa aba **Pendentes**, as colunas **Origem** (TAP Influencers ou TAP Afiliados) e **Visitas** identificam de qual conta TAP o link veio e o volume detectado. As ações são Mapear e Ignorar. Nas demais abas, Reabrir devolve o link para Pendentes.",
      },
      {
        subtitulo: "Mapeando um Link",
        texto:
          "Clique em Mapear para abrir o modal com os dados do UTM Source. Escolha o tipo de associação:\n— Influencer: vincula o link ao perfil do influencer (exibe nome artístico)\n— Afiliado: vincula o link ao perfil do afiliado (exibe o nome)\n— Campanha: vincula a uma campanha de marketing\n\nApós confirmar, os dados históricos são sincronizados automaticamente. O processo pode levar alguns segundos dependendo do volume de dados.",
      },
    ],
  },
  configuracoes: {
    titulo: "Configurações",
    blocos: [
      {
        texto:
          "Página de preferências da sua conta. Permite ajustar a aparência da interface (quando o perfil permitir) e alterar a senha de acesso. O acesso fica no menu do avatar (canto superior), junto com Ajuda — não aparece no menu lateral.",
      },
      {
        subtitulo: "Aparência",
        texto:
          "Escolha entre tema claro e escuro. A preferência vale para a sua sessão na plataforma.\n\nPerfis **Operador** usam sempre o modo escuro com a identidade visual (whitelabel) da operadora — o seletor de tema não é exibido nesses casos.",
      },
      {
        subtitulo: "Alterar Senha",
        texto:
          "Informe a senha atual, a nova senha e a confirmação. A nova senha deve ter pelo menos 8 caracteres, combinar maiúsculas e minúsculas, incluir número e caractere especial, e ser diferente da senha atual.\n\nUm indicador de força (Fraca / Média / Forte) ajuda a validar o preenchimento antes de salvar.\n\nNo primeiro acesso (após reset de senha), a mesma regra vale na tela **Troque sua senha**: o botão só libera quando todos os requisitos estão ok. Depois de definir a senha, a plataforma abre a **Home**."
      },
      {
        subtitulo: "Permissões",
        texto:
          "A visualização depende da permissão de **Ver** em Gestão de Usuários para a página Configurações. Sem essa permissão, a página exibe acesso restrito.",
      },
    ],
  },
  simulador_login: {
    titulo: "Simulador de Login",
    blocos: [
      {
        texto:
          "Permite visualizar a plataforma com o menu e a identidade de outro perfil, sem trocar a sua conta real. O acesso fica no menu do avatar (entre Configurações e Ajuda) — não aparece no menu lateral. Enquanto a simulação estiver ativa, a navegação é somente leitura.",
      },
      {
        subtitulo: "Como iniciar",
        texto:
          "Escolha um perfil na lista (agrupado por tipo: gerenciais, estúdio, escritório, externos, etc.). Em seguida a plataforma pede um **usuário ativo** daquele perfil (a lista é atual: quem está ativo hoje; o mais recente no login vem pré-selecionado). Alguns perfis pedem um passo extra antes do usuário:\n\n— **Operador:** selecione a operadora (ativas e inativas; inativas aparecem com o rótulo correspondente).\n— **Prestador** (e áreas equivalentes): selecione a área de atuação.\n\nSe já houver uma visualização ativa, a plataforma pede confirmação para substituir. Após confirmar, abre a Home no modo simulado e exibe a faixa **Encerrar visualização**.",
      },
      {
        subtitulo: "O que você vê na simulação",
        texto:
          "O menu e as permissões seguem o perfil simulado, o usuário ativo escolhido e o escopo de operadora ou área, quando aplicável. A sua conta (nome no avatar) não muda. Ações de Criar, Editar e Excluir ficam bloqueadas.\n\nPáginas sensíveis de administração (Gestão de Usuários, Gestão de Operadoras e Status Técnico) não entram no menu simulado. Gestão de Estúdios continua visível se o perfil simulado tiver acesso.",
      },
      {
        subtitulo: "Quem pode usar e o que aparece na lista",
        texto:
          "É necessário permissão de **Ver** em Simulador de Login. Os perfis disponíveis na página são definidos em **Gestão de Usuários → Simulador de Login** (matriz do perfil viewer × perfis simuláveis). Administrador vê o catálogo completo. Se a lista estiver vazia, peça ao administrador para liberar perfis nessa aba.",
      },
      {
        subtitulo: "Encerrar",
        texto:
          "Use **Encerrar visualização** na faixa amarela no topo ou no bloco de status da página. A sessão volta ao seu perfil real e às permissões originais. Se a volta falhar, a faixa permanece e aparece um aviso para recarregar.",
      },
    ],
  },
};
