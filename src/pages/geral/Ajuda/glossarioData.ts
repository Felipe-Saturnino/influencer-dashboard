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
        referencia: "Agenda · Feedback",
      },
      {
        termo: "Horas Realizadas",
        definicao:
          "Soma total de horas de transmissão ao vivo no período. Calculado a partir da duração individual de cada live. Exibido no formato HH:MM.",
        referencia: "Overview · Feedback",
      },
      {
        termo: "Validação de Live",
        definicao:
          "Processo de confirmar o resultado de uma live agendada — registrando se ela foi Realizada ou Não Realizada, e quando realizada, os dados de duração e audiência. A validação é feita na página Resultado de Lives.",
        nota:
          "Somente lives com horário passado há mais de 5 horas aparecem para validação — a janela garante que a live terminou antes do registro.\n\nA operadora deve ser informada obrigatoriamente na validação, pois é o vínculo usado pelo módulo Financeiro para calcular os pagamentos do ciclo correspondente.",
        referencia: "Resultados",
      },
      {
        termo: "Influencers Ativos",
        definicao:
          "Número de influencers que realizaram ao menos uma live no período. Influencers cadastrados sem live no período não são contabilizados.",
        referencia: "Overview",
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
          "Diferente do Máx Views (pico): a Média representa a audiência sustentada ao longo da transmissão, enquanto o Máx representa o momento de maior audiência.\n\nUm influencer com média alta e pico próximo da média manteve a audiência de forma consistente. Um influencer com pico muito acima da média teve um momento específico de destaque.",
        referencia: "Overview · Feedback · Overview Influencer",
      },
      {
        termo: "Máx Views (Pico de Views)",
        definicao:
          "Número máximo de espectadores simultâneos registrado em uma live. Representa o pico de audiência da transmissão, em contraste com a Média de Views, que suaviza as variações ao longo da live.",
        nota:
          "Picos altos com média baixa indicam que o influencer teve um momento de destaque durante a transmissão, mas a audiência não se manteve. Quando ambos são altos, a live sustentou a audiência do início ao fim.\n\nExibido na coluna 'Máx Views' da tabela Comparativo Diário / Mensal no Overview Influencer.",
        referencia: "Overview Influencer",
      },
      {
        termo: "MTD (Month To Date)",
        definicao:
          "Acumulado do mês corrente desde o dia 1 até a data atual. O comparativo é feito contra o mesmo número de dias no mês anterior.",
        nota: "Ex: se hoje é dia 15, compara 1–15 do mês atual contra 1–15 do mês anterior.",
        referencia: "Todos os dashboards",
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
        referencia: "Conversão · Overview",
      },
      {
        termo: "Acessos",
        definicao:
          "Número de visitas ao link de afiliado do influencer no período. Representa o tráfego gerado pelas lives e conteúdos publicados.",
        referencia: "Conversão",
      },
      {
        termo: "Registros",
        definicao:
          "Número de novos cadastros realizados via link do influencer. Um acesso que resulta em cadastro completo conta como 1 registro.",
        referencia: "Conversão · Overview",
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
        referencia: "Conversão",
      },
      {
        termo: "Taxa Acesso → Registro",
        definicao:
          "Percentual de acessos que resultaram em cadastro. Taxa baixa indica problema na conversão da landing page ou no perfil do público.",
        formula: "Registros ÷ Acessos × 100",
        referencia: "Conversão",
      },
      {
        termo: "Taxa Registro → FTD",
        definicao:
          "Percentual de cadastros que realizaram o primeiro depósito. Taxa baixa indica que os jogadores captados não estão ativando a conta.",
        formula: "FTDs ÷ Registros × 100",
        referencia: "Conversão",
      },
      {
        termo: "Taxa View → FTD",
        definicao:
          "Percentual de views que se converteram em primeiro depósito. Taxa geral de eficiência do funil completo.",
        formula: "FTDs ÷ Views × 100",
        referencia: "Conversão",
      },
      {
        termo: "Taxa Acesso → FTD",
        definicao:
          "Percentual de acessos ao link que resultaram em primeiro depósito, pulando a etapa de registro.",
        formula: "FTDs ÷ Acessos × 100",
        nota: "Útil para avaliar eficiência de campanhas onde o usuário já tinha cadastro.",
        referencia: "Conversão",
      },
      {
        termo: "FTD/Hora",
        definicao:
          "FTDs gerados por hora de live transmitida. Indica a eficiência horária do influencer independentemente do tempo total transmitido — dois influencers com o mesmo número de FTDs mas durações diferentes de live têm eficiências distintas.",
        formula: "FTDs ÷ Horas Realizadas",
        nota:
          "Influencers sem horas registradas são excluídos do Ranking FTD/Hora na aba Conversão. O ranking exibe os três primeiros em pódio e os demais em lista paginada.",
        referencia: "Streamers → Conversão",
      },
      {
        termo: "Ação de Conversão",
        definicao:
          "Classificação automática da etapa crítica do funil de cada influencer no período. Indica onde está o maior gargalo e qual ação priorizar.",
        nota:
          "Divulgar o link: taxa View→Acesso abaixo de 10% — o influencer precisa mencionar o link com mais frequência durante as lives.\n\nConverter visita: taxa Acesso→Registro abaixo de 10% — os usuários chegam ao link mas não completam o cadastro.\n\nAtivar cadastro: taxa Registro→FTD abaixo de 60% — os cadastros existem mas os jogadores não estão realizando o primeiro depósito.\n\nEm dia: todas as taxas dentro dos limites — nenhuma ação prioritária identificada.",
        referencia: "Streamers → Conversão",
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
        referencia: "Overview · Financeiro",
      },
      {
        termo: "R$ FTD (Valor Total de FTDs)",
        definicao:
          "Soma dos valores dos primeiros depósitos no período. Mede o volume financeiro de entrada dos jogadores novos captados.",
        referencia: "Financeiro",
      },
      {
        termo: "Ticket Médio FTD",
        definicao:
          "Valor médio do primeiro depósito. Indica o perfil de investimento inicial dos jogadores captados.",
        formula: "R$ FTD ÷ Quantidade de FTDs",
        referencia: "Financeiro",
      },
      {
        termo: "Depósitos (Volume)",
        definicao:
          "Soma de todos os depósitos realizados pelos jogadores captados no período, incluindo depósitos subsequentes ao primeiro.",
        referencia: "Financeiro",
      },
      {
        termo: "Ticket Médio Depósito",
        definicao:
          "Valor médio por depósito. Um ticket médio alto indica jogadores de maior valor.",
        formula: "Total Depósitos ÷ Quantidade de Depósitos",
        referencia: "Financeiro",
      },
      {
        termo: "Saques (Volume)",
        definicao:
          "Soma de todos os saques realizados pelos jogadores captados no período. Um volume alto de saques reduz o GGR.",
        referencia: "Financeiro",
      },
      {
        termo: "Ticket Médio Saque",
        definicao: "Valor médio por saque.",
        formula: "Total Saques ÷ Quantidade de Saques",
        referencia: "Financeiro",
      },
      {
        termo: "WD Ratio (Withdrawal/Deposit Ratio)",
        definicao:
          "Relação entre saques e depósitos. Indica o percentual do volume depositado que foi sacado. Quanto menor, melhor para a casa.",
        formula: "Saques ÷ Depósitos × 100",
        nota:
          "Abaixo de 60%: saudável · 60% a 80%: atenção · Acima de 80%: risco — jogadores retirando mais do que a média",
        referencia: "Financeiro",
      },
      {
        termo: "GGR por Jogador",
        definicao:
          "Receita bruta média gerada por jogador captado. Indica o valor médio de cada jogador trazido pelo influencer.",
        formula: "GGR ÷ FTDs",
        referencia: "Financeiro",
      },
      {
        termo: "Investimento",
        definicao:
          "Valor total pago ao influencer no período (cachê por hora de live + bônus por performance, quando aplicável). Base para cálculo de ROI e custos unitários.",
        referencia: "Overview · Financeiro · Financeiro (Operações)",
      },
      {
        termo: "ROI (Return on Investment)",
        definicao: "Retorno sobre o investimento no influencer.",
        formula: "(GGR − Investimento) ÷ Investimento × 100",
        nota:
          "Rentável: ROI > 0% · Atenção: ROI entre −20% e 0% · Não Rentável: ROI < −20% · Bônus: sem investimento registrado mas com GGR positivo",
        referencia: "Overview",
      },
      {
        termo: "Custo por FTD",
        definicao:
          "Quanto custa em investimento cada novo jogador que realizou o primeiro depósito. Métrica de eficiência de aquisição.",
        formula: "Investimento ÷ FTDs",
        referencia: "Overview",
      },
      {
        termo: "Custo por Registro",
        definicao:
          "Quanto custa em investimento cada cadastro realizado. Complementa o Custo por FTD para identificar onde o funil perde eficiência.",
        formula: "Investimento ÷ Registros",
        referencia: "Overview",
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
          "Score sintético de 0 a 100 que mede a qualidade média dos jogadores captados pelo influencer. Não é um percentual — é um índice de 0 a 100 pontos.",
        formula:
          "Ticket Médio Depósito (40%) + GGR por Jogador (40%) + WD Ratio invertido (20%)",
        referencia: "Financeiro",
      },
      {
        termo: "Perfil de Jogador",
        definicao:
          "Classificação automática do tipo de jogador captado pelo influencer, baseada no PVI.",
        nota:
          "Whales (PVI ≥ 80): alto valor, apostas elevadas, baixa retirada · Core (PVI ≥ 60): regulares com bom equilíbrio · Recreativos (PVI ≥ 15): casuais, comportamento de entretenimento · Caçadores de Bônus (PVI < 15): foco em promoções, alta taxa de saque",
        referencia: "Financeiro",
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
        termo: "Apostas (Quantidade)",
        definicao:
          "Número total de apostas realizadas nas mesas no período. Combinado com o Turnover, gera a Aposta Média.",
        referencia: "Overview Spin",
      },
      {
        termo: "Margem",
        definicao:
          "Percentual de retenção da casa sobre o volume apostado. Representa o 'edge' natural do jogo — quanto, em média, a casa retém de cada real apostado.",
        formula: "GGR ÷ Turnover × 100",
        nota:
          "Para jogos de mesa ao vivo, valores entre 3% e 10% são típicos. Acima de 10%: período excepcionalmente favorável para a casa. Abaixo de 0%: período negativo — saques superaram depósitos.\n\nA Margem varia por tipo de jogo. O Comparativo de Jogo na Overview Spin permite visualizar a margem individual de Blackjack, Roleta e Speed Baccarat.",
        referencia: "Overview Spin",
      },
      {
        termo: "Aposta Média (Bet Size)",
        definicao:
          "Valor médio por aposta. Indica o perfil de aposta dos jogadores ativos nas mesas — quanto cada apostador coloca, em média, por rodada.",
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
          "Os três tipos de mesa ao vivo operados pela Spin Gaming nas plataformas parceiras:\n\n— Blackjack: disponível em múltiplas mesas (Blackjack 1, Blackjack 2, Blackjack VIP), cada uma com limites e perfis de aposta distintos.\n— Roleta: mesa única por operadora.\n— Speed Baccarat: versão acelerada do Baccarat, com rodadas mais rápidas.",
        nota:
          "O Comparativo de Jogo na Overview Spin exibe os dados de Blackjack (soma de todas as mesas), Roleta e Speed Baccarat lado a lado. O Comparativo de Mesa permite analisar as mesas de Blackjack individualmente.",
        referencia: "Overview Spin",
      },
    ],
  },
  {
    key: "midias_sociais",
    label: "Métricas de Mídias Sociais",
    accentColor: "#f59e0b",
    termos: [
      {
        termo: "Seguidores",
        definicao:
          "Total de seguidores/inscritos no canal no último dia do período. É um snapshot do tamanho da audiência — não um acumulado.",
        referencia: "Mídias Sociais",
      },
      {
        termo: "Impressões",
        definicao:
          "Número total de vezes que qualquer conteúdo publicado foi exibido para alguém, incluindo múltiplas exibições para o mesmo usuário.",
        referencia: "Mídias Sociais",
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
        termo: "Taxa de Engajamento",
        definicao:
          "Percentual de impressões que geraram engajamento. Indica a relevância do conteúdo para quem o viu.",
        formula: "Engajamentos ÷ Impressões × 100",
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
          "Parâmetros adicionados às URLs de campanhas para rastrear a origem do tráfego. Permitem identificar qual campanha, canal e conteúdo gerou cada acesso, registro e FTD.",
        nota:
          "Na plataforma, cada UTM é vinculada a uma campanha específica na Gestão de Links.",
        referencia: "Links e Materiais · Gestão de Links",
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
        referencia: "Todos os dashboards",
      },
    ],
  },
];
