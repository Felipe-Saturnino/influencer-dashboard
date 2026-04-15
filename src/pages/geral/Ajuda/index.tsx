import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC, FONT, FONT_TITLE } from "../../../constants/theme";
import { AbaGlossario } from "./GlossarioPanel";
import type { PageKey } from "../../../types";
import { ClipboardList, HelpCircle } from "lucide-react";
import {
  GiTv,
  GiCalendar,
  GiConversation,
  GiPerson,
  GiBinoculars,
  GiCash,
  GiPokerHand,
  GiMicrophone,
  GiShare,
} from "react-icons/gi";

type Aba = "conheca" | "troubleshooting" | "glossario";

// ─── Menu estrutura ───────────────────────────────────────────────────────────
const MENU_AJUDA = [
  {
    section: "Dashboards",
    items: [
      { key: "streamers" as PageKey, label: "Streamers", Icon: GiTv },
      { key: "mesas_spin" as PageKey, label: "Overview Spin", Icon: GiPokerHand },
      { key: "dash_midias_sociais" as PageKey, label: "Mídias Sociais", Icon: GiShare },
      {
        key: "dash_overview_influencer" as PageKey,
        label: "Overview Influencer",
        Icon: GiMicrophone,
      },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda" as PageKey, label: "Agenda", Icon: GiCalendar },
      { key: "resultados" as PageKey, label: "Resultados", Icon: ClipboardList },
      { key: "feedback" as PageKey, label: "Feedback", Icon: GiConversation },
      { key: "influencers" as PageKey, label: "Influencers", Icon: GiPerson },
      { key: "scout" as PageKey, label: "Scout", Icon: GiBinoculars },
    ],
  },
  {
    section: "Operações",
    items: [{ key: "financeiro" as PageKey, label: "Financeiro", Icon: GiCash }],
  },
];

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        texto:
          "Central de análise do canal de influencers. Reúne três visões complementares em abas — Overview, Conversão e Financeiro — com filtros de período, influencer e operadora compartilhados: mudanças nos filtros aplicam-se à aba atual e permanecem ao navegar entre elas.\n\nEsta aba Financeiro é o dashboard de métricas de jogadores captados; o menu Operações → Financeiro trata de ciclos de pagamento aos influencers.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre meses ou ative Histórico para ver todo o período disponível de uma vez. No modo Histórico, o comparativo MoM é desabilitado em todos os blocos e nas três abas.\n\nO filtro de influencer aparece para perfis com acesso a múltiplos parceiros. Influencers visualizam os próprios dados sem esse filtro disponível.\n\nO filtro de operadora aparece quando o perfil tem acesso a mais de uma operadora, permitindo isolar os dados de uma parceira específica em todas as abas.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "Visão executiva consolidada, organizada em três grupos de KPIs:\n\n— Financeiro: GGR, Investimento e ROI — o resultado financeiro do canal.\n— Operação: Lives, Horas Realizadas, Influencers Ativos e Depósitos — a dimensão operacional das ativações.\n— Conversão: Registros, Custo por Registro, FTDs e Custo por FTD — eficiência do funil de aquisição.\n\nO Funil de Conversão abaixo dos KPIs exibe os quatro estágios (Views → Acessos → Registros → FTDs) com as taxas de passagem entre cada etapa.\n\nO Ranking de Influencers lista todos os parceiros com seus indicadores principais e o status de performance (Rentável, Atenção, Não Rentável, Bônus ou Sem dados). Use os badges de status no topo da tabela para filtrar por categoria, e clique nos cabeçalhos de coluna para ordenar por qualquer indicador.",
      },
      {
        subtitulo: "Aba Conversão",
        texto:
          "Análise detalhada do funil individual de cada influencer, com três blocos:\n\n— Comparativo de Funil: selecione dois influencers para comparar o funil lado a lado — volumes em cada etapa e as taxas-chave (View→FTD, Acesso→FTD, FTD por hora de live).\n\n— Ranking FTD/Hora: classifica os influencers pela eficiência de conversão por hora transmitida. Os três primeiros aparecem em pódio visual; os demais em lista paginada. Influencers sem horas de live registradas são omitidos automaticamente.\n\n— Comparativo de Taxas: tabela com as taxas de cada etapa do funil por influencer. A coluna Ação destaca o próximo passo recomendado com base na taxa mais crítica de cada parceiro — Divulgar o link, Converter visita, Ativar cadastro ou Em dia. Use os filtros de ação no topo para focar em influencers com o mesmo gargalo.",
      },
      {
        subtitulo: "Aba Financeiro",
        texto:
          "Análise do comportamento financeiro dos jogadores captados por cada influencer, com três blocos:\n\n— KPIs Financeiros: FTD (valor total e ticket médio nos subrótulos), Depósitos e Saques (volume em R$ e ticket médio), WD Ratio, GGR por Jogador e PVI (índice de 0 a 100 pontos — não é percentual). Todos com comparativo MoM quando disponível.\n\n— Investimento por Influencer: gráfico de pizza com a distribuição do investimento pago entre os parceiros no período. A fatia 'Outros' agrupa influencers fora do top 9 e, quando aplicável, pagamentos de agentes.\n\n— Ranking Financeiro: tabela detalhada por influencer com FTD, depósitos, saques, R$ GGR, GGR/Jogador, WD Ratio, PVI e Perfil de Jogador (Whales, Core, Recreativos ou Caçadores de Bônus).",
      },
      {
        subtitulo: "Perfis e Visibilidade",
        texto:
          "O escopo dos dados exibidos depende do perfil do usuário:\n\n— Gestor / Executivo Spin: vê todos os influencers e todas as operadoras. Filtros de influencer e operadora disponíveis.\n— Influencer: vê apenas os próprios resultados em todas as abas. O filtro de operadora aparece se tiver atuado em mais de uma.\n— Agência: vê os influencers sob sua estrutura. Filtros disponíveis dentro desse escopo.\n— Operador: vê todos os influencers que atuaram nas mesas da sua operadora. Filtro de influencer disponível dentro desse escopo.",
      },
    ],
  },
  mesas_spin: {
    titulo: "Overview Spin",
    blocos: [
      {
        texto:
          "Painel central de performance das mesas de jogo Spin Gaming nas operadoras parceiras. Reúne KPIs consolidados, detalhamento temporal, comparativo entre tipos de jogo e análise mesa a mesa — tudo em uma única página com navegação por mês ou visão histórica acumulada.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre meses ou ative Histórico para ver todo o período disponível de uma vez. No modo Histórico, o comparativo MoM é desabilitado e a tabela de detalhamento exibe uma linha por mês em vez de uma por dia.\n\nSe você tem acesso a múltiplas operadoras, o filtro de operadora aparece na barra de filtros e isola os dados daquela parceira em todos os blocos da página.",
      },
      {
        subtitulo: "KPIs Consolidados",
        texto:
          "Bloco de indicadores que resume a performance geral das mesas no período:\n\n— GGR: receita bruta das mesas (depósitos − saques de todos os canais)\n— Turnover: volume financeiro total apostado\n— Apostas: quantidade de apostas realizadas\n— Margem: percentual de retenção da casa sobre o turnover\n— Aposta Média: valor médio por aposta\n— UAP: jogadores únicos ativos no período\n— ARPU: receita média por jogador ativo\n\nNo mês corrente (MTD), todos os indicadores exibem a variação em relação ao mesmo intervalo do mês anterior. No modo Histórico, o comparativo é desabilitado.",
      },
      {
        subtitulo: "Detalhamento Diário / Detalhamento Mensal",
        texto:
          "Tabela com a evolução dos KPIs ao longo do tempo. No mês selecionado, exibe uma linha por dia. No modo Histórico, exibe uma linha por mês.\n\nQuando o filtro está em 'Todas as operadoras', cada linha pode ser expandida — clique na seta ao lado da data para ver o detalhamento por operadora naquele dia ou mês.\n\nUse o toggle Tabela / Gráfico para alternar entre a visualização em tabela e a evolução em gráfico.",
      },
      {
        subtitulo: "Comparativo de Jogo",
        texto:
          "Exibe os dados de Blackjack, Roleta e Speed Baccarat lado a lado para cada dia do mês selecionado. Só está disponível quando um mês específico está selecionado — não aparece no modo Histórico.\n\nCada coluna de KPI é dividida em Total (dado oficial consolidado do dia) e os três jogos individualmente, com o percentual de participação de cada jogo sobre o total. Use os botões de KPI no topo para escolher quais métricas exibir, e o toggle Tabela / Gráfico para comparar as séries temporais dos três jogos.",
      },
      {
        subtitulo: "Comparativo de Mesa e Dados por Mesa",
        texto:
          "Dois blocos disponíveis somente quando uma operadora específica está selecionada — não aparecem no modo 'Todas as operadoras'.\n\n— Comparativo de Mesa: selecione duas mesas de Blackjack (Blackjack 1, Blackjack 2 ou Blackjack VIP) para comparar os resultados dia a dia lado a lado.\n— Dados por Mesa: exibe os dados do Speed Baccarat e da Roleta em colunas separadas, com GGR, Turnover, Apostas, Margem e Aposta Média.",
      },
      {
        subtitulo: "Perfil Operador",
        texto:
          "Operadores visualizam os mesmos blocos e KPIs, com escopo restrito às mesas da sua operadora. O filtro de operadora não é exibido — os dados já correspondem ao acesso autorizado. O Comparativo de Mesa e os Dados por Mesa ficam disponíveis automaticamente, sem necessidade de selecionar uma operadora.",
      },
    ],
  },
  dash_midias_sociais: {
    titulo: "Mídias Sociais",
    blocos: [
      {
        texto:
          "Dashboard de acompanhamento do canal de mídias sociais — desempenho orgânico nas redes e conversão gerada por campanhas com UTMs mapeadas. Organizado em três abas: Overview, Conversão e Alcance. Use o seletor de período no topo para navegar entre meses ou ativar o histórico completo.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "Visão financeira do canal: o impacto das mídias sociais em receita e jogadores captados.\n\n— KPIs consolidados: GGR, Registros, GGR por Jogador, FTDs, Depósitos e Saques — todos com comparativo MoM quando disponível.\n— Detalhamento: evolução dia a dia (ou mês a mês no Histórico) com visitas, conversões, FTDs e GGR por período.\n— Comparativo de campanhas: performance de cada campanha com UTMs mapeadas — acessos, registros, FTDs e GGR por campanha.",
      },
      {
        subtitulo: "Aba Conversão",
        texto:
          "Análise detalhada do funil de aquisição por campanha.\n\n— Funil consolidado: visão geral de Visitas → Registros → FTDs com as taxas de passagem entre etapas.\n— Comparativo de funil: selecione duas campanhas para comparar o funil lado a lado, com taxas individuais.\n— Comparativo de taxas: tabela com as taxas Visita→Registro, Registro→FTD e Visita→FTD para cada campanha mapeada.",
      },
      {
        subtitulo: "Aba Alcance",
        texto:
          "Performance de conteúdo orgânico nas redes sociais.\n\n— KPIs de Mídias: Postagens, Seguidores totais, Impressões totais e Engajamento médio — com comparativo MoM.\n— Por canal: cards individuais para Instagram, Facebook e YouTube. Instagram destaca Alcance, Impressões e Engajamento; Facebook usa Reações e Cliques no lugar de Engajamento agregado; YouTube exibe Inscritos, Visualizações e Engajamento (Impressões podem aparecer como '—' quando a API não fornece o dado).\n— Engajamento por formato: distribuição do volume de posts por tipo de conteúdo (Reels, Vídeo, Carrossel, Foto, Short etc.).\n— Postagens recentes: carrossel com as publicações mais recentes do período, com preview, data, link e estatísticas de cada post.",
      },
      {
        subtitulo: "Campanhas e UTMs",
        texto:
          "Os dados de conversão (Visitas, Registros, FTDs e GGR) vêm de UTMs mapeadas na Gestão de Links e vinculadas a campanhas cadastradas em Campanhas. Sem esse mapeamento, a aba Overview e a aba Conversão ficam sem dados de funil — apenas os KPIs de mídias sociais da aba Alcance aparecem.",
      },
      {
        subtitulo: "Postagens Recentes",
        texto:
          "O carrossel exibe as publicações do período selecionado em ordem cronológica reversa. Use as setas para navegar entre os posts. Clique no título de uma publicação para abrir o post original na rede social.\n\nAs publicações são buscadas diretamente das APIs do Instagram, Facebook e YouTube — posts sem imagem exibem um ícone substituto com as iniciais do canal.",
      },
      {
        subtitulo: "Histórico e Comparativo MoM",
        texto:
          "No modo mês a mês, use as setas para navegar entre períodos. Ative Histórico para ver o acumulado desde o início dos dados (Janeiro/2026). No modo Histórico, os comparativos MoM são desabilitados e a tabela de detalhamento exibe uma linha por mês.",
      },
    ],
  },
  dash_overview_influencer: {
    titulo: "Overview Influencer",
    blocos: [
      {
        texto:
          "Painel executivo dos resultados gerados pelo influencer — GGR, investimento, funil de conversão, eficiência e evolução temporal. Projetado para que o próprio influencer ou sua agência acompanhe os indicadores do canal com o mesmo nível de detalhe usado pela equipe Spin.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre meses ou ative Histórico para ver o acumulado de todo o período. No modo Histórico, o comparativo MoM é desabilitado e a tabela de evolução exibe uma linha por mês em vez de uma por dia.\n\nO filtro de influencer aparece quando o perfil tem acesso a mais de um parceiro — por exemplo, uma agência que representa múltiplos influencers. Influencers visualizam os próprios dados sem esse filtro disponível.\n\nO filtro de operadora aparece quando o influencer atuou em mais de uma operadora no período, permitindo isolar os dados de uma específica.",
      },
      {
        subtitulo: "KPIs Executivos",
        texto:
          "Três grupos de indicadores consolidados do período:\n\n— Financeiro: GGR, Investimento recebido e ROI — o retorno gerado em relação ao valor pago.\n— Operação: Lives, Horas Realizadas e Média de Views por live.\n— Conversão: Registros gerados, FTDs (quantidade e valor total), Depósitos e Saques dos jogadores captados.\n\nNo mês corrente (MTD), todos os indicadores exibem a variação em relação ao mesmo intervalo do mês anterior. No modo Histórico, o comparativo MoM é desabilitado.",
      },
      {
        subtitulo: "Funil de Conversão",
        texto:
          "Exibe os quatro estágios da jornada do jogador captado pelo influencer — Views, Acessos ao link, Registros e FTDs — com as taxas de passagem entre cada etapa. Taxas baixas em qualquer etapa indicam onde o funil está perdendo eficiência.",
      },
      {
        subtitulo: "Eficiência",
        texto:
          "Cinco indicadores de qualidade e eficiência do canal:\n\n— FTD/Hora: quantos primeiros depósitos são gerados por hora de live transmitida.\n— Ticket Médio FTD: valor médio do primeiro depósito dos jogadores captados.\n— Ticket Médio Depósito: valor médio de todos os depósitos (incluindo os subsequentes ao primeiro).\n— Ticket Médio Saque: valor médio por saque realizado.\n— GGR por Jogador: receita bruta média gerada por jogador captado.",
      },
      {
        subtitulo: "Detalhamento Diário / Detalhamento Mensal",
        texto:
          "Tabela com a evolução detalhada dos indicadores no tempo — dia a dia no mês selecionado, ou mês a mês no modo Histórico. A linha de Total ao final da tabela consolida todos os valores do período.\n\nColunas: Data · Duração Live · Média Views · Máx Views · Acessos · Registros · # FTDs · R$ FTDs · # Depósitos · R$ Depósitos · # Saques · R$ Saques · R$ GGR.\n\nUse o toggle Tabela / Gráfico para alternar entre a visualização em tabela e a evolução em gráfico. No modo gráfico, selecione o KPI que deseja visualizar nos botões acima do gráfico.\n\nNota: no mês corrente, os dados do dia de hoje não são exibidos — o detalhamento vai até o dia anterior para garantir que apenas dados completos sejam considerados.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda de Lives",
    blocos: [
      {
        texto:
          "Calendário central de todas as lives da operação. Permite visualizar, agendar e acompanhar ativações — passadas, presentes e futuras — de todos os influencers, plataformas e operadoras. O acesso e as ações disponíveis variam conforme o perfil do usuário.",
      },
      {
        subtitulo: "Modos de Visualização",
        texto:
          "A agenda oferece três modos, selecionáveis no seletor de período:\n\n— Mês: grid completo do calendário. As células variam de cor conforme o estado do dia — azul para hoje, verde para dias futuros e vermelho para dias passados. Cada célula exibe até 8 lives; quando há mais, um link '+N mais' abre a visualização Dia automaticamente.\n— Semana: sete colunas com as lives de cada dia. O número do dia aparece em destaque com a mesma codificação de cores do modo Mês.\n— Dia: lista detalhada de todas as lives do dia selecionado, com logo da plataforma, nome do influencer, badges de plataforma e status, horário e link clicável abaixo de cada item.",
      },
      {
        subtitulo: "Navegação e Filtros",
        texto:
          "Use as setas para avançar ou recuar no período, ou clique em Hoje para voltar à data atual.\n\nOs filtros de Status (Agendada, Realizada, Não Realizada) e Plataforma ficam numa segunda linha abaixo da navegação de período. Para perfis com acesso a múltiplos influencers, o seletor de Influencers aparece na linha principal. Para perfis com acesso a múltiplas operadoras, o seletor de Operadora também aparece na linha principal.\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo.",
      },
      {
        subtitulo: "Criando uma Nova Live",
        texto:
          "Clique em Nova Live para abrir o formulário. Preencha:\n\n— Influencer: selecione o parceiro responsável (disponível para gestores, executivos e operadores)\n— Data e Horário: quando a live está programada\n— Plataforma: botões visuais com logo — Twitch, YouTube, Kick, Instagram, TikTok, Discord, WhatsApp ou Telegram\n— Link: obrigatório para salvar. É pré-preenchido automaticamente com o link cadastrado no perfil do influencer para a plataforma selecionada, e atualiza automaticamente ao trocar de plataforma. Se o perfil não tiver o link da plataforma selecionada, o campo fica em branco e deve ser preenchido manualmente.",
      },
      {
        subtitulo: "Restrições de Data e Permissão",
        texto:
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — o agendamento para o mesmo dia não é permitido. Apenas Admin e Gestor podem criar ou editar lives em datas e horários passados.\n\nLives com status Realizada ou Não Realizada são bloqueadas para edição por influencers, agências e operadores — o modal abre em modo somente leitura para esses perfis. Apenas Admin e Gestor podem editar ou corrigir lives já validadas.",
      },
      {
        subtitulo: "Bloqueio de Agendamento",
        texto:
          "Ao clicar em Nova Live, o sistema verifica automaticamente os pré-requisitos do influencer. Se algum estiver pendente, um modal de bloqueio é exibido com os itens faltantes e botões de ação direta:\n\n— Perfil incompleto: dados obrigatórios do cadastro em Influencers não foram preenchidos. O botão 'Ir para Influencers' leva diretamente à página para completar o cadastro.\n— Playbook pendente: o influencer ainda não registrou ciência nos termos obrigatórios. O botão 'Ir para Playbook Influencers' leva aos termos.\n\nEnquanto o sistema verifica, o botão Nova Live exibe 'Verificando...' com um spinner. O modal só aparece se algum pré-requisito estiver pendente.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Influencer / Agência: visualiza e agenda apenas as próprias lives ou as dos influencers sob sua gestão.\n— Operador: visualiza todas as lives dos influencers que atuam na sua operadora.\n— Gestor / Executivo / Admin: visão completa de todas as lives de todos os influencers e operadoras.",
      },
    ],
  },
  resultados: {
    titulo: "Resultado de Lives",
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
          "O botão Excluir aparece para perfis com permissão de exclusão. Para evitar exclusões acidentais, é necessário clicar duas vezes — o primeiro clique transforma o botão em 'Confirmar?', e o segundo executa a exclusão. Clicar fora do botão cancela a operação.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback de Lives",
    blocos: [
      {
        texto:
          "Histórico completo das lives validadas na operação — realizadas e não realizadas. É onde o resultado final de cada ativação fica registrado após a validação em Resultados. O Financeiro consome operadora, período e influencer das lives realizadas para o cálculo de pagamentos do ciclo correspondente.",
      },
      {
        subtitulo: "Navegação e Período",
        texto:
          "Use as setas para navegar entre semanas ou ative Histórico para ver todo o período disponível de uma vez. No modo Histórico, as setas ficam desabilitadas e todos os dados acumulados são exibidos.\n\nOs filtros de Influencer e Operadora aparecem na mesma linha da navegação, para perfis com acesso a múltiplos escopos.",
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
          "Cada live é exibida em um card com borda lateral colorida — verde para realizadas, vermelho para não realizadas. O card mostra data, horário, nome do influencer e badge de plataforma.\n\nLives realizadas exibem três blocos de resultado abaixo: Duração, Média Views e Pico Views.\n\nQuando uma observação foi registrada na validação, ela aparece em um bloco destacado abaixo dos dados principais. Se não há observação, o bloco não aparece.\n\nUm contador acima da lista informa quantas lives foram encontradas com os filtros ativos.",
      },
      {
        subtitulo: "Editando uma Live",
        texto:
          "O botão Editar aparece para perfis com permissão de edição. O formulário permite ajustar o status, a operadora, a observação e os dados de resultado (duração, média e pico de views). A operadora é obrigatória para lives realizadas — é o dado usado pelo Financeiro para calcular os pagamentos do ciclo correspondente.",
      },
      {
        subtitulo: "Excluindo uma Live",
        texto:
          "O botão Excluir aparece para perfis com permissão de exclusão. Para evitar exclusões acidentais, é necessário clicar duas vezes — o primeiro clique transforma o botão em 'Confirmar?', e o segundo executa a exclusão. Clicar fora do botão cancela a operação.",
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
          "Cadastro central dos parceiros da operação. Reúne todos os dados necessários para ativar, acompanhar e pagar cada influencer — e serve de base para os módulos de Agenda, Resultados, Feedback e Financeiro.\n\nPara gestores e administradores, o subtítulo da página é 'Gerencie o cadastro completo dos influencers parceiros.' Para o próprio influencer logado, a página exibe apenas o próprio perfil com a mensagem 'Seu perfil completo na plataforma.'",
      },
      {
        subtitulo: "Quadros de Resumo",
        texto:
          "Dois cards no topo, visíveis para gestores, executivos e operadores:\n\n— Total de Influencers: quantidade total com breakdown por status (Ativo, Inativo, Cancelado). As contagens por plataforma aparecem nos chips de filtro Plataforma abaixo.\n— Perfil Incompleto: contador vermelho com os nomes dos influencers ativos com dados obrigatórios pendentes. Cada nome é um link clicável que abre diretamente o formulário de edição daquele influencer. Quando todos os perfis ativos estão completos, o card exibe 'Todos os perfis ativos estão completos!' em verde.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "O bloco de filtros inclui:\n\n— Status: chips Ativo, Inativo, Cancelado\n— Operadora: seletor disponível para perfis com acesso a múltiplas operadoras\n— Plataforma: chips para cada plataforma cadastrada\n— Cachê por Hora: slider de range de R$0 até o maior cachê cadastrado na base\n— Busca: campo de texto por nome artístico ou e-mail\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo.",
      },
      {
        subtitulo: "Card de Influencer",
        texto:
          "Cada card exibe: avatar com a inicial em gradiente de marca, nome artístico, badge de status, cachê por hora, canais ativos com links clicáveis (identificados com ↗) e tags das operadoras vinculadas.\n\nO badge de status é um dropdown interativo — Admin e Gestor podem alterar o status diretamente no card sem abrir o modal. Para outros perfis, o badge é somente leitura.\n\nO badge 'Perfil incompleto' aparece em influencers ativos com dados obrigatórios faltando. As tags de operadoras não são exibidas para o perfil Operador.",
      },
      {
        subtitulo: "Visualizando um Perfil (Ver)",
        texto:
          "O modal de visualização abre com um banner 'Modo visualização — somente leitura. Dados sensíveis protegidos.' e tem cinco abas:\n\n— Cadastral: nome completo, nome artístico, e-mail, telefone e CPF (com desfoque)\n— Canais: plataformas ativas com link clicável para abrir em nova aba\n— Financeiro: cachê por hora, Chave PIX, Banco, Agência e Conta (todos com desfoque)\n— Operadoras: status do vínculo (Ativo/Inativo) e ID em cada operadora\n— Histórico: data de criação do cadastro, data da última atualização e data da última alteração de status\n\nDados sensíveis (CPF, Chave PIX e dados bancários) ficam com desfoque e exigem clique no ícone de olho para revelar — ocultam-se automaticamente após 10 segundos.",
      },
      {
        subtitulo: "Editando um Perfil (Editar)",
        texto:
          "O formulário de edição tem quatro abas — Cadastral, Canais, Financeiro e Operadoras — sem a aba Histórico. Salvar Perfil confirma todas as alterações de todas as abas de uma vez.\n\nO campo Cachê por Hora e o badge de Status são restritos a Admin e Gestor — para outros perfis, esses campos aparecem bloqueados. No modo de edição, CPF e dados bancários ficam visíveis para facilitar o preenchimento.\n\nNa aba Canais, cada plataforma ativa exige que o link correspondente esteja preenchido. Na aba Operadoras, cada operadora marcada como ativa exige o ID do influencer naquela operadora.",
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
          "Os quatro cards no topo mostram a distribuição dos prospectos por etapa:\n\n— Visualizado: primeiro contato identificado, informações básicas coletadas\n— Contato: negociação em andamento, dados de contato registrados\n— Negociação: proposta enviada, cachê em discussão\n— Fechado: parceria confirmada — o prospecto vira influencer ativo na plataforma\n\nAbaixo do funil, a grade de Cobertura de Plataformas mostra quantos prospectos estão cadastrados em cada plataforma. Clique em uma plataforma para filtrar a lista; clique de novo para remover o filtro.\n\nAtenção: na vista padrão, prospectos com status Fechado não aparecem na lista. Para visualizá-los, selecione explicitamente o filtro 'Fechado' nos chips de Status.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Combine os filtros para localizar prospectos:\n\n— Status: chips Visualizado, Contato, Negociação, Fechado\n— Cachê por Hora — até: slider de range até o maior cachê cadastrado\n— Views — até: slider de range até o maior volume de views cadastrado\n— Busca: por nome artístico ou e-mail\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo.",
      },
      {
        subtitulo: "Card de Prospecto",
        texto:
          "Cada card exibe nome artístico, StatusBadge com dropdown para alterar a etapa do funil, plataformas com métricas inline e badges de informações adicionais.\n\nAs métricas variam por plataforma: YouTube, Twitch, Kick e TikTok mostram Média de Views; Instagram, Discord, WhatsApp e Telegram mostram Seguidores.\n\nBadges adicionais aparecem quando informados: tag da operadora vinculada, valor do cachê negociado e 'Live Cassino' quando o prospecto já realiza ou tem histórico de lives de cassino.",
      },
      {
        subtitulo: "Cadastrando e Editando um Prospecto",
        texto:
          "Clique em + Adicionar para registrar um novo prospecto. O formulário tem Nome Artístico e Status no topo, mais três abas:\n\n— Contato: Tipo de Contato (Agente, Plataforma ou Direto), Nome do Agente (quando tipo for Agente), Telefone, Cachê Negociado, Live Cassino (Sim/Não), E-mail e Operadora\n— Canais: toggle de plataformas ativas. Cada plataforma ativa exige link e métrica correspondente (Views ou Seguidores conforme a plataforma). Abaixo, seleção de Categorias em multi-seleção: Vida Real, Jogos Populares, Variedades, Esportes, Cassino\n— Anotações: campo para nova anotação com botão 'Adicionar Anotação' e histórico de todas as anotações anteriores com usuário e data de registro",
      },
      {
        subtitulo: "Fechando uma Parceria",
        texto:
          "Ao marcar um prospecto como Fechado, a plataforma cria automaticamente o usuário do influencer com as informações cadastradas. Para que o fechamento seja concluído, os seguintes campos são obrigatórios:\n\n— Nome artístico e e-mail\n— Cachê negociado maior que zero\n— Operadora (aba Contato)\n— Pelo menos uma plataforma com link e métrica preenchidos — views ou seguidores, conforme a plataforma (aba Canais)\n\nDurante o processo, o botão exibe 'Criando usuário...' com um spinner. Não feche o modal até que a confirmação apareça. A operadora selecionada é gravada automaticamente no perfil do influencer criado e no escopo de acesso na Gestão de Usuários.",
      },
      {
        subtitulo: "Anotações",
        texto:
          "A aba Anotações permite registrar observações sobre o prospecto ao longo de todo o processo de prospecção. Cada anotação registra o usuário que a criou e a data e hora do registro. As anotações são visíveis tanto no modal de edição quanto no modal de visualização (somente leitura).",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        texto:
          "Central de gestão de pagamentos dos influencers parceiros. Acompanhe ciclos semanais, aprove valores, registre pagamentos e consulte o histórico financeiro de cada parceiro.",
      },
      {
        subtitulo: "KPIs",
        texto:
          "Três indicadores consolidados no topo, com filtro próprio de período (Total ou por mês):\n\n— Total Pago: volume financeiro já realizado para influencers e agentes.\n— Pendente: valor ainda em aberto, em análise ou aguardando pagamento.\n— Total de Horas Realizadas: volume de horas que gerou base de cálculo para os pagamentos.",
      },
      {
        subtitulo: "Ciclo de Pagamento",
        texto:
          "Os pagamentos são organizados em ciclos semanais. Selecione o ciclo no seletor para visualizar o status financeiro daquele período.\n\nCiclo aberto (atual): exibe um preview em tempo real com as lives realizadas, horas e valores estimados. Nenhum pagamento definitivo é gerado enquanto o ciclo está em andamento.\n\nCiclo fechado: o sistema fecha automaticamente após a data final e gera os pagamentos com status Em análise. A partir daí, o fluxo segue três etapas:\n\n— Analisar: abre o detalhamento do pagamento — lives consideradas, horas e valor calculado. É possível ajustar o valor manualmente antes de aprovar.\n— A pagar: pagamento aprovado, aguardando quitação.\n— Pago: pagamento registrado. A plataforma salva automaticamente a data de pagamento.\n\nTambém é possível registrar Pagamentos de Agente de forma independente, sem vínculo com horas de live.",
      },
      {
        subtitulo: "Consolidado de Influencers",
        texto:
          "Tabela histórica com o relacionamento financeiro de cada parceiro: total pago, total de horas, valor pendente, data do último pagamento e status. Cada linha pode ser expandida para ver o histórico detalhado por ciclo.\n\nQuando há pagamentos de agentes no período, uma linha de Agência aparece ao final da tabela — sem horas associadas e sem expansão.",
      },
    ],
  },
};

// ─── Conteúdo: Troubleshooting ────────────────────────────────────────────────
const CONTEUDO_TROUBLE: Record<string, { titulo: string; blocos: { subtitulo: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        subtitulo: "Os dados não aparecem em nenhuma aba?",
        texto:
          "Verifique se há lives com status 'Realizada' validadas em Feedback para o período selecionado — sem lives validadas, os KPIs não são calculados. Se os filtros de influencer ou operadora estiverem ativos, tente resetá-los para confirmar se os dados existem em outro escopo.\n\nPerfis com acesso restrito (influencer, agência, operador) só visualizam dados do próprio escopo — isso é esperado.",
      },
      {
        subtitulo: "O ROI ou o GGR aparecem como '—'?",
        texto:
          "ROI '—' indica investimento zero — o influencer não teve pagamento registrado no período. Verifique se o ciclo financeiro do período está fechado e aprovado no módulo Financeiro.\n\nGGR '—' indica ausência de jogadores com depósitos e saques registrados no canal desse influencer no período. Confirme se o link de afiliado está ativo e se há métricas de conversão registradas.",
      },
      {
        subtitulo: "Um influencer aparece com status 'Sem dados' no Ranking?",
        texto:
          "O status 'Sem dados' é atribuído quando não há métricas de conversão — acessos, registros ou FTDs — para o influencer no período, mesmo que ele tenha lives realizadas. Verifique se o link de afiliado está corretamente configurado na operadora.",
      },
      {
        subtitulo: "O Comparativo de Funil não lista um influencer no seletor?",
        texto:
          "O comparativo exibe apenas influencers com dados no período selecionado. Se o influencer não aparece na lista, confirme que ele tem lives realizadas e métricas registradas. Verifique também se o filtro de operadora não está excluindo esse parceiro.",
      },
      {
        subtitulo: "O Ranking FTD/Hora está vazio ou omite influencers?",
        texto:
          "O ranking FTD/Hora exclui automaticamente influencers sem horas de live registradas — mesmo que tenham FTDs. Para aparecer, é preciso ter ao menos uma live com duração preenchida em Feedback. Verifique se as lives do influencer têm duração registrada.",
      },
      {
        subtitulo: "PVI, WD Ratio ou GGR por Jogador aparecem como '—'?",
        texto:
          "Essas métricas exigem FTDs no período como base de cálculo.\n\n— PVI '—': o influencer não gerou FTDs suficientes para calcular o índice de qualidade.\n— WD Ratio '—': não há depósitos registrados para os jogadores captados pelo influencer.\n— GGR por Jogador '—': ausência de FTDs — sem jogadores, não há como calcular a receita por jogador.",
      },
      {
        subtitulo: "Os dados diferem entre as abas Overview e Financeiro?",
        texto:
          "As abas compartilham o mesmo período e filtros, mas exibem camadas diferentes dos mesmos dados. Overview mostra volume e resultado agregado (GGR, ROI, FTDs); Financeiro detalha o comportamento dos jogadores (depósitos, saques, ticket médio, WD Ratio). Uma diferença nos valores de GGR entre abas indica inconsistência — mas diferenças de perspectiva analítica são esperadas por design.",
      },
      {
        subtitulo: "O gráfico de pizza no Financeiro parece incompleto?",
        texto:
          "O gráfico exibe apenas influencers com investimento registrado e aprovado no período. Influencers sem ciclo financeiro fechado não aparecem. A fatia 'Outros' agrupa influencers fora do top 9 e, quando há, pagamentos de agentes — o total sempre corresponde ao investimento consolidado do período.",
      },
    ],
  },
  mesas_spin: {
    titulo: "Overview Spin",
    blocos: [
      {
        subtitulo: "Os dados não estão aparecendo?",
        texto:
          "Verifique se há dados registrados para o período e a operadora selecionados. Se o filtro de operadora estiver ativo, tente mudar para 'Todas as operadoras' para confirmar se os dados existem em outro escopo. Perfis com acesso restrito visualizam apenas as mesas da sua operadora — isso é esperado.",
      },
      {
        subtitulo: "O Comparativo de Jogo, o Comparativo de Mesa e os Dados por Mesa não aparecem?",
        texto:
          "Esses blocos só são exibidos quando um mês específico está selecionado. No modo Histórico, apenas os KPIs Consolidados e o Detalhamento Mensal ficam disponíveis — os demais blocos são ocultados automaticamente.",
      },
      {
        subtitulo: "O Comparativo de Mesa não lista opções de mesa?",
        texto:
          "O Comparativo de Mesa exibe apenas mesas classificadas como Blackjack 1, Blackjack 2 e Blackjack VIP. Se nenhuma dessas tiver dados no período selecionado, o seletor ficará vazio.\n\nLembre-se: esse bloco só aparece quando uma operadora específica está selecionada, não no modo 'Todas as operadoras'.",
      },
      {
        subtitulo: "UAP ou ARPU aparecem como '—'?",
        texto:
          "No mês corrente (MTD), UAP e ARPU usam o resumo mensal oficial, que só é gerado ao final do mês. Enquanto o mês ainda está em andamento, esses valores podem aparecer como '—' — é comportamento esperado e os números se estabilizam com o fechamento do período.",
      },
      {
        subtitulo: "A Margem está negativa?",
        texto:
          "Margem negativa indica que, no período, os saques superaram os depósitos — o GGR ficou negativo. É um resultado possível em qualquer intervalo curto (um dia ou uma semana) e não indica erro nos dados.",
      },
      {
        subtitulo: "Os valores do Comparativo de Jogo diferem do Detalhamento Diário?",
        texto:
          "A coluna 'Total' no Comparativo de Jogo usa os mesmos dados do Detalhamento Diário e deve bater exatamente. As colunas por jogo (Blackjack, Roleta, Baccarat) vêm de uma tabela separada e podem apresentar uma diferença de ±1 dia no alinhamento em alguns lotes de dados. Isso não afeta os totais oficiais — apenas a distribuição por jogo naquela linha.",
      },
      {
        subtitulo: "O drilldown por operadora não aparece na tabela?",
        texto:
          "A expansão por operadora (ícone de seta ao lado da data ou mês) só está disponível quando o filtro está em 'Todas as operadoras'. Se uma operadora específica estiver selecionada, os dados já estão filtrados e não há sublinhas para expandir.",
      },
    ],
  },
  dash_midias_sociais: {
    titulo: "Mídias Sociais",
    blocos: [
      {
        subtitulo: "O funil de conversão está vazio?",
        texto:
          "Os dados de Visitas, Registros e FTDs vêm de UTMs mapeadas na Gestão de Links e vinculadas a campanhas. Se o funil estiver vazio, verifique se:\n\n— As campanhas foram cadastradas em Campanhas.\n— As UTMs das publicações foram mapeadas na Gestão de Links e vinculadas a essas campanhas.\n— O período selecionado tem tráfego registrado via UTMs.",
      },
      {
        subtitulo: "A aba Alcance não mostra dados de um canal específico?",
        texto:
          "Os dados de cada canal (Instagram, Facebook, YouTube) são coletados pelo ETL que sincroniza com as APIs das plataformas. Se um canal não aparecer, pode ser que:\n\n— A conta não está conectada ou a autorização expirou.\n— O ETL ainda não rodou para o período selecionado.\n— Não houve atividade na conta no período (zero publicações, zero alcance).\n\nEntre em contato com a equipe técnica se um canal esperado estiver consistentemente sem dados.",
      },
      {
        subtitulo: "Os KPIs de GGR e FTDs diferem dos dashboards de Streamers?",
        texto:
          "Isso é esperado. Os dados do dashboard de Mídias Sociais vêm exclusivamente das UTMs mapeadas a campanhas de mídias sociais — não incluem conversões via links de influencers. São canais de aquisição diferentes com origens de dados distintas.",
      },
      {
        subtitulo: "O Comparativo de campanhas está vazio mas há UTMs mapeadas?",
        texto:
          "Verifique se as UTMs mapeadas na Gestão de Links estão vinculadas a uma campanha (campo 'Campanha' no mapeamento de UTM). UTMs mapeadas para influencers mas não vinculadas a campanhas de mídias sociais não aparecem neste dashboard.",
      },
      {
        subtitulo: "O Engajamento aparece como '—'?",
        texto:
          "O Engajamento médio é calculado como Engajamentos ÷ Impressões. Se as Impressões do período forem zero — por exemplo, no YouTube onde impressões não são coletadas pela API Analytics — a taxa não pode ser calculada e aparece como '—'.",
      },
      {
        subtitulo: "As Postagens Recentes não carregam as imagens?",
        texto:
          "As imagens das postagens são carregadas diretamente das URLs das APIs das plataformas. Quando a imagem não carrega, um ícone substituto é exibido automaticamente. Isso pode ocorrer quando:\n\n— A URL da imagem expirou (comum em tokens temporários do Instagram).\n— O post foi excluído ou tornado privado após a coleta.\n— O dispositivo está bloqueando requisições externas.",
      },
      {
        subtitulo: "O Comparativo de funil não lista uma campanha?",
        texto:
          "O seletor de campanhas exibe apenas campanhas com dados no período selecionado. Se uma campanha não aparecer na lista, confirme que ela tem UTMs mapeadas com tráfego registrado no período.",
      },
    ],
  },
  dash_overview_influencer: {
    titulo: "Overview Influencer",
    blocos: [
      {
        subtitulo: "Os dados não estão aparecendo?",
        texto:
          "Verifique se há lives com status 'Realizada' validadas em Feedback para o período selecionado — sem lives validadas, os KPIs não são calculados. Se o filtro de influencer ou operadora estiver ativo, tente resetá-lo para confirmar se os dados existem em outro escopo.",
      },
      {
        subtitulo: "O ROI ou o GGR aparecem como '—'?",
        texto:
          "ROI '—' indica que não há investimento registrado e aprovado no período — verifique se o ciclo de pagamento está fechado e aprovado no módulo Financeiro.\n\nGGR '—' indica ausência de jogadores com depósitos e saques vinculados ao canal do influencer. Confirme se o link de afiliado está ativo e corretamente configurado na operadora.",
      },
      {
        subtitulo: "O Detalhamento do mês atual tem menos dias do que o esperado?",
        texto:
          "Esse comportamento é intencional. No mês corrente, a tabela de detalhamento exibe dados somente até o dia anterior — o dia de hoje não é incluído porque ainda está em andamento e os dados podem estar incompletos. Em meses anteriores, todos os dias são exibidos.",
      },
      {
        subtitulo: "Uma notificação apareceu dizendo que o filtro foi removido?",
        texto:
          "Quando você navega para um mês em que o influencer selecionado não tem dados, o sistema remove o filtro automaticamente e exibe o resultado consolidado de todos os influencers disponíveis no período. A notificação some em alguns segundos. Se quiser filtrar novamente, selecione o influencer no campo de filtro após a navegação.",
      },
      {
        subtitulo: "FTD/Hora, Ticket Médio ou GGR por Jogador aparecem como '—'?",
        texto:
          "Essas métricas exigem dados mínimos para o cálculo:\n\n— FTD/Hora '—': o influencer não tem horas de live registradas no período. Verifique se as lives têm duração preenchida em Feedback.\n— Ticket Médio FTD '—': não há FTDs no período — sem primeiros depósitos, não há base de cálculo.\n— GGR por Jogador '—': idem — a métrica é GGR dividido por número de FTDs.",
      },
      {
        subtitulo: "O Investimento aparece como 'R$ 0,00' ou '—'?",
        texto:
          "O investimento exibido considera apenas pagamentos com status Pago no módulo Financeiro. Se o ciclo do período ainda está Em análise ou A pagar, o valor aparece como zero. Confirme o status do pagamento com o gestor responsável.",
      },
      {
        subtitulo: "A tabela de Detalhamento Diário está vazia ou sem dados em algumas colunas?",
        texto:
          "A tabela exibe todos os dias do mês — mesmo dias sem atividade aparecem como linha com '—'. Se colunas de conversão (Acessos, Registros, FTDs) estão todas '—', pode indicar que o link de afiliado não gerou tráfego naquele dia. Colunas de live (Duração, Média Views, Máx Views) aparecem '—' em dias sem live realizada.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda de Lives",
    blocos: [
      {
        subtitulo: "Uma live não aparece no calendário?",
        texto:
          "Verifique se os filtros de status, plataforma, influencer ou operadora não estão ocultando a live. Com qualquer filtro ativo, apenas as lives que atendem a todos os critérios são exibidas. O botão Limpar filtros aparece automaticamente — use-o para ver a agenda completa.\n\nInfluencers e agências só visualizam as próprias lives. Se você tem esse perfil e não encontra uma live, ela pode ter sido cadastrada com outro influencer.",
      },
      {
        subtitulo: "Não consigo salvar uma nova live?",
        texto:
          "O campo de link é obrigatório. Verifique se o link da plataforma selecionada está preenchido. O link é pré-preenchido automaticamente com o perfil do influencer, mas atualiza ao trocar de plataforma — se a nova plataforma não tiver link cadastrado, o campo fica em branco e precisa ser preenchido manualmente.",
      },
      {
        subtitulo: "Apareceu um modal de 'Agendamento indisponível'?",
        texto:
          "O bloqueio ocorre quando o influencer não atendeu os pré-requisitos:\n\n— Perfil incompleto: dados obrigatórios do cadastro em Influencers não foram preenchidos. Use o botão 'Ir para Influencers' no próprio modal para ir diretamente à correção.\n— Playbook pendente: o influencer ainda não registrou ciência nos termos obrigatórios. Use o botão 'Ir para Playbook Influencers' no modal.\n\nO sistema verifica esses pré-requisitos automaticamente ao clicar em Nova Live. Se ambos os problemas existirem, os dois botões aparecem.",
      },
      {
        subtitulo: "Não consigo editar uma live?",
        texto:
          "Lives com status Realizada ou Não Realizada são bloqueadas para edição por influencers, agências e operadores — o modal abre em modo somente leitura. Apenas Admin e Gestor podem editar lives já validadas. Se você precisa corrigir uma live validada, solicite a quem tem perfil Admin ou Gestor.",
      },
      {
        subtitulo: "Não consigo excluir uma live?",
        texto:
          "As mesmas regras de edição se aplicam à exclusão: lives já validadas (Realizada ou Não Realizada) só podem ser excluídas por Admin e Gestor. Para lives ainda Agendadas, o botão Excluir no modal segue o fluxo de duplo clique (Confirmar?) quando o seu perfil tem permissão de exclusão.",
      },
      {
        subtitulo: "Não consigo agendar para hoje?",
        texto:
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — agendar para o mesmo dia não é permitido. Essa restrição não se aplica a Admin e Gestor, que podem criar e editar lives em qualquer data.",
      },
      {
        subtitulo: "Não consigo criar ou editar uma live em data passada?",
        texto:
          "Apenas Admin e Gestor podem criar ou editar lives em datas e horários passados. Se o sistema bloqueou a operação, verifique se a data preenchida não está no passado e se o seu perfil tem essa permissão.",
      },
      {
        subtitulo: "O botão Nova Live não aparece?",
        texto:
          "O botão aparece apenas para perfis com permissão de criação. Se ele não aparecer mesmo estando logado, o seu perfil pode não ter essa permissão configurada. Entre em contato com o administrador da conta.",
      },
    ],
  },
  resultados: {
    titulo: "Resultado de Lives",
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
          "Na página de Resultados, o botão Excluir aparece apenas para lives ainda com status Agendada (as que aguardam validação), para perfis com permissão — com confirmação em dois cliques. Lives já validadas não são excluídas aqui; edição ou exclusão segue as regras da Agenda (Admin e Gestor para lives Realizada/Não Realizada).",
      },
    ],
  },
  feedback: {
    titulo: "Feedback de Lives",
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
          "O botão Excluir segue as mesmas regras de permissão que o Editar e usa o fluxo de duplo clique (Confirmar?). Lives fora do seu escopo não exibem ações.",
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
          "Na vista padrão, prospectos com status Fechado não são exibidos na lista. Para visualizá-los, selecione explicitamente o filtro 'Fechado' nos chips de Status. Verifique também se o chip de plataforma na grade de Cobertura está ativo — ele também filtra a lista quando selecionado. Os sliders de cachê e views podem estar reduzindo o escopo da busca.",
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
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        subtitulo: "Os pagamentos do ciclo não foram gerados?",
        texto:
          "O ciclo precisa estar fechado para que os pagamentos sejam criados. Ciclos com data final no futuro ainda estão em andamento e exibem apenas uma prévia estimada.",
      },
      {
        subtitulo: "O valor calculado está incorreto?",
        texto:
          "Verifique se todas as lives do período foram validadas em Resultados e se o cachê por hora está preenchido no cadastro do influencer em Influencers. Esses dois dados são a base do cálculo.",
      },
      {
        subtitulo: "Quero ajustar o valor antes de aprovar. Como faço?",
        texto:
          "Clique em Analisar no ciclo fechado. O modal exibe o valor calculado e permite editá-lo manualmente antes de mover o pagamento para A pagar.",
      },
      {
        subtitulo: "O KPI de Pendente está alto mas não encontro pagamentos em aberto?",
        texto:
          "Verifique os filtros de influencer e operadora — podem estar ocultando parte dos ciclos. Também confira se há ciclos fechados com pagamentos ainda em Em análise.",
      },
      {
        subtitulo: "A linha de Agência não aparece no Consolidado?",
        texto:
          "A linha de Agência só é exibida quando há pagamentos de agente registrados no período filtrado. Ajuste o filtro de mês para verificar outros períodos.",
      },
    ],
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ABAS: Aba[] = ["conheca", "troubleshooting", "glossario"];

