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
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de todo o período — nesse modo a navegação de mês fica desativada e os subtítulos dos blocos principais passam a mostrar \"acumulado\" (o comparativo MoM do mês anterior deixa de aparecer nos KPIs Executivos).\n\nO filtro de influencer restringe todas as abas ao influencer selecionado. O filtro de operadora restringe aos influencers vinculados àquela plataforma. Ambos os filtros são aplicados simultaneamente em todas as abas ao trocar de aba.\n\nEnquanto uma aba carrega dados, a barra de filtros pode exibir \"Carregando…\" — os filtros permanecem os mesmos ao mudar entre Overview, Conversão e Financeiro.\n\nCom o foco em uma aba, use as setas ← → do teclado para alternar entre Overview, Conversão e Financeiro (padrão de acessibilidade com role=\"tablist\").",
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
          "O Overview Spin reúne os resultados financeiros e operacionais das mesas ao vivo por operadora — Baccarat, Roleta, Blackjack e Futebol Brasileiro. A página está dividida em duas abas: Overview, com KPIs e detalhamentos financeiros, e Posicionamento, com dados de visibilidade no lobby das operadoras parceiras.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas laterais para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de todo o período em vez de um mês específico — nesse modo, a navegação de mês fica desativada.\n\nQuando disponível, o seletor de operadora permite filtrar os dados por operadora (ex.: Blaze, Casa de Apostas). Com **Todas Operadoras** selecionado no filtro, os valores financeiros são somados entre operadoras.",
      },
      {
        subtitulo: "KPIs Consolidados",
        texto:
          "Apresenta os principais indicadores do período: GGR (receita bruta), Turnover (volume apostado), Margem (GGR ÷ Turnover), Apostas (quantidade de rodadas), Aposta Média, UAP (jogadores ativos únicos) e ARPU (GGR ÷ UAP).\n\nO indicador de variação abaixo de cada KPI compara o período atual com o mesmo período do mês anterior (MTD vs MTD). No modo Histórico, a comparação MoM é ocultada e o subtítulo do bloco passa a \"acumulado\".",
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
          "Disponível apenas quando uma operadora específica está selecionada. Permite comparar duas mesas de Blackjack lado a lado. Use os seletores acima da tabela para escolher as mesas A e B.",
      },
      {
        subtitulo: "Dados por Mesa",
        texto:
          "Exibe o desempenho diário (ou mensal no Histórico) das mesas Speed Baccarat e Roleta em dois painéis paralelos. Na Casa de Apostas, uma segunda linha mostra Futebol Brasileiro em largura total.",
      },
      {
        subtitulo: "Aba Posicionamento",
        texto:
          "Monitora a posição das mesas Spin no lobby das plataformas parceiras. Os dados refletem o dia atual e são atualizados automaticamente ao longo do dia — a navegação por mês e o botão Histórico não se aplicam nesta aba.\n\nOs KPIs mostram: Visibilidade na vitrine (% das mesas no top 20 do lobby), Mesas no top 10, Melhor posição registrada no dia e Maior queda de posição vs o mesmo horário do dia anterior.\n\nA lista 'Posição atual das mesas' exibe a posição de cada mesa no último snapshot, com indicador de melhora (↑) ou piora (↓) vs ontem no mesmo horário.\n\n'Concorrentes à frente' lista quantos jogos de outras plataformas aparecem antes de cada tipo de jogo Spin.\n\nO Histórico de Posicionamento exibe um heatmap das posições nos últimos dias — use os botões Dia / 7 dias / 30 dias para controlar o período.",
      },
      {
        subtitulo: "Navegação entre abas (Overview e Posicionamento)",
        texto:
          "As abas Overview e Posicionamento compartilham a FilterBar de mês/operadora na visão Overview. Com o foco em uma aba, use ← → do teclado para alternar entre elas (padrão tablist).",
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
          "Use as setas para navegar entre os meses disponíveis desde Janeiro de 2026, quando os dados de mídias sociais passaram a ser registrados. O botão Histórico exibe o acumulado de todo o período disponível.\n\nO filtro Operadoras aparece nas abas Overview e Conversão (quando visível para o seu perfil): KPIs, funis e tabelas mostram apenas campanhas da operadora selecionada, conforme cadastro em Marketing → Campanhas. Perfil operador vê automaticamente só a própria operadora, sem dropdown. Nas abas Impulsionamento e Alcance o filtro não é exibido — impulsionamento Meta e alcance orgânico são sempre globais (páginas Spin).\n\nAs quatro abas compartilham o mesmo período. Com o foco em uma aba, use ← → do teclado para alternar (tablist).",
      },
      {
        subtitulo: "Aba Overview — Conversão por Campanha",
        texto:
          "Apresenta três blocos (KPIs e comparativos com subtítulo \"acumulado\" no modo Histórico):\n\n— KPIs Consolidados: GGR, Registros e GGR por Jogador gerados pelas campanhas com UTMs mapeadas, com comparativo ao mesmo período do mês anterior quando não está em Histórico.\n\n— Detalhamento: tabela com os totais por dia (ou por mês no Histórico) de visitas, registros, FTDs e volume financeiro.\n\n— Comparativo de campanha: tabela com a performance de cada campanha individualmente. Clique nos cabeçalhos para ordenar. O GGR é calculado como Depósitos menos Saques.",
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
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de todo o período.\n\nO filtro de influencer restringe a visão a um único influencer — quando selecionado, todos os blocos refletem apenas os dados daquele influencer.\n\nO filtro de operadora restringe aos dados de uma plataforma específica.\n\nSe um influencer selecionado não tiver dados no novo período após trocar de mês, o filtro é removido automaticamente e uma notificação amarela é exibida no topo.",
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
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — o agendamento para o mesmo dia não é permitido. Apenas Admin e Gestor podem criar ou editar lives em datas e horários passados.\n\nLives com status Realizada ou Não Realizada são bloqueadas para edição por influencers, agências e operadores — o modal abre em modo somente leitura para esses perfis. Apenas Admin e Gestor podem editar ou corrigir lives já validadas.",
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
          "Use as setas para navegar entre semanas (rótulos acessíveis \"Semana anterior\" / \"Próxima semana\") ou ative o botão Histórico para ver todo o período validado disponível de uma vez — no mesmo espírito do modo Histórico dos dashboards Streamers. No modo Histórico, as setas ficam desabilitadas, os KPIs e a lista refletem o acumulado e o subtítulo dos blocos pode indicar \"acumulado\".\n\nOs filtros de Influencer (multi-seleção; agregadora **Todos Influencers**; pesquisa no painel quando há mais de cinco nomes) e Operadora aparecem na mesma linha da navegação, para perfis com acesso a múltiplos escopos. Enquanto os dados carregam, um indicador de carregamento pode aparecer na área principal.",
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
          "Cadastro central dos parceiros da operação. Reúne todos os dados necessários para ativar, acompanhar e pagar cada influencer — e serve de base para os módulos de Agenda, Resultados, Feedback e Financeiro.\n\nPara gestores e administradores, o subtítulo da página é 'Gerencie o cadastro completo dos parceiros — perfil, canais e financeiro.' Para o próprio influencer logado, a página exibe apenas o próprio perfil com a mensagem 'Seu perfil completo na plataforma.'",
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
          "Catálogo de **Game Presenters** (dealers) em operação no estúdio, sincronizado com RH. A operadora consulta especialidades, turno e estúdio e envia solicitações ao estúdio — não cadastra nem edita perfil aqui.\n\n**Fluxo:** RH cadastra e define a função em **Gestão de Prestadores** → gestor de estúdio configura perfil, estúdio e horários em **Gestão de Staff** → o card aparece aqui para a operadora vinculada ao estúdio.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "O carrossel de turnos no topo da página filtra o elenco por período de trabalho — Manhã, Tarde ou Noite. Use as setas laterais para alternar o turno; o rótulo central mostra o turno ativo. Quando o rótulo exibe 'Todos os turnos', nenhum filtro de turno está aplicado.\n\nO bloco consolidado abaixo exibe o total de dealers que atendem aos filtros ativos, com chips de gênero (Feminino / Masculino) e jogo (Blackjack / Roleta / Baccarat / Futebol Brasileiro) para refinar ainda mais a listagem. Cada chip mostra a contagem parcial e pode ser ativado ou desativado com um clique.\n\nO campo de busca aceita nome real ou nickname. O filtro de operadora aparece para perfis com acesso a múltiplas operadoras, permitindo isolar o elenco de uma parceira específica.",
      },
      {
        subtitulo: "Cards de Dealers",
        texto:
          "Cada dealer é exibido em um card com foto (ou inicial quando não há foto), badges de status e VIP sobre a imagem, turno no rodapé da foto e, no corpo, nome artístico, nome real, jogos de especialidade e operadora vinculada.\n\nQuando o dealer tem mais de uma foto cadastrada, setas de navegação aparecem sobre a imagem — use-as para ver todas as fotos do carrossel. O indicador de posição ('1 / 3', por exemplo) aparece no rodapé da foto.\n\nClique em Ver para abrir o perfil completo em modo somente leitura, incluindo gênero, turno, jogos, operadora e bio do dealer.",
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
          "— Gestor / Admin: visualização do elenco de todas as operadoras e histórico de solicitações de todas as operadoras.\n— Operador: visualiza apenas os dealers da sua operadora. Pode **Solicitar** troca ou feedback e abrir **Histórico** de solicitações por dealer.\n— Executivo: visualização completa, sem ações de escrita nesta página.\n\nO botão Solicitar só aparece para perfil Operador com operadora ativa no escopo. O botão Histórico exige permissão de visualização na Central de Notificações.",
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
          "Use as setas para navegar entre meses ou ative Histórico para ver todas as solicitações desde o início da operação. No modo Histórico, as setas ficam desabilitadas.\n\nO filtro de operadora aparece para perfis com acesso a múltiplas operadoras, permitindo isolar as notificações de uma parceira específica em todos os blocos da página.\n\nO indicador 'Carregando…' na barra de filtros é um estado secundário que confirma que os dados estão sendo atualizados após mudança de período ou operadora.",
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
          "No topo, cinco cards (formato Financeiro — rótulo em caixa alta acima do valor) mostram **TOTAL DE PEÇAS**, **DISPONÍVEIS**, **EMPRESTADAS**, **FIXOS** e **EM MANUTENÇÃO**; os números refletem os filtros ativos.\n\nAbaixo, a barra de filtros (sem título de seção) reúne operadora, categoria, tamanho, pesquisa, bipagem e abas de status.",
      },
      {
        subtitulo: "Abas de Inventário",
        texto:
          "O inventário é dividido em quatro abas:\n— Disponíveis: peças prontas para retirada\n— Emprestada: peças com retirada ativa (empréstimo ou uso fixo)\n— Manutenção: peças em costura, lavagem ou processo de descarte\n— Descartada: peças retiradas definitivamente do acervo\n\nO campo de Pesquisa localiza peças por código, categoria, operadora ou nome de quem realizou a retirada.",
      },
      {
        subtitulo: "Bipar Código",
        texto:
          "O botão Bipar código abre um leitor de câmera para escanear o código de barras impresso na etiqueta da peça. Também é possível digitar o código manualmente. Se a peça estiver disponível, o sistema abre o fluxo de Retirada; se estiver emprestada, abre o fluxo de Devolução.",
      },
      {
        subtitulo: "Cadastrar Peça",
        texto:
          "Ao cadastrar uma nova peça, o código é gerado automaticamente pelo sistema com prefixo das três primeiras letras da categoria (ex.: Camisa → CAM-000001, Vestido → VES-000001). Selecione os estúdios vinculados à peça (pode ser mais de um), a categoria, o tamanho e a data de entrada. Após salvar, o sistema exibe o código de barras gerado e permite baixar a etiqueta em PDF para impressão.",
      },
      {
        subtitulo: "Retirada e Devolução",
        texto:
          "Para registrar uma retirada, selecione a peça na tabela (ou bipe o código) e clique em Retirada. Busque o prestador pelo nome ou setor na lista da Gestão de Prestadores e escolha o tipo: Emprestar (temporário) ou Fixo (uso contínuo).\n\nNa devolução, informe a condição da peça: Boa condição, Possível descarte ou Manutenção. Peças devolvidas para manutenção exigem tipo e motivo.",
      },
      {
        subtitulo: "Manutenção e Descarte",
        texto:
          "Peças disponíveis podem ser enviadas para manutenção diretamente, sem passar por retirada. Tipos disponíveis: Costura, Lavagem, Perda e Descarte. Costura e Lavagem mantêm o status de manutenção; Perda e Descarte movem a peça para Descartada.\n\nPeças em manutenção podem ser Disponibilizadas (voltam ao estoque) ou Descartadas.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso é definido em Gestão de Usuários → Permissões para a página Figurinos. Sem permissão de edição, a área funciona em modo consulta — visualização de listagens e detalhes, sem alterar dados.",
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
          "O bloco Campanhas no topo reúne ações promocionais com título, texto, jogos aplicáveis e período de início/fim. Campanhas ativas no período aparecem para operadores na Central (badge VIGENTE). Gestores com permissão de criação usam '+ Campanha' para cadastrar; exclusão exige permissão de exclusão.\n\nAo criar ou editar, é possível abrir uma thread de solicitação com o estúdio — o fluxo segue o mesmo padrão da Central de Notificações.",
      },
      {
        subtitulo: "Blocos de roteiro",
        texto:
          "Três blocos fixos organizam o material:\n\n— Abertura: scripts e orientações de boas-vindas e aquecimento da mesa.\n— Durante o jogo: conteúdo para o miolo da sessão (tendências, foco no jogo, dicas).\n— Fechamento: encerramento, ultimato e mensagens de despedida.\n\nEm cada bloco, '+ Roteiro' abre o formulário de nova sugestão. Tipos Script, Orientação e Alerta definem o estilo visual do card. Tags de jogo indicam em quais mesas o material se aplica.\n\nOperadores com pendências de campanha podem ver o banner amarelo (quando aplicável) e abrir a conversa diretamente.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "O acesso é controlado em Gestão de Usuários → Permissões para a página Roteiro de Mesa. Criação, edição e exclusão dependem das permissões de Criar, Editar e Excluir. Sem permissão de edição, a página funciona em modo consulta — visualização dos blocos e campanhas do estúdio no escopo.",
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
          "A página Links e Materiais é onde o influencer gera o seu link de rastreamento exclusivo para a Casa de Apostas. O link é único por influencer e deve ser usado em todas as divulgações, pois é ele que registra o desempenho de aquisição.",
      },
      {
        subtitulo: "Link de Rastreamento",
        texto:
          "O link é formado por uma URL base fixa seguida de um parâmetro UTM personalizado com o nome artístico do influencer.\n\nPara gerar:\n— O campo UTM é preenchido automaticamente com o nome artístico cadastrado no perfil.\n— Edite o UTM se desejar um identificador diferente — apenas letras sem acento, números e _ (underscore) são permitidos, sem espaços.\n— Clique em Emitir para registrar o link. Uma vez emitido, o link não pode ser alterado.\n— Após a emissão, o link completo aparece na tela com um botão Copiar.",
      },
      {
        subtitulo: "QR Code do Link",
        texto:
          "Após emitir o link, três formatos de QR Code ficam disponíveis para download:\n— Apenas o QR Code: imagem limpa do código, fundo branco.\n— Gradiente escuro: QR Code no quadro Spin Gaming com fundo escuro em gradiente azul/roxo.\n— Gradiente claro: QR Code no quadro Spin Gaming com fundo claro em gradiente roxo/vermelho.\n\nTodos os formatos são exportados em PNG de alta resolução, prontos para uso em redes sociais, stream e materiais impressos.",
      },
      {
        subtitulo: "Emissão por Gestores",
        texto:
          "Gestores e administradores com permissão de editar podem emitir o link em nome de um influencer. Para isso, selecione o influencer no campo que aparece acima do UTM antes de clicar em Emitir.\n\nSe o influencer já tiver um link emitido, ele será exibido automaticamente ao selecionar o nome na lista.",
      },
      {
        subtitulo: "Requisitos para Emissão",
        texto:
          "O influencer precisa ter o perfil completo e o Playbook confirmado para emitir o link. Se algum desses requisitos não estiver atendido, a plataforma exibirá um aviso indicando o que falta e oferecerá um atalho direto para a página correspondente.",
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
          "Lista os informativos já publicados, filtrados por mês (data de postagem), modo Histórico (todo o período) e busca por palavras-chave no assunto ou na descrição.",
      },
      {
        subtitulo: "Gerenciamento de Informativos",
        texto:
          "Visível apenas para quem tem permissão de editar nesta página. Inclui tabela com todos os status (rascunho, aprovação, publicado, arquivado), filtros de status, carrossel de mês, Histórico e ações por linha: editar, aprovar, arquivar (ícone Archive + pop-up de confirmação), histórico de alterações e excluir (ícone vermelho + pop-up de confirmação, quando liberado). Use Novo Informativo para criar; no modal informe assunto, descrição com formatação e os perfis que verão o aviso na Home. Ao marcar o perfil Operador, escolha também a operadora de destino (operadoras com status Ativa em Gestão de Operadoras) ou a opção Todos.\n\nPublicação direta só quando o informativo for apenas para perfis internos operacionais (Gestor, RH, Prestadores, etc.). Se incluir Administrador, Executivo, Operador, Agência, Influencer, Afiliado ou Investidor, use apenas Enviar para aprovação. Quem pode aprovar depende dos perfis alvo; apenas Administradores podem aprovar a própria postagem — os demais precisam de outro usuário.",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Ver, criar, editar e excluir são configurados em Gestão de Usuários para a página Informativos. Sem permissão de visualização, a página não aparece no menu.",
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
          "Reúne avisos oficiais publicados pelo RH, organizados por categoria: Urgente, Geral, Pagamento e Eventos.\n\nComunicados marcados como Novo indicam que ainda não foram lidos. Clique em Lido para registrar a leitura — o badge desaparece após o clique.\n\nUm comunicado pode ser fixado no topo da lista para maior visibilidade. Quando fixado, aparece antes dos demais com o indicador Fixado.",
      },
      {
        subtitulo: "Filtros e Navegação de Comunicados",
        texto:
          "Use o carrossel de meses para navegar por período com base na data de publicação. Os pills de categoria (Todos, Urgente, Geral, Pagamento, Eventos) filtram por tipo.\n\nO botão Histórico exibe todas as postagens publicadas de todos os meses (Todo o período) — o carrossel de mês fica desabilitado nesse modo. Postagens arquivadas não aparecem nestas abas de leitura.\n\nA barra de pesquisa filtra por palavras no título ou no corpo do comunicado.\n\nCom o foco na lista de abas do portal, use as setas ← → do teclado para alternar entre Comunicados, Políticas, RH Talks e Gerenciamento (quando disponível).",
      },
      {
        subtitulo: "Políticas e Normativas",
        texto:
          "Lista documentos oficiais como códigos de conduta, políticas de segurança, normas de bonificação e folha de pagamento.\n\nClique em Ler Política/Normativa para abrir o documento completo. No modal, você pode ler a introdução, a descrição completa e acessar anexos. Ao clicar em Lido e Ciente, a plataforma registra a sua confirmação de leitura. O badge Novo some após isso.",
      },
      {
        subtitulo: "RH Talks",
        texto:
          "Reúne as atas das reuniões periódicas do RH com colaboradores.\n\nCada RH Talk tem um número sequencial, título e uma introdução. Clique em Ver Ata para abrir o conteúdo completo. Algumas atas são restritas a participantes: se você não estava na reunião, o botão Ver Ata estará desabilitado e um aviso informará a restrição.",
      },
      {
        subtitulo: "Gerenciamento de Postagens (Gestores)",
        texto:
          "Disponível apenas para usuários com permissão de editar no Portal de RH.\n\nA aba exibe uma tabela com todas as postagens (comunicados, políticas e RH Talks), incluindo arquivadas, com colunas de assunto, autor, tipo, datas e status.\n\nAções disponíveis por status:\n— Rascunho: Editar\n— Em aprovação: Editar, Aprovar\n— Publicado: Arquivar (ícone Archive + pop-up de confirmação)\n— Qualquer status: ver Histórico de alterações (registro de alterações da postagem, na linha da tabela)\n\nO carrossel de mês e o botão Histórico usam a data de publicação. O Histórico na barra mostra todas as postagens de todos os meses; o filtro Status da postagem (incluindo Arquivado) define o que aparece na tabela. Use também os filtros de tipo e a busca por palavras-chave. Clique em Nova Postagem para redigir um novo conteúdo.",
      },
      {
        subtitulo: "Criar e Publicar Postagens",
        texto:
          "Ao criar uma postagem, selecione o tipo (Comunicado, Política/Normativa ou RH Talk). Campos marcados com asterisco vermelho são obrigatórios para publicar.\n\nSalvar grava como rascunho sem publicar. Publicar torna o item visível imediatamente (ou envia para aprovação, no caso de políticas que exigem aprovação).\n\nÉ possível anexar uma imagem e um arquivo a qualquer tipo de postagem.",
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
          "Navegue pelos meses com as setas ou ative o Histórico para ver todas as solicitações sem restrição de período. O filtro de Influencers (pill, **Todos Influencers** por defeito; pesquisa no painel com mais de cinco nomes) permite selecionar nomes específicos; o de operadora restringe à plataforma escolhida.\n\nO filtro de operadora só aparece para perfis de gestão — influencers e agências veem apenas seus próprios dados.",
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
          "Use as setas para navegar entre os meses e o botão Histórico para ver todos os ciclos sem restrição de período. O filtro de Influencers (pill, **Todos Influencers** por defeito; pesquisa no painel com mais de cinco nomes) permite focar em um ou mais nomes específicos; o filtro de operadora restringe os dados à plataforma selecionada.\n\nO mês exibido no carrossel determina quais ciclos aparecem no bloco de Ciclo de Pagamento — ciclos cujo último dia cai dentro do mês selecionado.",
      },
      {
        subtitulo: "KPIs",
        texto:
          "Três cards no topo (formato igual à Banca de Jogo — rótulo em caixa alta acima do valor, sem caixa branca em volta):\n\n— **R$ PAGO:** soma dos pagamentos com status Pago\n— **R$ PENDENTE:** soma dos pagamentos Em análise ou Aguardando pagamento\n— **HORAS REALIZADAS:** horas acumuladas de todos os influencers no período\n\nOs valores se atualizam conforme os filtros aplicados.",
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
          "A página Campanhas permite cadastrar as campanhas de mídia social utilizadas nas ações de marketing da plataforma. Cada campanha pode ser vinculada a uma operadora específica ou permanecer genérica. Os UTMs mapeados na Gestão de Links que são associados a uma campanha alimentam automaticamente a página **Mídias Sociais** com dados de funil e performance.",
      },
      {
        subtitulo: "Indicadores de Resumo",
        texto:
          "Três cards no topo (formato Financeiro/Banca de Jogo — rótulo em caixa alta acima do valor): **TOTAL**, **ATIVAS** e **INATIVAS**. Os valores se atualizam imediatamente após qualquer criação, edição ou exclusão.",
      },
      {
        subtitulo: "Tabela de Campanhas",
        texto:
          "Lista todas as campanhas ordenadas pelo campo selecionado. Colunas disponíveis: Nome, Operadora, Status (Ativa/Inativa) e data de criação.\n\nO botão Editar abre o formulário preenchido com os dados atuais da campanha, permitindo alterar o nome, a operadora e o status. O botão Excluir (ícone vermelho) abre o pop-up padrão de confirmação e remove a campanha permanentemente — os vínculos com UTMs mapeados na Gestão de Links são desfeitos automaticamente, mas os dados históricos de performance permanecem nos dashboards.",
      },
      {
        subtitulo: "Criando uma Campanha",
        texto:
          "No bloco **Campanhas cadastradas**, use **Nova Campanha** na mesma linha do título (ícone + no padrão de criação) para abrir o formulário. O nome é obrigatório; a operadora é opcional — use quando a campanha for específica para uma plataforma. Novas campanhas são criadas como Ativas por padrão.\n\nAo editar, o campo Status permite marcar a campanha como Inativa. UTMs já mapeados permanecem vinculados mesmo após a inativação — a campanha inativa apenas deixa de aparecer como opção ao mapear novos links.",
      },
    ],
  },
  galeria_fotos: {
    titulo: "Galeria de Fotos",
    blocos: [
      {
        texto:
          "A página **Galeria de Fotos** centraliza imagens de eventos e ações da Spin. A equipe de Marketing envia fotos **gerais** (visíveis e baixáveis por quem tem permissão de Ver) e fotos **individuais de colaboradores** (visíveis apenas para quem tem permissão de Criar, Editar ou Excluir na página — liberação aos próprios colaboradores será tratada em evolução futura).",
      },
      {
        subtitulo: "Aba Galeria",
        texto:
          "Filtre por evento nos chips da barra superior ou use **Todos os eventos**. Quem gerencia a galeria também filtra por **Gerais** ou **Colaboradores**. A busca localiza evento, nome do colaborador ou legenda.\n\nAs fotos aparecem em blocos por evento (título + data). Clique na miniatura para ampliar; use o ícone de download para salvar o arquivo. Exclusão exige permissão de Excluir e abre o pop-up padrão de confirmação.",
      },
      {
        subtitulo: "Aba Upload",
        texto:
          "Disponível com permissão de **Criar**. Selecione ou cadastre um **evento** (**Novo Evento**), escolha o tipo (**Fotos gerais** ou **Fotos de colaborador**), vincule o colaborador quando for individual, opcionalmente informe uma legenda e selecione um ou mais arquivos (JPG, PNG ou WebP, até 10 MB cada).",
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
          "Use a busca para localizar marcas por CNPJ, razão social ou nome da marca. O filtro **Comercial** restringe a lista ao responsável interno (**Todos Comerciais**, **Nenhum** ou um gestor).\n\nAs abas organizam o funil:\n— **Todos:** visão consolidada com totais hierárquicos.\n— **Disponíveis**, **Conexão**, **Negociação** e **Fechado:** KPIs clicáveis filtram o detalhe da tabela por substatus.\n\nAs URLs das abas são sincronizadas com a rota (`/PipelineB2B/...`).",
      },
      {
        subtitulo: "Tabela e edição",
        texto:
          "A coluna **Razão Social** agrupa marcas do mesmo CNPJ. Clique no nome da marca ou no ícone **Ver** para abrir domínio, portaria, requerimento e contatos (somente leitura). **Registro** abre anotações da equipe e histórico de alterações (Comercial, Status, Dedicada, Network).\n\nCom permissão de Editar, clique nas células **Comercial**, **Status**, **Dedicada** ou **Network** para alterar via lista. Contatos: clique no nome para editar ou use **+** para adicionar.\n\nAs flags de **Dedicada** e **Network** usam cores em progressão do pior ao melhor cenário: vermelho (Sem interesse) → cinza (Sem proposta) → amarelo (Em negociação) → azul (Contrato enviado) → roxo (Contrato Assinado) → verde (Ativo).",
      },
      {
        subtitulo: "Comunicar",
        texto:
          "O botão **Comunicar** na toolbar da tabela será usado para registrar comunicações com a marca (e-mail/mensagem) e alimentar a coluna **Última Comunicação** — fluxo em implementação posterior.",
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
          "Exibe o status de cada pipeline de dados (CDA, Social Media, Spin na Rede RSS, Lobby, e-mails agendados e transacionais) e a linha **Diagnóstico da Plataforma**, com horário da última execução, volume de verificações/envios e erros. E-mails de **Relatório** e **Agenda** têm ação **Enviar**; **Boas-vindas** e **Reset de senha** são só acompanhamento (disparo automático ao criar conta ou redefinir senha). O diagnóstico manual fica **OK** quando a execução conclui; achados (avisos/falhas de secrets ou integrações) aparecem na coluna Erros e em **Logs Recentes**. Com permissão de Editar, use **Executar** na linha de diagnóstico.",
      },
      {
        subtitulo: "Logs Recentes",
        texto:
          "Lista eventos técnicos das últimas horas, incluindo falhas de sync e linhas geradas pelo diagnóstico manual. Filtre por tipo; entradas de diagnóstico resumem quantos checks passaram, avisaram ou falharam na execução.",
      },
      {
        subtitulo: "Fluxo de dados",
        texto:
          "Gráfico de barras empilhadas com os últimos 14 dias. Cada cor representa uma fonte de dados. Passe o cursor sobre uma barra para ver o detalhamento por fonte naquele dia.",
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
          "Lista todos os usuários cadastrados. Permite buscar por nome ou e-mail, filtrar por status (Ativo / Desativado) e por perfil. Administradores podem criar novos usuários, editar dados e escopos, redefinir senhas para o padrão e desativar acessos.",
      },
      {
        subtitulo: "Aba Permissões",
        texto:
          "Define, por perfil, o que cada papel pode Ver, Criar, Editar e Excluir em cada página da plataforma. O perfil Administrador não é configurado aqui — mantém acesso total fixo. As alterações entram em vigor no próximo carregamento de página do usuário afetado.",
      },
      {
        subtitulo: "Abas Operadora, Gestores e Prestadores",
        texto:
          "Controlam quais páginas aparecem no menu para cada grupo operacional.\n— Operadora: define o menu visível para operadores de cada operadora.\n— Gestores: define o menu por tipo de gestor (ex.: Estúdio, Marketing).\n— Prestadores: define o menu por área de atuação (ex.: Game Presenter, Customer Service).\nO acesso efetivo é sempre o cruzamento destas marcações com a matriz de Permissões.",
      },
    ],
  },
  gestao_links: {
    titulo: "Gestão de Links",
    blocos: [
      {
        texto:
          "A página Gestão de Links centraliza o mapeamento dos UTM Sources detectados nas operadoras que ainda não estão associados a nenhum influencer ou campanha. Ao mapear um link, os dados históricos de FTDs, depósitos e GGR são sincronizados automaticamente nos dashboards. Novos dados chegam diariamente até as 4h.",
      },
      {
        subtitulo: "Abas de Status",
        texto:
          "Os links são organizados em três abas:\n— Pendentes: links detectados sem associação — precisam ser mapeados ou ignorados\n— Mapeados: links já associados a um influencer ou campanha\n— Ignorados: links descartados, que não serão mapeados\n\nO contador em vermelho na aba Pendentes indica quantos links aguardam ação. Use as setas ← → do teclado com o foco na tablist para alternar entre as abas.",
      },
      {
        subtitulo: "Filtro de Operadora",
        texto:
          "Quando visível, o filtro de operadora restringe a listagem à plataforma selecionada. Ao selecionar uma operadora específica, a coluna Operadora some da tabela — os dados já estão filtrados. Selecione **Todas Operadoras** no filtro para ver tudo junto.",
      },
      {
        subtitulo: "Tabela de Links",
        texto:
          "Cada linha mostra o UTM Source detectado, o status do influencer associado (quando aplicável), a operadora de origem, as datas de primeiro e último registro, FTDs, depósitos e GGR acumulados.\n\nNa aba Pendentes, as ações disponíveis são Mapear (abre o modal de associação) e Ignorar (descarta o link sem mapeamento). Nas demais abas, a ação Reabrir devolve o link para Pendentes, permitindo remapeamento.",
      },
      {
        subtitulo: "Mapeando um Link",
        texto:
          "Clique em Mapear para abrir o modal com os dados do UTM Source. Escolha o tipo de associação:\n— Influencer: vincula o link ao perfil do influencer nos dashboards\n— Campanha: vincula a uma campanha de marketing\n\nApós confirmar, os dados históricos são sincronizados automaticamente. O processo pode levar alguns segundos dependendo do volume de dados.",
      },
    ],
  },
};
