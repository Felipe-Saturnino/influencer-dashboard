export interface GlossarioTermo {
  termo: string;
  definicao: string;
  formula?: string;
  nota?: string;
  referencia?: string;
}

export interface GlossarioCategoria {
  key: string;
  label: string;
  accentColor: string;
  termos: GlossarioTermo[];
}

export const GLOSSARIO_CATEGORIAS: GlossarioCategoria[] = [
  {
    key: "operacao_lives",
    label: "Operação de Lives",
    accentColor: "#7c3aed",
    termos: [
      {
        termo: "Lives",
        definicao:
          'Total de transmissões ao vivo realizadas pelo influencer no período. Só são contabilizadas lives com status "Realizada" no sistema.',
        referencia: "Agenda · Feedback · Streamers → Overview · Overview Influencer",
      },
      {
        termo: "Horas Realizadas",
        definicao:
          "Soma total de horas de transmissão ao vivo no período. Calculado a partir da duração individual de cada live. Exibido no formato HH:MM.",
        referencia: "Streamers → Overview · Feedback · Overview Influencer",
      },
      {
        termo: "Validação de Live",
        definicao:
          "Processo de confirmar o resultado de uma live agendada — registrando se ela foi Realizada ou Não Realizada, e quando realizada, os dados de duração e audiência. A validação é feita na página Resultados.",
        nota:
          "Somente lives com horário passado há mais de 5 horas aparecem para validação — a janela garante que a live terminou antes do registro.\n\nA operadora deve ser informada obrigatoriamente na validação, pois é o vínculo usado pelo módulo Financeiro para calcular os pagamentos do ciclo correspondente.",
        referencia: "Resultados",
      },
      {
        termo: "Janela de Elegibilidade",
        definicao:
          "Intervalo de tempo após o horário agendado de uma live em que ela passa a aparecer na página Resultados para validação.",
        nota:
          "A janela padrão é de 5 horas após o horário agendado (fuso local). Lives ainda dentro desse intervalo não entram na fila de validação — o sistema assume que a transmissão pode ainda estar em andamento.",
        referencia: "Resultados",
      },
      {
        termo: "Semana de Referência",
        definicao:
          "Período de sete dias usado como unidade de filtro na página Feedback para agrupar lives validadas e seus resultados.",
        nota:
          "O carrossel de semanas navega entre períodos disponíveis. O modo Histórico desativa o filtro por semana e exibe todo o período com dados cadastrados.",
        referencia: "Feedback",
      },
      {
        termo: "Influencers Ativos",
        definicao:
          "Número de influencers que realizaram ao menos uma live no período. Influencers cadastrados sem live no período não são contabilizados.",
        referencia: "Streamers → Overview",
      },
      {
        termo: "Link da Live",
        definicao:
          "URL do canal ou sala do influencer na plataforma onde a live será transmitida. Obrigatório para criar ou editar uma live na Agenda.",
        nota:
          "O link é pré-preenchido automaticamente com o link cadastrado no perfil do influencer para a plataforma selecionada. Se o perfil não tiver o link cadastrado, o campo fica em branco e deve ser preenchido manualmente antes de salvar.\n\nO link aparece na visualização de Dia no calendário e pode ser acessado diretamente da live.",
        referencia: "Agenda",
      },
      {
        termo: "Playbook Influencers",
        definicao:
          "Conjunto de termos, diretrizes e boas práticas que o influencer deve ler e confirmar antes de iniciar as ativações. O registro de ciência no Playbook é um pré-requisito obrigatório para agendar lives e emitir links de rastreamento.",
        nota:
          "Enquanto o influencer não confirmar ciência no Playbook, o agendamento de novas lives é bloqueado. A mensagem de bloqueio aparece na Agenda ao tentar criar uma nova live.",
        referencia: "Agenda · Links e Materiais",
      },
      {
        termo: "Média de Views",
        definicao:
          "Média de visualizações simultâneas por live no período. Lives sem dado de views são excluídas do cálculo.",
        nota:
          "Diferente de Máx Views: a Média representa a audiência sustentada ao longo da transmissão, enquanto Máx Views é o pico de audiência.\n\nUm influencer com média alta e pico próximo da média manteve a audiência de forma consistente. Um influencer com pico muito acima da média teve um momento específico de destaque.",
        referencia: "Streamers → Overview · Feedback · Overview Influencer",
      },
      {
        termo: "Máx Views",
        definicao:
          "Pico máximo de espectadores simultâneos alcançado durante uma live. Diferente de Média de Views, que é a média ao longo da transmissão.",
        nota:
          "Picos altos com média baixa indicam um momento de destaque sem audiência sustentada; quando ambos são altos, a live manteve audiência do início ao fim.\n\nExibido na coluna 'Máx Views' da tabela Detalhamento Diário / Detalhamento Mensal no Overview Influencer.",
        referencia: "Overview Influencer",
      },
      {
        termo: "Duração Live",
        definicao:
          "Tempo de duração de uma transmissão individual, em horas e minutos. Diferente de Horas Realizadas, que é o acumulado total do período.",
        referencia: "Overview Influencer",
      },
    ],
  },
  {
    key: "cadastro_influencers",
    label: "Gestão de Influencers",
    accentColor: "#22c55e",
    termos: [
      {
        termo: "Status do Influencer",
        definicao:
          "Classificação do estado do relacionamento comercial com o influencer na plataforma.",
        nota:
          "Ativo: influencer com parceria vigente, habilitado para agendar lives e gerar links.\nInativo: parceria pausada — o influencer continua cadastrado mas não pode ser agendado.\nCancelado: parceria encerrada definitivamente.\n\nAlterações de status são restritas a Admin e Gestor. A data da última alteração de status é registrada automaticamente e pode ser consultada na aba Histórico do modal de visualização.",
        referencia: "Influencers",
      },
      {
        termo: "Cachê por Hora",
        definicao:
          "Valor de remuneração do influencer por hora de live transmitida. Base de cálculo dos pagamentos no módulo Financeiro.",
        nota:
          "Alterações do cachê por hora são restritas a Admin e Gestor. O campo aparece bloqueado no formulário de edição para outros perfis.\n\nNo Scout, o campo correspondente é 'Cachê Negociado' — ao fechar a parceria, o valor é sincronizado automaticamente com o cachê por hora no cadastro do influencer em Influencers.",
        referencia: "Influencers · Financeiro",
      },
      {
        termo: "Perfil Incompleto",
        definicao:
          "Indicação de que um influencer ativo possui dados obrigatórios não preenchidos no cadastro. Um perfil incompleto bloqueia o agendamento de novas lives e a emissão de links de rastreamento.",
        nota:
          "Os dados obrigatórios que geram o alerta incluem: nome artístico, pelo menos um canal com link e dados bancários para pagamento.\n\nO quadro 'Perfil Incompleto' no topo da página Influencers lista os nomes clicáveis — clique no nome para abrir diretamente o formulário de edição. O badge 'Perfil incompleto' também aparece no card da lista.",
        referencia: "Influencers · Agenda",
      },
    ],
  },
  {
    key: "prospeccao_scout",
    label: "Prospecção e Scout",
    accentColor: "#6b7280",
    termos: [
      {
        termo: "Funil de Prospecção",
        definicao:
          "Etapas do processo de negociação com um candidato a parceiro, desde o primeiro contato até o fechamento.",
        nota:
          "Visualizado → Contato → Negociação → Fechado.\n\nNo **Scout**, a criação do usuário influencer ocorre ao marcar **Fechado** com todos os campos obrigatórios preenchidos. No **Network** (afiliados), a criação pode ocorrer em qualquer etapa ao salvar um prospecto sem usuário — ver termo Network (Afiliados).",
        referencia: "Scout · Network",
      },
      {
        termo: "Live Cassino",
        definicao:
          "Indicação de que o prospecto realiza ou tem histórico de lives de cassino ao vivo. Campo informativo cadastrado na aba Contato do Scout.",
        nota:
          "Quando marcado como 'Sim', o badge 'Live Cassino' aparece no card do prospecto na lista, facilitando a identificação visual de candidatos com experiência nesse formato.",
        referencia: "Scout",
      },
      {
        termo: "Categorias de Conteúdo",
        definicao:
          "Classificação do tipo de conteúdo que o prospecto produz, usada para segmentar e identificar candidatos por perfil de audiência.",
        nota:
          "Opções disponíveis: Vida Real, Jogos Populares, Variedades, Esportes, Cassino. Multi-seleção — um prospecto pode ter mais de uma categoria.",
        referencia: "Scout",
      },
    ],
  },
  {
    key: "funil_conversao",
    label: "Funil de Conversão",
    accentColor: "#1e36f8",
    termos: [
      {
        termo: "Views",
        definicao:
          "Média de visualizações simultâneas das lives do influencer. Utilizada como topo do funil para calcular a taxa de clique no link.",
        referencia: "Streamers → Conversão · Streamers → Overview",
      },
      {
        termo: "Acessos",
        definicao:
          "Número de visitas ao link de afiliado do influencer no período. Representa o tráfego gerado pelas lives e conteúdos publicados.",
        referencia: "Streamers → Conversão · Overview Influencer",
      },
      {
        termo: "Registros",
        definicao:
          "Número de novos cadastros realizados via link do influencer. Um acesso que resulta em cadastro completo conta como 1 registro.",
        referencia: "Streamers → Conversão · Streamers → Overview · Overview Influencer · Mídias Sociais",
      },
      {
        termo: "FTD (First Time Deposit)",
        definicao:
          "Primeiro depósito de um novo jogador — um por jogador. Representa a conversão final do funil: o jogador acessou, se cadastrou e depositou pela primeira vez.",
        nota: "É a principal métrica de resultado do influencer.",
        referencia: "Todos os dashboards",
      },
      {
        termo: "Taxa View → Acesso",
        definicao:
          "Percentual de views que resultaram em acesso ao link. Taxa baixa indica que o influencer precisa divulgar mais o link durante a live.",
        formula: "Acessos ÷ Views × 100",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Taxa Acesso → Registro",
        definicao:
          "Percentual de acessos que resultaram em cadastro. Taxa baixa indica problema na conversão da landing page ou no perfil do público.",
        formula: "Registros ÷ Acessos × 100",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Taxa Registro → FTD",
        definicao:
          "Percentual de cadastros que realizaram o primeiro depósito. Taxa baixa indica que os jogadores captados não estão ativando a conta.",
        formula: "FTDs ÷ Registros × 100",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Taxa View → FTD",
        definicao:
          "Percentual de views que se converteram em primeiro depósito. Taxa geral de eficiência do funil completo.",
        formula: "FTDs ÷ Views × 100",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Taxa Acesso → FTD",
        definicao:
          "Percentual de acessos ao link que resultaram em primeiro depósito, pulando a etapa de registro.",
        formula: "FTDs ÷ Acessos × 100",
        nota:
          "Útil para avaliar eficiência quando o usuário já tinha cadastro. Não consta como coluna na tabela Comparativo de Taxas (Streamers → Conversão), que exibe View→Acesso, Acesso→Registro, Registro→FTD e Visita→FTD.",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "FTD/Hora",
        definicao:
          "Quantidade de primeiros depósitos gerados por hora de live transmitida por um influencer.",
        formula: "FTD/Hora = FTDs ÷ Horas Realizadas",
        nota:
          "Métrica de eficiência operacional. Influencers sem horas registradas não aparecem no Ranking FTD/Hora.",
        referencia: "Streamers · Conversão",
      },
      {
        termo: "Ação de Conversão",
        definicao:
          "Classificação automática da etapa crítica do funil de cada influencer no período. Indica onde está o maior gargalo e qual ação priorizar.",
        nota:
          "Divulgar o link: taxa View→Acesso abaixo de 10% — o influencer precisa mencionar o link com mais frequência durante as lives.\n\nConverter visita: taxa Acesso→Registro abaixo de 10% — os usuários chegam ao link mas não completam o cadastro.\n\nAtivar cadastro: taxa Registro→FTD abaixo de 60% — os cadastros existem mas os jogadores não estão realizando o primeiro depósito.\n\nEm dia: todas as taxas dentro dos limites — nenhuma ação prioritária identificada.",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Engajamento (Mídias Sociais)",
        definicao:
          "Soma de interações dos usuários com as publicações — curtidas, comentários, salvamentos, reações e cliques, dependendo da plataforma.",
        nota:
          "Cada rede social contabiliza o engajamento de forma diferente:\n\n— Instagram: curtidas + comentários + salvamentos\n— Facebook: reações + comentários\n— YouTube: visualizações + curtidas + comentários\n\nO valor exibido nos cards de canal é a soma do período, não uma média.",
        referencia: "Mídias Sociais → Alcance",
      },
      {
        termo: "Taxa de Engajamento",
        definicao:
          "Percentual de pessoas que interagiram com o conteúdo em relação ao total de impressões (ou visualizações no YouTube). Indica a qualidade do conteúdo além do volume.",
        formula: "Engajamentos ÷ Impressões × 100",
        nota:
          "Uma taxa alta com volume baixo indica conteúdo relevante para a audiência que o vê, mas alcance limitado. Uma taxa baixa com volume alto indica alcance amplo, mas baixa conexão com o público.\n\nExibida como 'Eng. X.X%' no badge de cada card de canal na aba Alcance.",
        referencia: "Mídias Sociais → Alcance",
      },
    ],
  },
  {
    key: "financeiro",
    label: "Métricas Financeiras",
    accentColor: "#22c55e",
    termos: [
      {
        termo: "GGR (Gross Gaming Revenue)",
        definicao:
          "Receita bruta do jogo. Representa o quanto a plataforma reteve do volume depositado pelos jogadores captados.",
        formula: "Total de Depósitos − Total de Saques",
        nota:
          "O GGR é sempre calculado pelo canal de aquisição. Nas páginas de influencers, considera apenas jogadores captados via influencers. Em Overview Spin, considera todos os canais.",
        referencia:
          "Streamers → Overview · Streamers → Financeiro · Overview Influencer · Overview Spin · Mídias Sociais · Financeiro",
      },
      {
        termo: "R$ FTD (Valor Total de FTDs)",
        definicao:
          "Soma dos valores dos primeiros depósitos no período. Mede o volume financeiro de entrada dos jogadores novos captados.",
        referencia: "Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "Ticket Médio FTD",
        definicao:
          "Valor médio do primeiro depósito dos jogadores captados por um influencer ou campanha.",
        formula: "Ticket Médio FTD = Total R$ FTDs ÷ Quantidade de FTDs",
        referencia: "Streamers · Financeiro · Overview Influencer",
      },
      {
        termo: "Depósitos",
        definicao:
          "Soma de todos os depósitos realizados pelos jogadores captados no período, incluindo depósitos subsequentes ao primeiro.",
        nota:
          "Nos dashboards, o mesmo rótulo pode aparecer junto à quantidade de depósitos (#) no detalhamento ou em cards com subvalor.",
        referencia: "Streamers → Financeiro · Streamers → Overview · Overview Influencer · Mídias Sociais",
      },
      {
        termo: "Ticket Médio Depósito",
        definicao:
          "Valor médio por depósito. Um ticket médio alto indica jogadores de maior valor.",
        formula: "Total Depósitos ÷ Quantidade de Depósitos",
        referencia: "Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "Saques",
        definicao:
          "Soma de todos os saques realizados pelos jogadores captados no período. Um volume alto de saques reduz o GGR.",
        nota:
          "Nos dashboards, o mesmo rótulo pode aparecer junto à quantidade de saques (#) no detalhamento ou em cards com subvalor.",
        referencia: "Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "Ticket Médio Saque",
        definicao: "Valor médio por saque.",
        formula: "Total Saques ÷ Quantidade de Saques",
        referencia: "Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "WD Ratio (Withdrawal/Deposit Ratio)",
        definicao:
          "Razão entre o total de saques e o total de depósitos de uma base de jogadores, expressa em percentual.",
        formula: "WD Ratio = (Total de Saques ÷ Total de Depósitos) × 100",
        nota:
          "< 60%: saudável (verde); 60–80%: atenção (amarelo); > 80%: crítico (vermelho). Um WD Ratio alto indica que os jogadores estão retirando mais do que depositando.",
        referencia: "Streamers · Overview Influencer",
      },
      {
        termo: "GGR por Jogador",
        definicao:
          "Receita bruta média gerada por jogador captado. Indica o valor médio de cada jogador trazido pelo influencer.",
        formula: "GGR ÷ FTDs",
        referencia: "Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "Investimento",
        definicao:
          "Valor total pago ao influencer no período (cachê por hora de live + bônus por performance, quando aplicável). Base para cálculo de ROI e custos unitários.",
        referencia:
          "Streamers → Overview · Streamers → Financeiro · Overview Influencer · Financeiro",
      },
      {
        termo: "ROI (Return on Investment)",
        definicao: "Retorno sobre o investimento no influencer.",
        formula: "(GGR − Investimento) ÷ Investimento × 100",
        nota:
          "Rentável: ROI > 0% · Atenção: ROI entre −20% e 0% · Não Rentável: ROI < −20% · Bônus: sem investimento registrado mas com GGR positivo",
        referencia: "Streamers → Overview · Streamers → Financeiro · Overview Influencer",
      },
      {
        termo: "Custo por FTD",
        definicao:
          "Quanto custa em investimento cada novo jogador que realizou o primeiro depósito. Métrica de eficiência de aquisição.",
        formula: "Investimento ÷ FTDs",
        referencia: "Streamers → Overview",
      },
      {
        termo: "Custo por Registro",
        definicao:
          "Quanto custa em investimento cada cadastro realizado. Complementa o Custo por FTD para identificar onde o funil perde eficiência.",
        formula: "Investimento ÷ Registros",
        referencia: "Streamers → Overview",
      },
    ],
  },
  {
    key: "indices",
    label: "Índices e Classificações",
    accentColor: "#a78bfa",
    termos: [
      {
        termo: "PVI (Player Value Index)",
        definicao:
          "Player Value Index — índice de qualidade da base de jogadores gerada por um influencer, em escala de 0 a 100 pontos.",
        formula:
          "PVI = (Score Ticket Médio Depósito × 0,4) + (Score GGR por Jogador × 0,4) + (Score WD Ratio × 0,2)",
        nota:
          "Perfis: Whales (≥ 80 pts), Core (60–79 pts), Recreativos (15–59 pts), Caçadores de Bônus (< 15 pts). Sempre exibido como 'X pts', nunca como percentual.",
        referencia: "Streamers · Overview Influencer",
      },
      {
        termo: "Perfil de Jogador",
        definicao:
          "Classificação automática do tipo de jogador captado pelo influencer, baseada no PVI.",
        nota:
          "Whales (PVI ≥ 80): alto valor, apostas elevadas, baixa retirada · Core (PVI ≥ 60): regulares com bom equilíbrio · Recreativos (PVI ≥ 15): casuais, comportamento de entretenimento · Caçadores de Bônus (PVI < 15): foco em promoções, alta taxa de saque",
        referencia: "Streamers → Financeiro",
      },
      {
        termo: "Status ROI",
        definicao:
          "Classificação de performance financeira do influencer no período.",
        nota:
          "Rentável: ROI positivo — o GGR supera o investimento.\nAtenção: ROI levemente negativo (−20% a 0%) — resultado próximo do equilíbrio.\nNão Rentável: ROI abaixo de −20% — investimento significativamente superior ao retorno.\nBônus: sem pagamento registrado mas com GGR gerado — influencer que trouxe resultado sem custo no período.\nSem dados: sem lives ou métricas de conversão no período selecionado.\n\nO status é exibido no Ranking de Influencers da aba Overview. Use os badges de filtro de status para segmentar a tabela por categoria.",
        referencia: "Streamers → Overview",
      },
    ],
  },
  {
    key: "mesas",
    label: "Métricas de Overview Spin",
    accentColor: "#70cae4",
    termos: [
      {
        termo: "GGR nas Mesas (Gross Gaming Revenue)",
        definicao:
          "Receita bruta gerada pelas mesas de jogo Spin Gaming. Diferente do GGR de influencers — que considera apenas jogadores captados via afiliados —, o GGR nas Mesas considera todos os canais de aquisição que jogaram nas mesas no período.",
        formula: "Total de Depósitos − Total de Saques",
        nota:
          "O número do GGR na Overview Spin pode diferir do GGR na página de Streamers porque cada página filtra pelo seu canal de aquisição. Não é inconsistência — é design.",
        referencia: "Overview Spin",
      },
      {
        termo: "Turnover",
        definicao:
          "Volume financeiro total apostado pelos jogadores nas mesas Spin Gaming no período. Soma bruta de todas as apostas realizadas, independentemente do resultado.",
        nota:
          "Turnover alto com GGR baixo indica que os jogadores apostam muito mas a casa reteve pouco — margem baixa. A relação entre os dois é a Margem.",
        referencia: "Overview Spin",
      },
      {
        termo: "Apostas",
        definicao:
          "Número total de apostas realizadas nas mesas no período. Combinado com o Turnover, gera a Aposta Média.",
        nota: "Nos dados exportados ou em documentação técnica pode aparecer como quantidade de apostas.",
        referencia: "Overview Spin",
      },
      {
        termo: "Margem",
        definicao:
          "Percentual de retenção da casa sobre o volume apostado. Representa o 'edge' natural do jogo — quanto, em média, a casa retém de cada real apostado.",
        formula: "GGR ÷ Turnover × 100",
        nota:
          "Para jogos de mesa ao vivo, valores entre 3% e 10% são típicos. Acima de 10%: período excepcionalmente favorável para a casa. Abaixo de 0%: período negativo — saques superaram depósitos.\n\nA Margem varia por tipo de jogo. O Comparativo de Jogo na Overview Spin permite visualizar a margem individual de Blackjack, Roleta, Speed Baccarat e Futebol Brasileiro.",
        referencia: "Overview Spin",
      },
      {
        termo: "Aposta Média",
        definicao:
          "Valor médio por aposta (bet size). Indica o perfil de aposta dos jogadores ativos nas mesas — quanto cada apostador coloca, em média, por rodada.",
        formula: "Turnover ÷ Quantidade de Apostas",
        referencia: "Overview Spin",
      },
      {
        termo: "UAP (Unique Active Players)",
        definicao:
          "Jogadores únicos que apostaram nas mesas Spin Gaming no período. Métrica de audiência ativa — quantas pessoas distintas jogaram, independentemente de quantas apostas cada uma fez.",
        nota:
          "No mês corrente (MTD), o UAP pode aparecer como '—' porque o valor oficial é gerado pelo resumo mensal, publicado ao final do mês. Durante o mês em andamento, o dado ainda não está disponível.",
        referencia: "Overview Spin",
      },
      {
        termo: "ARPU (Average Revenue Per User)",
        definicao:
          "Receita média gerada por cada jogador ativo nas mesas. Indica o valor individual médio de cada UAP no período.",
        formula: "GGR ÷ UAP",
        nota:
          "O ARPU depende do UAP mensal oficial (snapshot do final do mês). No mês corrente, ambos podem aparecer como '—' até o fechamento do período.",
        referencia: "Overview Spin",
      },
      {
        termo: "Jogos Spin",
        definicao:
          "Os tipos de mesa ao vivo operados pela Spin Gaming nas plataformas parceiras:\n\n— Blackjack: disponível em múltiplas mesas (Blackjack 1, Blackjack 2, Blackjack VIP), cada uma com limites e perfis de aposta distintos.\n— Roleta: mesa única por operadora.\n— Speed Baccarat: versão acelerada do Baccarat, com rodadas mais rápidas.\n— Futebol Brasileiro: jogo ao vivo com mesas configuráveis por operadora (inicialmente na Casa de Apostas).",
        nota:
          "O Comparativo de Jogo na Overview Spin exibe os dados de Blackjack (soma de todas as mesas), Roleta, Speed Baccarat e Futebol Brasileiro lado a lado. O Comparativo de Mesa permite analisar as mesas de Blackjack individualmente. Em Dados por Mesa, a Casa de Apostas também exibe Futebol Brasileiro abaixo de Baccarat e Roleta.",
        referencia: "Overview Spin",
      },
      {
        termo: "Visibilidade na Vitrine",
        definicao:
          "Percentual das mesas Spin Gaming que aparecem nas primeiras posições do lobby da plataforma parceira. Calculado com base no número de mesas ranqueadas dentro do top 20 em relação ao total de mesas ativas.",
        nota: "Atualizado ao longo do dia conforme os snapshots automáticos do lobby. Compara com o mesmo horário do dia anterior.",
        referencia: "Overview Spin · Posicionamento",
      },
      {
        termo: "Snapshot de Lobby",
        definicao:
          "Captura automática das posições de todos os jogos no lobby de uma plataforma parceira em um momento específico. Cada snapshot registra a posição absoluta de cada mesa Spin em relação aos concorrentes.",
        nota: "Os snapshots são executados em intervalos regulares ao longo do dia. A aba Posicionamento exibe o snapshot mais recente do dia como 'posição atual'.",
        referencia: "Overview Spin · Posicionamento",
      },
      {
        termo: "Heatmap de Posicionamento",
        definicao:
          "Tabela que exibe a posição histórica de cada mesa do lobby ao longo do tempo. As cores indicam a faixa de posição: verde para posições altas (P1–P3), azul para posições intermediárias e cinza para posições fora do top 10 ou sem dados.",
        referencia: "Overview Spin · Posicionamento",
      },
      {
        termo: "Concorrentes à Frente",
        definicao:
          "Quantidade de jogos de outras plataformas que aparecem com posição melhor (número menor) que a mesa Spin no lobby, por tipo de jogo. Valor zero indica que a mesa Spin é a primeira do tipo naquele lobby.",
        referencia: "Overview Spin · Posicionamento",
      },
    ],
  },
  {
    key: "midias_sociais",
    label: "Métricas de Mídias Sociais",
    accentColor: "#f59e0b",
    termos: [
      {
        termo: "Novos Seguidores",
        definicao:
          "Soma dos novos seguidores ou inscritos ganhos no período selecionado, agregando Instagram, Facebook e YouTube. O KPI na aba Alcance compara o valor ao mesmo recorte do mês anterior.",
        referencia: "Mídias Sociais → Alcance",
      },
      {
        termo: "Seguidores",
        definicao:
          "Métrica exibida nos cards por canal (Instagram, Facebook, YouTube) para o respectivo período — alinhada ao dado de novos seguidores/inscritos da integração.",
        referencia: "Mídias Sociais → Alcance",
      },
      {
        termo: "Impressões",
        definicao:
          "Número total de vezes que qualquer conteúdo publicado foi exibido para alguém, incluindo múltiplas exibições para o mesmo usuário.",
        referencia: "Mídias Sociais",
      },
      {
        termo: "Engajamento médio",
        definicao:
          "KPI agregado na aba Alcance que resume a intensidade de interação em relação às impressões do período selecionado.",
        nota:
          "Em geral segue a lógica Engajamentos ÷ Impressões. Quando as impressões são zero (por exemplo, YouTube sem dado de impressões na API), o valor pode aparecer como '—'.",
        referencia: "Mídias Sociais → Alcance",
      },
      {
        termo: "Alcance",
        definicao:
          "Número de contas únicas que viram ao menos um conteúdo no período. Diferente de Impressões — o Alcance conta pessoas, as Impressões contam exibições.",
        referencia: "Mídias Sociais",
      },
      {
        termo: "Engajamentos",
        definicao:
          "Total de interações com o conteúdo: curtidas, comentários, compartilhamentos e salvamentos.",
        referencia: "Mídias Sociais",
      },
      {
        termo: "Cliques no Link",
        definicao:
          "Número de cliques em links publicados nos posts. Disponível principalmente no Facebook. Conecta conteúdo de social media ao funil de conversão.",
        referencia: "Mídias Sociais",
      },
      {
        termo: "UTM (Urchin Tracking Module)",
        definicao:
          "Parâmetro de rastreamento de URL (Urchin Tracking Module) usado para identificar a origem do tráfego de uma campanha ou influencer.",
        nota:
          "No contexto da plataforma, UTMs são mapeadas na Gestão de Links e vinculadas a campanhas. Apenas tráfego com UTMs mapeadas aparece nos dashboards de Mídias Sociais e Streamers.",
        referencia: "Mídias Sociais · Streamers",
      },
    ],
  },
  {
    key: "afiliados",
    label: "Afiliados",
    accentColor: "#1e36f8",
    termos: [
      {
        termo: "Afiliado",
        definicao:
          "Parceiro comercial que atua em canais de aquisição e tráfego. Diferente dos influencers (criadores de conteúdo), afiliados são empresas ou profissionais que promovem as operadoras por meio de estratégias digitais como retargeting, SEO, redes de tráfego e programas de afiliação.",
        nota: "Gerenciados na seção Afiliados. Têm acesso à plataforma com perfil e dados financeiros obrigatórios.",
        referencia: "Afiliados · Network",
      },
      {
        termo: "Network (Afiliados)",
        definicao:
          "Funil de prospecção de novos afiliados. Registra candidatos em Visualizado, Contato, Negociação ou Fechado.",
        nota:
          "Ao salvar um registro sem usuário na plataforma, e-mail e operadora são obrigatórios e o sistema cria o acesso de afiliado — não é necessário estar em Fechado. Registros Fechados ficam ocultos na lista padrão; use o card Fechado no funil para filtrá-los.",
        referencia: "Network",
      },
      {
        termo: "Operação",
        definicao:
          "Campo de texto livre no perfil do afiliado que descreve o modelo de trabalho, os canais utilizados e as estratégias de aquisição do parceiro.",
        referencia: "Afiliados · Network",
      },
    ],
  },
  {
    key: "financeiro_operacional",
    label: "Financeiro Operacional",
    accentColor: "#22c55e",
    termos: [
      {
        termo: "Ciclo de Pagamento",
        definicao:
          "Período semanal de quinta-feira a quarta-feira que agrupa as lives realizadas e define a janela de cálculo de cachê dos influencers. Cada ciclo gera um conjunto de pagamentos ao ser encerrado.",
        nota: "Ciclos em aberto (semana atual) exibem prévia em tempo real. Pagamentos definitivos são gerados apenas ao fechar o ciclo.",
        referencia: "Financeiro",
      },
      {
        termo: "Cachê/hora",
        definicao:
          "Valor em reais pago ao influencer por hora de live realizada. Cadastrado no perfil do influencer e usado como base para calcular o total de cada ciclo.",
        formula: "Total do ciclo = Horas realizadas × Cachê/hora",
        referencia: "Financeiro",
      },
      {
        termo: "Prévia",
        definicao:
          "Estimativa de pagamento calculada em tempo real durante o ciclo em aberto, com base nas lives já realizadas e no cachê cadastrado. Não é um valor definitivo — pode mudar até o fechamento do ciclo.",
        referencia: "Financeiro",
      },
      {
        termo: "Banca de Jogo",
        definicao:
          "Valor disponibilizado ao influencer pela operadora para uso durante a live. Funciona como capital de giro para demonstrações de jogo — deve ser mantido na conta do influencer apenas durante a ação e ser reposto ou devolvido ao final.",
        nota: "Diferente do cachê: a banca não é remuneração — é um recurso operacional temporário.",
        referencia: "Banca de Jogo",
      },
      {
        termo: "Status da Conta (Banca)",
        definicao:
          "Indica se a conta do influencer na operadora está Liberada (disponível para operação) ou Bloqueada (restrita para evitar saques durante ações). Gerenciado manualmente pela equipe de gestão.",
        referencia: "Banca de Jogo",
      },
      {
        termo: "Pagamento de Agente",
        definicao:
          "Linha especial de pagamento para agências ou terceiros que prestam serviços vinculados a um ciclo. Segue o mesmo fluxo de análise e pagamento dos influencers, mas não está associado a horas de live.",
        nota: "Visível apenas para perfis de operação interna.",
        referencia: "Financeiro",
      },
    ],
  },
  {
    key: "estudio",
    label: "Estúdio",
    accentColor: "#a78bfa",
    termos: [
      {
        termo: "Dealer",
        definicao:
          "Profissional de casino ao vivo no elenco Spin: nome artístico, especialidades por jogo (Blackjack, Roleta, Baccarat, Futebol Brasileiro), turno, gênero, fotos e operadora vinculada.",
        nota:
          "O perfil é mantido via prestador em Gestão de Prestadores (Game Presenter). Gestão de Dealers exibe o catálogo e solicitações — não cadastra dealer na página.",
        referencia: "Gestão de Dealers · Gestão de Prestadores",
      },
      {
        termo: "Bloco de Roteiro",
        definicao:
          "Segmento fixo do Roteiro de Mesa — Abertura, Durante o jogo ou Fechamento — onde ficam scripts, orientações e alertas aplicáveis àquela fase da live.",
        referencia: "Roteiro de Mesa",
      },
      {
        termo: "Script",
        definicao:
          "Tipo de sugestão de roteiro com texto falado ou roteirizado para o dealer seguir na mesa. Identificado visualmente no card do bloco.",
        referencia: "Roteiro de Mesa",
      },
      {
        termo: "Orientação",
        definicao:
          "Tipo de sugestão com instruções de conduta ou foco para o dealer durante a sessão, sem necessariamente ser texto literal a ser lido.",
        referencia: "Roteiro de Mesa",
      },
      {
        termo: "Alerta",
        definicao:
          "Tipo de sugestão de destaque ou aviso pontual no roteiro (compliance, promoção, mudança de regra) exibido no bloco correspondente.",
        referencia: "Roteiro de Mesa",
      },
      {
        termo: "Troca de Dealer",
        definicao:
          "Solicitação enviada pela operadora ao estúdio para substituir ou revisar o dealer de uma mesa. Fluxo tratado na Central de Notificações e iniciado na Gestão de Dealers.",
        referencia: "Gestão de Dealers · Central de Notificações",
      },
      {
        termo: "Peça de Figurino",
        definicao:
          "Item de vestuário ou acessório cadastrado no acervo da plataforma, identificado por um código único (ex: FIG-000003) e código de barras para rastreamento físico.",
        referencia: "Figurinos",
      },
      {
        termo: "Retirada (Figurino)",
        definicao:
          "Registro de saída de uma peça do estoque para uso por um prestador. Pode ser Emprestar (temporário, com previsão de devolução) ou Fixo (uso contínuo sem data definida).",
        referencia: "Figurinos",
      },
      {
        termo: "Condição da Peça",
        definicao:
          "Estado físico de uma peça de figurino. Valores possíveis: Boa (pronta para uso), Avariada (danos visíveis) e Limpeza (necessita lavagem).",
        referencia: "Figurinos",
      },
      {
        termo: "Etiqueta de Figurino",
        definicao:
          "PDF com código de barras e informações da peça gerado no cadastro ou nos detalhes. Serve para identificação física e bipagem com câmera ou leitor externo.",
        referencia: "Figurinos",
      },
    ],
  },
  {
    key: "marketing_digital",
    label: "Marketing Digital",
    accentColor: "#70cae4",
    termos: [
      {
        termo: "UTM Source",
        definicao:
          "Identificador único de rastreio adicionado a links de captação que indica a origem do tráfego. Na plataforma, cada UTM Source detectado nas operadoras pode ser associado a um influencer ou campanha para atribuição de FTDs e GGR.",
        nota: "Links detectados mas ainda não associados são chamados de 'links órfãos' ou 'pendentes'.",
        referencia: "Gestão de Links",
      },
      {
        termo: "Link Mapeado",
        definicao:
          "UTM Source que foi associado a um influencer ou campanha. Após o mapeamento, os dados históricos de FTDs, depósitos e GGR são sincronizados automaticamente nos dashboards de performance.",
        referencia: "Gestão de Links",
      },
      {
        termo: "Link Órfão / Pendente",
        definicao:
          "UTM Source detectado em uma operadora que ainda não possui associação com influencer ou campanha. Aparece na aba Pendentes da Gestão de Links aguardando mapeamento.",
        referencia: "Gestão de Links",
      },
      {
        termo: "Campanha",
        definicao:
          "Agrupamento de ações de marketing vinculado a uma ou mais operadoras. Campanhas são criadas na página Campanhas e podem ser usadas como destino no mapeamento de links na Gestão de Links.",
        nota: "Campanhas inativas não aparecem como opção ao mapear novos links, mas mantêm os vínculos existentes.",
        referencia: "Campanhas · Gestão de Links",
      },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    accentColor: "#4a2082",
    termos: [
      {
        termo: "Pipeline B2B",
        definicao:
          "Funil comercial de prospecção de operadoras e marcas de Live Cassino no mercado B2B brasileiro — da disponibilidade inicial até contrato fechado, com mesas Dedicada e Network.",
        referencia: "Pipeline B2B",
      },
      {
        termo: "Mesa Dedicada",
        definicao:
          "Produto de Live Cassino exclusivo para a marca/operadora, negociado no Pipeline B2B. Status de proposta aparece na coluna Dedicada.",
        referencia: "Pipeline B2B",
      },
      {
        termo: "Mesa Network",
        definicao:
          "Produto de Live Cassino em rede compartilhada entre operadoras, negociado no Pipeline B2B. Status de proposta aparece na coluna Network.",
        referencia: "Pipeline B2B",
      },
      {
        termo: "Licença compartilhada",
        definicao:
          "Situação em que mais de uma marca opera sob o mesmo CNPJ e portaria SPA/MF. No modal Ver, a aba Licença Compartilhada lista as demais marcas da mesma empresa.",
        referencia: "Pipeline B2B",
      },
    ],
  },
  {
    key: "rh_portal",
    label: "Portal de RH",
    accentColor: "#a78bfa",
    termos: [
      {
        termo: "RH Talk",
        definicao:
          "Reunião periódica conduzida pelo RH da Spin Gaming com grupos de colaboradores para alinhamento, comunicação de políticas e abertura de espaço para perguntas. Cada sessão gera uma ata numerada sequencialmente.",
        nota: "A ata fica disponível no Portal de RH apenas para participantes registrados da reunião.",
        referencia: "Portal de RH",
      },
      {
        termo: "Lido e Ciente",
        definicao:
          "Confirmação formal de que o colaborador leu e tomou conhecimento de um documento oficial no Portal de RH (política ou normativa), com registro de data e hora.",
        nota:
          "Diferente de apenas marcar um comunicado como Lido. O registro de Lido e Ciente implica responsabilidade sobre o conteúdo do documento. Para o gate de transmissão do influencer, ver o termo Playbook Influencers na categoria Operação de Lives.",
        referencia: "Portal de RH",
      },
      {
        termo: "Read Receipt",
        definicao:
          "Registro de leitura de um comunicado ou documento pelo usuário, com data e hora. Usado para rastrear quais colaboradores já visualizaram comunicados obrigatórios.",
        referencia: "Portal de RH",
      },
    ],
  },
  {
    key: "escala",
    label: "Escala e Operação",
    accentColor: "#f59e0b",
    termos: [
      {
        termo: "Gestão de Escala",
        definicao:
          "Planejamento da escala diária por área (time), colaborador e dia do mês — alocação de turnos e aprovação de grades operacionais.",
        referencia: "Gestão de Escala",
      },
      {
        termo: "Gestão de Staff",
        definicao:
          "Visão e gestão dos prestadores dos times de Game Floor e Operation Management vinculados à operação de mesa ao vivo. No topo, cards consolidados (somente time Game Presenter) indicam perfis com lacunas operacionais (Nickname, Turno ou ID Operacional), cadastrais (Gênero, Bio ou Fotos) ou de jogo (Live no Estúdio ou skills inativas).",
        referencia: "Gestão de Staff",
      },
      {
        termo: "Calendário (RH)",
        definicao:
          "Calendário operacional com turnos, trocas e compromissos — visibilidade da rotina de escala para gestores e colaboradores com permissão.",
        referencia: "Calendário",
      },
      {
        termo: "Marketplace",
        definicao:
          "Área de ofertas de venda e troca de turnos entre colaboradores — publicações abertas e as do próprio usuário.",
        referencia: "Marketplace",
      },
      {
        termo: "Solicitações (Escala)",
        definicao:
          "Fila de pedidos de escala em aberto e histórico arquivado, filtrável por período, time e colaborador.",
        referencia: "Solicitações",
      },
    ],
  },
  {
    key: "rh_prestadores",
    label: "RH — Prestadores e vagas",
    accentColor: "#22c55e",
    termos: [
      {
        termo: "Gestão de Prestadores",
        definicao:
          "Cadastro central de colaboradores (prestadores): head count, contratação, organograma, remuneração, ações de RH e anotações.",
        nota:
          "É a origem do vínculo para dealers (Game Presenter) exibidos em Gestão de Dealers e para listas de retirada em Figurinos.",
        referencia: "Gestão de Prestadores · Dados de Cadastro",
      },
      {
        termo: "Dados de Cadastro",
        definicao:
          "Autoatendimento e consulta cadastral do prestador: dados pessoais, documentos, formação, experiência profissional anterior e histórico de movimentações.",
        nota:
          "Revisão cadastral de 6 meses aplica-se ao próprio cadastro. Histórico de trabalho (vínculo Spin) é somente leitura nesta página.",
        referencia: "Dados de Cadastro",
      },
      {
        termo: "Organograma",
        definicao:
          "Estrutura de diretorias, gerências, setores e times da operação — modos Visualização e Gerenciamento para RH e gestores.",
        referencia: "Organograma",
      },
      {
        termo: "Vagas",
        definicao:
          "Processos seletivos internos: vagas abertas, candidaturas em andamento e gerenciamento de publicações.",
        referencia: "Vagas",
      },
      {
        termo: "Revisão cadastral",
        definicao:
          "Ciclo obrigatório de atualização ou confirmação dos dados do prestador a cada seis meses, exibido em Dados de Cadastro no próprio cadastro.",
        referencia: "Dados de Cadastro",
      },
    ],
  },
  {
    key: "denuncias",
    label: "Denúncias",
    accentColor: "#e84025",
    termos: [
      {
        termo: "Central de Denúncias",
        definicao:
          "Módulo interno (logado) para gestão de protocolos de denúncia: filtros por período, tipo e status, KPIs e atendimento pelos perfis autorizados.",
        referencia: "Central de Denúncias",
      },
      {
        termo: "Canal de Denúncias (público)",
        definicao:
          "Formulário em URL pública da Spin, fora do menu lateral — envio anônimo ou identificado sem login na plataforma. Não substitui a Central de Denúncias interna.",
        nota:
          "Quem já tem acesso logado deve usar a Central de Denúncias no menu RH para acompanhar protocolos internos.",
        referencia: "Canal público Spin (sem PageKey no menu)",
      },
    ],
  },
  {
    key: "permissoes_plataforma",
    label: "Permissões e acesso",
    accentColor: "#6b7280",
    termos: [
      {
        termo: "Permissão Ver / Criar / Editar / Excluir",
        definicao:
          "Matriz por perfil (role) e página configurada em Gestão de Usuários. Define o que cada papel pode fazer em cada rota do menu.",
        nota:
          "Valores: Sim (irrestrito na página), Próprios (só registros do escopo do usuário), Não (bloqueado) ou vazio quando a coluna não se aplica à página.",
        referencia: "Gestão de Usuários",
      },
      {
        termo: "Administrador",
        definicao:
          "Perfil com acesso irrestrito a todas as páginas — não depende da matriz de permissões.",
        referencia: "Gestão de Usuários",
      },
      {
        termo: "Menu por perfil operacional",
        definicao:
          "Abas Operadora, Gestores e Prestadores em Gestão de Usuários definem quais itens do menu lateral cada grupo vê. O acesso efetivo é o cruzamento com a matriz Permissões.",
        referencia: "Gestão de Usuários",
      },
    ],
  },
  {
    key: "home_perfis",
    label: "Home por perfil",
    accentColor: "#7c3aed",
    termos: [
      {
        termo: "Home Investidor / Executivo",
        definicao:
          "Painel pós-login com KPIs de mesas (MTD), aquisição, Spin na Rede e atalhos analíticos — sem a lista dinâmica completa do menu.",
        referencia: "Home",
      },
      {
        termo: "Home Operador",
        definicao:
          "Painel da operadora com KPIs MTD, comparativo MoM, informativos do escopo e atalhos (ex.: Overview Spin, Ajuda). Layout pode variar por template da operadora.",
        referencia: "Home · Gestão de Operadoras",
      },
      {
        termo: "Informativos na Home",
        definicao:
          "Comunicados publicados em Informativos filtrados por perfil (e operadora, quando o alvo é Operador) e exibidos no bloco de avisos da Home.",
        referencia: "Informativos · Home",
      },
    ],
  },
  {
    key: "whitelabel",
    label: "Identidade operadora",
    accentColor: "#1e36f8",
    termos: [
      {
        termo: "Brandguide / Whitelabel",
        definicao:
          "Conjunto de cores, logo e fonte da operadora aplicados na interface quando o usuário tem perfil operador e operadora ativa — substitui a paleta Spin padrão.",
        nota:
          "Configurado na aba Brandguide em Gestão de Operadoras. Dashboards analíticos usam tokens --brand-action e --brand-contrast; identidade por jogo (Baccarat, Roleta, etc.) permanece fixa Spin.",
        referencia: "Gestão de Operadoras",
      },
      {
        termo: "Operadora ativa",
        definicao:
          "Parceira com status ativo e ao menos uma mesa cadastrada. Só operadoras ativas aparecem no filtro **Todas Operadoras** das listagens.",
        referencia: "Gestão de Operadoras · Gestão de Mesas",
      },
    ],
  },
  {
    key: "periodos",
    label: "Conceitos de Período",
    accentColor: "#6b7280",
    termos: [
      {
        termo: "Histórico",
        definicao:
          'Visão acumulada de todos os dados disponíveis desde o início da operação. Ao ativar "Histórico", o período expande para todo o intervalo disponível e o comparativo MoM é desabilitado.',
        referencia: "Todos os dashboards",
      },
      {
        termo: "MoM (Month over Month)",
        definicao:
          "Comparativo entre o período atual e o mesmo intervalo do mês anterior.",
        nota:
          "Ex: se hoje é dia 18 de abril, o MoM compara 1–18 de abril contra 1–18 de março — \"o que aconteceu até agora neste mês\" vs. \"o que tinha acontecido no mesmo ponto do mês passado\".",
        referencia: "Todos os dashboards",
      },
      {
        termo: "MTD (Month To Date)",
        definicao:
          "Acumulado do mês corrente desde o dia 1 até a data atual. Quando o período selecionado é o mês em curso, todos os KPIs mostram o valor MTD.",
        nota:
          "Os dados analíticos são fechados com defasagem de um dia (D-1). No dia 1 de cada mês, o carrossel abre no mês anterior por padrão — ainda não há dados fechados do mês corrente.",
        referencia: "Todos os dashboards",
      },
    ],
  },
];