const LABELS_ABA: Record<Aba, string> = {
  conheca: "Conheça a Plataforma",
  troubleshooting: "Troubleshooting",
  glossario: "Glossário",
};

export default function Ajuda() {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey>("streamers");

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const pillActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-accent) 18%, transparent)"
    : `${BRAND_SEMANTIC.roxoVivo}22`;
  const navActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
    : `${BRAND_SEMANTIC.roxo}18`;
  const navIconBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 22%, transparent)"
    : `${BRAND_SEMANTIC.roxo}30`;
  const tituloGradient =
    brand.useBrand
      ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
      : `linear-gradient(90deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`;

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Ajuda.
      </div>
    );
  }

  const dadosConteudo =
    aba === "conheca"
      ? CONTEUDO_CONHECA[paginaSelecionada]
      : aba === "troubleshooting"
        ? CONTEUDO_TROUBLE[paginaSelecionada]
        : undefined;

  return (
    <div className="app-page-shell" style={{ maxWidth: "1100px", margin: "0 auto" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.primaryIconColor,
          flexShrink: 0,
        }}>
          <HelpCircle size={14} aria-hidden="true" />
        </span>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT_TITLE,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Ajuda
        </h1>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 24px 40px" }}>
        Conheça as funcionalidades da plataforma, o glossário de métricas e soluções para problemas comuns.
      </p>

      <div
        role="tablist"
        aria-label="Seções de ajuda"
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {ABAS.map((a) => {
          const ativo = aba === a;
          return (
            <button
              key={a}
              type="button"
              role="tab"
              id={`tab-ajuda-${a}`}
              aria-selected={ativo}
              aria-controls={`panel-ajuda-${a}`}
              onClick={() => setAba(a)}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: ativo ? pillActiveBg : (t.inputBg ?? t.cardBg),
                color: ativo ? brand.accent : t.textMuted,
                transition: "all 0.2s",
              }}
            >
              {LABELS_ABA[a]}
            </button>
          );
        })}
      </div>

      {aba === "glossario" ? (
        <div
          role="tabpanel"
          id="panel-ajuda-glossario"
          aria-labelledby="tab-ajuda-glossario"
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "28px 32px",
              boxShadow: cardShadow,
            }}
          >
            <AbaGlossario dark={isDark} t={t} brand={brand} />
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`panel-ajuda-${aba}`}
          aria-labelledby={`tab-ajuda-${aba}`}
          style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}
        >
          <aside
            aria-label="Navegação de ajuda"
            style={{
              width: 240,
              maxWidth: "100%",
              flexShrink: 0,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "16px 12px",
              boxShadow: cardShadow,
            }}
          >
            <nav>
              {MENU_AJUDA.map((sec) => (
                <div key={sec.section} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1.4px",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    marginBottom: 8,
                    fontFamily: FONT.body,
                    paddingLeft: 10,
                  }}>
                    {sec.section}
                  </div>
                  {sec.items.map(({ key, label, Icon }) => {
                    const ativo = paginaSelecionada === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPaginaSelecionada(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          borderRadius: 10,
                          cursor: "pointer",
                          background: ativo ? navActiveBg : "transparent",
                          color: ativo ? brand.accent : t.text,
                          fontSize: 13,
                          fontFamily: FONT.body,
                          fontWeight: ativo ? 700 : 500,
                          border: ativo ? `1px solid color-mix(in srgb, ${brand.accent} 35%, transparent)` : "1px solid transparent",
                          width: "100%",
                          textAlign: "left",
                          marginBottom: 2,
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: ativo ? navIconBg : `${t.textMuted}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={11} color={ativo ? brand.accent : t.textMuted} />
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <div style={{
            flex: 1,
            minWidth: 300,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: cardShadow,
          }}>
            {dadosConteudo ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: t.text,
                    fontFamily: FONT_TITLE,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 8px",
                  }}>
                    {dadosConteudo.titulo}
                  </h2>
                  <div style={{
                    height: 2,
                    width: 40,
                    background: tituloGradient,
                    borderRadius: 2,
                  }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {dadosConteudo.blocos.map((bloco, i) => (
                    <div key={i}>
                      {"subtitulo" in bloco && bloco.subtitulo && (
                        <p style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: FONT.body,
                          color: brand.accent,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          margin: "0 0 6px",
                        }}>
                          {bloco.subtitulo}
                        </p>
                      )}
                      <p style={{
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: t.text,
                        fontFamily: FONT.body,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}>
                        {bloco.texto}
                      </p>
                      {i < dadosConteudo.blocos.length - 1 && (
                        <div style={{
                          height: 1,
                          background: t.cardBorder,
                          marginTop: 20,
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: navActiveBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
                </div>
                <p style={{
                  fontSize: 14,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  margin: 0,
                  textAlign: "center",
                }}>
                  Conteúdo em construção para esta página.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
