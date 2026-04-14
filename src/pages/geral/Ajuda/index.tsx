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
} from "react-icons/gi";

type Aba = "conheca" | "troubleshooting" | "glossario";

// ─── Menu estrutura ───────────────────────────────────────────────────────────
const MENU_AJUDA = [
  {
    section: "Dashboards",
    items: [
      { key: "streamers" as PageKey, label: "Streamers", Icon: GiTv },
      { key: "mesas_spin" as PageKey, label: "Overview Spin", Icon: GiPokerHand },
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
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers" as PageKey, label: "Influencers", Icon: GiPerson },
      { key: "scout" as PageKey, label: "Scout", Icon: GiBinoculars },
      { key: "financeiro" as PageKey, label: "Financeiro", Icon: GiCash },
    ],
  },
];

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        texto:
          "Central de análise do canal de influencers. Reúne três visões complementares em abas — Overview, Conversão e Financeiro — com filtros de período, influencer e operadora compartilhados: mudanças nos filtros aplicam-se à aba atual e permanecem ao navegar entre elas.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre meses ou ative Histórico para ver todo o período disponível de uma vez. No modo Histórico, o comparativo MoM é desabilitado em todos os blocos e nas três abas.\n\nO filtro de influencer aparece para perfis com acesso a múltiplos parceiros. Influencers visualizam os próprios dados sem esse filtro disponível.\n\nO filtro de operadora aparece quando o perfil tem acesso a mais de uma operadora, permitindo isolar os dados de uma parceira específica em todas as abas.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "Visão executiva consolidada, organizada em três grupos de KPIs:\n\n— Financeiro: GGR Total, Investimento e ROI Geral — o resultado financeiro do canal.\n— Operação: Lives, Horas Realizadas, Influencers Ativos e Depósitos — a dimensão operacional das ativações.\n— Conversão: Registros, Custo por Registro, FTDs e Custo por FTD — eficiência do funil de aquisição.\n\nO Funil de Conversão abaixo dos KPIs exibe os quatro estágios (Views → Acessos → Registros → FTDs) com as taxas de passagem entre cada etapa.\n\nO Ranking de Influencers lista todos os parceiros com seus indicadores principais e o status de performance (Rentável, Atenção, Não Rentável, Bônus ou Sem dados). Use os badges de status no topo da tabela para filtrar por categoria, e clique nos cabeçalhos de coluna para ordenar por qualquer indicador.",
      },
      {
        subtitulo: "Aba Conversão",
        texto:
          "Análise detalhada do funil individual de cada influencer, com três blocos:\n\n— Comparativo de Funil: selecione dois influencers para comparar o funil lado a lado — volumes em cada etapa e as taxas-chave (View→FTD, Acesso→FTD, FTD por hora de live).\n\n— Ranking FTD/Hora: classifica os influencers pela eficiência de conversão por hora transmitida. Os três primeiros aparecem em pódio visual; os demais em lista paginada. Influencers sem horas de live registradas são omitidos automaticamente.\n\n— Comparativo de Taxas: tabela com as taxas de cada etapa do funil por influencer. A coluna Ação destaca o próximo passo recomendado com base na taxa mais crítica de cada parceiro — Divulgar o link, Converter visita, Ativar cadastro ou Em dia. Use os filtros de ação no topo para focar em influencers com o mesmo gargalo.",
      },
      {
        subtitulo: "Aba Financeiro",
        texto:
          "Análise do comportamento financeiro dos jogadores captados por cada influencer, com três blocos:\n\n— KPIs Financeiros: R$ FTD, Depósitos, Saques, WD Ratio, GGR por Jogador e PVI — todos com comparativo MoM quando disponível.\n\n— Investimento por Influencer: gráfico de distribuição do investimento total entre os parceiros no período. A fatia 'Outros' agrupa influencers fora do top 9 e, quando aplicável, pagamentos de agentes.\n\n— Ranking Financeiro: tabela com métricas de qualidade de jogadores por influencer — ticket médio de depósito e saque, GGR, WD Ratio, PVI e o Perfil de Jogador calculado (Whales, Core, Recreativos ou Caçadores de Bônus).",
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
        subtitulo: "Detalhamento Diário / Comparativo Mensal",
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
          "Três grupos de indicadores consolidados do período:\n\n— Financeiro: GGR Total, Investimento recebido e ROI — o retorno gerado em relação ao valor pago.\n— Operação: Quantidade de Lives, Horas Realizadas e Média de Views por live.\n— Conversão: Registros gerados, FTDs (quantidade e valor total), Depósitos e Saques dos jogadores captados.\n\nNo mês corrente (MTD), todos os indicadores exibem a variação em relação ao mesmo intervalo do mês anterior. No modo Histórico, o comparativo é desabilitado.",
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
        subtitulo: "Comparativo Diário / Comparativo Mensal",
        texto:
          "Tabela com a evolução detalhada dos indicadores no tempo — dia a dia no mês selecionado, ou mês a mês no modo Histórico. A linha de Total ao final da tabela consolida todos os valores do período.\n\nUse o toggle Tabela / Gráfico para alternar entre a visualização em tabela e a evolução em gráfico. No modo gráfico, selecione o KPI que deseja visualizar nos botões acima do gráfico.\n\nNota: no mês corrente, os dados do dia de hoje não são exibidos — o comparativo vai até o dia anterior para garantir que apenas dados completos sejam considerados.",
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
          "A agenda oferece três modos de visualização, selecionáveis no menu 'Mês / Semana / Dia':\n\n— Mês: visão completa do calendário com todas as lives do período. Clique em qualquer dia para abrir a visualização diária.\n— Semana: exibe os sete dias da semana atual em colunas, com todas as lives de cada dia.\n— Dia: lista detalhada de todas as lives de um dia específico, com plataforma, horário, status e link.",
      },
      {
        subtitulo: "Navegação e Filtros",
        texto:
          "Use as setas para avançar ou recuar no período, ou clique em Hoje para voltar à data atual.\n\nOs filtros de Status (Agendada, Realizada, Não Realizada) e Plataforma permitem isolar tipos específicos de lives. Para perfis com acesso a múltiplos influencers ou operadoras, os filtros correspondentes aparecem na barra de controles.\n\nClique em qualquer filtro ativo para desativá-lo, ou use o botão Limpar filtros para remover todos de uma vez.",
      },
      {
        subtitulo: "Criando uma Nova Live",
        texto:
          "Clique em + Nova Live para abrir o formulário de criação. Preencha:\n\n— Influencer: selecione o parceiro responsável (disponível para gestores e operadores)\n— Data e Horário: quando a live está programada\n— Plataforma: o canal de transmissão (Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp ou Telegram)\n— Link: o campo de link é obrigatório para salvar — é pré-preenchido automaticamente com o link do perfil do influencer quando disponível\n\nInfluencers e operadores só podem agendar lives a partir do dia seguinte — não é permitido agendar para o mesmo dia. Apenas Admin e Gestor podem criar ou editar lives em datas passadas.",
      },
      {
        subtitulo: "Editando ou Excluindo uma Live",
        texto:
          "Clique em qualquer live no calendário para abrir o modal com os detalhes. Se você tiver permissão de edição, os campos estarão disponíveis para alteração.\n\nLives com status Realizada ou Não Realizada só podem ser editadas ou excluídas por Admin e Gestor — para os demais perfis, o modal abre em modo leitura.",
      },
      {
        subtitulo: "Identificação Visual das Lives",
        texto:
          "Cada live no calendário exibe:\n\n— Cor do ponto de status: azul (Agendada), verde (Realizada) ou vermelho (Não Realizada)\n— Logo da plataforma\n— Horário e nome do influencer\n\nAs células do calendário mensal também variam de cor conforme o dia: azul claro para hoje, tom esverdeado para dias futuros e tom avermelhado para dias passados.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Influencer / Agência: visualiza e agenda apenas as próprias lives ou as dos influencers sob sua gestão.\n— Operador: visualiza todas as lives dos influencers que atuam na sua operadora.\n— Gestor / Executivo: visão completa de todas as lives de todos os influencers e operadoras.",
      },
    ],
  },
  resultados: {
    titulo: "Resultado de Lives",
    blocos: [
      {
        texto:
          "Área de validação das lives realizadas. Exibe todas as lives agendadas cujo horário passou há mais de 5 horas e que ainda não foram validadas. Para cada live, é possível registrar se ela foi realizada ou não — e, quando realizada, os dados de duração e audiência.",
      },
      {
        subtitulo: "Janela de Elegibilidade",
        texto:
          "Apenas lives com horário passado há pelo menos 5 horas aparecem na lista. Essa janela existe para dar tempo à live de terminar e aos dados de serem registrados antes da validação. Lives que ainda estão no ar ou acabaram de terminar não aparecem.",
      },
      {
        subtitulo: "Validando uma Live",
        texto:
          "Clique em Validar na live desejada para abrir o formulário. Preencha:\n\n— Status: escolha Realizada ou Não Realizada\n— Operadora: obrigatório para qualquer status — é o vínculo que conecta a live ao cálculo de pagamentos no módulo Financeiro\n— Observação: campo livre para comentários (opcional)\n\nPara lives Realizadas, campos adicionais ficam disponíveis:\n— Horário Real de Início: se a live começou em horário diferente do agendado\n— Duração: horas e minutos da transmissão\n— Média de Views: audiência média ao longo da live\n— Máximo de Views: pico de audiência",
      },
      {
        subtitulo: "Live Não Realizada",
        texto:
          "Ao selecionar 'Não Realizada', uma mensagem de confirmação é exibida e os campos de resultado são ocultados. Nenhum dado de audiência ou duração é registrado. A live permanece no histórico com o status de não realizada.",
      },
      {
        subtitulo: "Excluindo uma Live",
        texto:
          "O botão Excluir aparece para perfis com permissão de exclusão. Para evitar exclusões acidentais, é necessário clicar duas vezes — o primeiro clique transforma o botão em 'Confirmar?', e o segundo executa a exclusão. Clicar fora do botão cancela a operação.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Para perfis com acesso a múltiplos influencers ou operadoras, os filtros aparecem no topo da página. Eles permitem isolar as lives de um influencer específico ou de uma operadora, facilitando o trabalho em volumes maiores.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        texto:
          "Histórico completo das lives validadas na operação. Permite acompanhar o resultado final de cada ativação — duração, audiência e status — com visão consolidada por período.",
      },
      {
        subtitulo: "KPIs do Período",
        texto:
          "No topo da página são exibidos os indicadores consolidados do período selecionado:\n\n— Total de Lives: quantidade total de lives no período, com breakdown entre realizadas e não realizadas.\n— Horas Realizadas: soma das durações de todas as lives realizadas.\n— Média de Views: média das médias de views por live no período.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Selecione o período de análise — Semana, Mês ou Tudo — e combine com os filtros de status (Realizada, Não Realizada), operadora e influencer para refinar a visualização.",
      },
      {
        subtitulo: "Lista de Lives",
        texto:
          "Cada live exibe data, horário, influencer, plataforma e os três indicadores de audiência: Duração, Média de Views e Pico de Views. Lives realizadas aparecem com destaque verde; não realizadas, com vermelho.\n\nInfluencers visualizam apenas as próprias lives. Gestores e admins visualizam todas.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        texto:
          "Cadastro central dos parceiros da operação. Reúne todos os dados necessários para ativar, acompanhar e pagar cada influencer — e serve de base para os módulos de Agenda, Resultados, Feedback e Financeiro.",
      },
      {
        subtitulo: "Cards de Resumo",
        texto:
          "Dois cards no topo oferecem uma leitura rápida da base:\n\n— Total de Influencers: quantidade total cadastrada, com breakdown por status (Ativo, Inativo, Cancelado) e por plataforma ativa.\n— Perfil Incompleto: influencers ativos com dados obrigatórios pendentes. A lista é clicável — acesse diretamente os perfis que precisam de atualização, especialmente antes de fechamentos financeiros.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Combine os filtros para localizar rapidamente qualquer parceiro na base:\n\n— Busca: por nome artístico ou e-mail\n— Status: Ativo, Inativo ou Cancelado\n— Plataforma: Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp ou Telegram\n— Operadora: filtra por relacionamento comercial\n— Cachê por hora: slider para encontrar parceiros dentro de uma faixa de orçamento",
      },
      {
        subtitulo: "Lista de Influencers",
        texto:
          "Cada influencer aparece em um card com: avatar, nome artístico, status, cachê por hora, canais ativos e operadoras vinculadas.\n\nO status pode ser alterado diretamente no card, sem precisar abrir o perfil completo.",
      },
      {
        subtitulo: "Visualizando e Editando um Perfil",
        texto:
          "Clique em Ver para consultar o perfil em modo leitura, ou em Editar para atualizar os dados. As informações são organizadas em quatro abas:\n\n— Cadastral: dados de identificação do influencer\n— Canais: plataformas em que o influencer atua e seus links\n— Financeiro: dados para cálculo e pagamento\n— Operadoras: operadoras vinculadas e identificadores associados\n\nO próprio influencer ou sua agência pode editar o próprio perfil diretamente na plataforma.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        texto:
          "Pipeline de prospecção de novos influencers. Registre candidatos, acompanhe o andamento das negociações e mantenha o histórico de contatos em um só lugar.",
      },
      {
        subtitulo: "Funil de Prospecção",
        texto:
          "Os cards no topo mostram quantos prospectos estão em cada etapa do funil:\n\n— Visualizado: perfil identificado, ainda sem contato iniciado\n— Contato: abordagem realizada, aguardando resposta\n— Negociação: condições sendo discutidas\n— Fechado: parceria confirmada",
      },
      {
        subtitulo: "Cobertura de Plataformas",
        texto:
          "Exibe quantos prospectos estão cadastrados por plataforma — Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp e Telegram. Útil para identificar gaps de cobertura na estratégia de prospecção.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Localize prospectos rapidamente combinando os filtros disponíveis:\n\n— Busca: por nome ou e-mail\n— Status: etapa do funil\n— Plataforma: canal de atuação\n— Cachê por hora: faixa de orçamento negociado\n— Views: faixa de audiência média",
      },
      {
        subtitulo: "Lista de Prospectos",
        texto:
          "Cada prospecto exibe nome, status atual, plataformas com média de views, cachê negociado e categoria. O status pode ser atualizado diretamente no card, sem abrir o perfil completo.",
      },
      {
        subtitulo: "Adicionando e Editando um Prospecto",
        texto:
          "Clique em + Adicionar para registrar um novo candidato. O modal é organizado em três abas:\n\n— Contato: nome artístico, status no funil, tipo de contato, cachê negociado, categoria e e-mail\n— Canais: plataformas em que o prospecto atua e métricas de audiência\n— Anotações: campo livre para registrar observações sobre a negociação\n\nApenas admins e gestores podem adicionar e editar prospectos.",
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
          "Esses blocos só são exibidos quando um mês específico está selecionado. No modo Histórico, apenas os KPIs Consolidados e o Comparativo Mensal ficam disponíveis — os demais blocos são ocultados automaticamente.",
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
        subtitulo: "O Comparativo do mês atual tem menos dias do que o esperado?",
        texto:
          "Esse comportamento é intencional. No mês corrente, o comparativo exibe dados somente até o dia anterior — o dia de hoje não é incluído porque ainda está em andamento e os dados podem estar incompletos. Em meses anteriores, todos os dias são exibidos.",
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
        subtitulo: "A tabela do Comparativo está vazia ou sem dados em algumas colunas?",
        texto:
          "A tabela exibe todos os dias do mês — mesmo dias sem atividade aparecem como linha com '—'. Se colunas de conversão (Acessos, Registros, FTDs) estão todas '—', pode indicar que o link de afiliado não gerou tráfego naquele dia. Colunas de live (Duração, Média Views) aparecem '—' em dias sem live realizada.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        subtitulo: "Uma live não aparece no calendário?",
        texto:
          "Verifique se os filtros de status, plataforma, influencer ou operadora não estão ocultando a live. Com filtros ativos, apenas as lives que atendem a todos os critérios são exibidas. Clique em Limpar filtros para remover todos e ver a agenda completa.\n\nInfluencers e agências só visualizam as próprias lives — se você tem esse perfil e não encontra uma live, ela pode ter sido cadastrada com outro influencer.",
      },
      {
        subtitulo: "Não consigo salvar uma nova live?",
        texto:
          "O campo de link é obrigatório — verifique se o link da plataforma selecionada está preenchido. O link é pré-preenchido automaticamente com o link do perfil do influencer quando disponível, mas pode estar em branco se o perfil ainda não tiver o link cadastrado.\n\nSe você vê uma mensagem de 'Agendamento indisponível', veja a pergunta específica abaixo.",
      },
      {
        subtitulo: "Apareceu uma mensagem de 'Agendamento indisponível'?",
        texto:
          "Esse bloqueio ocorre quando o influencer não atendeu aos pré-requisitos para agendar lives:\n\n— Perfil incompleto: dados obrigatórios do cadastro em Influencers não foram preenchidos. O botão 'Ir para Influencers' leva diretamente à página para completar o perfil.\n— Playbook pendente: o influencer ainda não registrou ciência nos termos obrigatórios do Playbook Influencers. Use o botão 'Ir para Playbook Influencers' para acessar os termos.",
      },
      {
        subtitulo: "Não consigo editar ou excluir uma live?",
        texto:
          "Lives com status Realizada ou Não Realizada são bloqueadas para edição e exclusão por influencers, agências e operadores. Apenas Admin e Gestor podem alterar lives já validadas. Se você precisa corrigir uma live validada, solicite ao responsável com perfil Admin ou Gestor.",
      },
      {
        subtitulo: "Não consigo agendar para hoje?",
        texto:
          "Influencers e operadores só podem agendar lives a partir do dia seguinte — o agendamento para o mesmo dia não é permitido. Essa restrição não se aplica a Admin e Gestor, que podem criar e editar lives em qualquer data.",
      },
      {
        subtitulo: "O botão + Nova Live não aparece?",
        texto:
          "O botão só aparece para perfis com permissão de criação. Se você não vê o botão mesmo estando logado, seu perfil pode não ter essa permissão configurada. Entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "A live está no dia errado no calendário?",
        texto:
          "A data exibida no calendário é a data registrada no momento do agendamento, com base no fuso horário da plataforma. Se a live aparecer num dia diferente do esperado, verifique a data preenchida no formulário de edição.",
      },
    ],
  },
  resultados: {
    titulo: "Resultado de Lives",
    blocos: [
      {
        subtitulo: "Uma live não aparece na lista de validação?",
        texto:
          "A lista exibe apenas lives com status Agendada cujo horário passou há mais de 5 horas. Verifique:\n\n— A live pode ainda não ter atingido a janela de 5 horas desde o horário agendado.\n— Se os filtros de influencer ou operadora estiverem ativos, a live pode estar sendo ocultada.\n— Veja na Agenda se a live tem status diferente de Agendada — lives já validadas não aparecem na lista de validação.",
      },
      {
        subtitulo: "Não consigo salvar a validação?",
        texto:
          "Verifique:\n\n— O campo Operadora é obrigatório para qualquer status (Realizada ou Não Realizada). Selecione a operadora antes de salvar.\n— Para lives Realizadas, a Duração deve ser preenchida — horas e minutos não podem ser ambos zero.\n— O Máximo de Views não pode ser menor que a Média de Views.",
      },
      {
        subtitulo: "O botão Validar não aparece?",
        texto:
          "O botão só aparece para perfis com permissão de edição. Se o botão não aparecer, seu perfil pode não ter essa permissão configurada. Entre em contato com o administrador da conta.",
      },
      {
        subtitulo: "Por que a operadora é obrigatória na validação?",
        texto:
          "A operadora registrada na validação é o vínculo que conecta a live ao cálculo de pagamentos no módulo Financeiro. Sem a operadora, o sistema não consegue associar as horas da live ao ciclo de pagamento correto. Por isso, é obrigatória independentemente do status da live.",
      },
      {
        subtitulo: "Posso excluir uma live validada?",
        texto:
          "Lives com status Realizada ou Não Realizada só podem ser editadas ou excluídas na Agenda por Admin e Gestor. Na página de Resultados, o botão Excluir aparece apenas para lives ainda com status Agendada — que são exatamente as que estão aguardando validação.",
      },
      {
        subtitulo: "A lista está vazia mas sei que há lives pendentes?",
        texto:
          "Confirme se os filtros de influencer ou operadora não estão ocultando as lives. Se os filtros estiverem em 'Todos', verifique se as lives em questão passaram da janela de 5 horas desde o horário agendado. Se as lives foram validadas por outro usuário enquanto você estava com a página aberta, recarregue a página para ver a lista atualizada.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        subtitulo: "Nenhuma live aparece na lista?",
        texto:
          "Verifique o filtro de período selecionado — o padrão pode estar limitando a visualização. Tente selecionar Tudo para ver o histórico completo. Lives só aparecem após serem validadas em Resultados.",
      },
      {
        subtitulo: "Os KPIs do topo estão zerados?",
        texto:
          "Indica que não há lives validadas no período selecionado. Ajuste o filtro de período ou verifique se as lives foram validadas em Resultados.",
      },
      {
        subtitulo: "Uma live específica não aparece?",
        texto:
          "Confirme se o filtro de influencer ou operadora não está excluindo essa live. Se você tem perfil de influencer, só visualiza as próprias lives — lives de outros influencers não serão exibidas.",
      },
      {
        subtitulo: "A Média de Views está diferente do esperado?",
        texto:
          "A métrica exibida é a média das médias por live, não a soma total de views. Cada live contribui com sua própria média de audiência para o cálculo.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        subtitulo: "Um influencer aparece no card de Perfil Incompleto. O que falta?",
        texto:
          "Os campos mais comuns que causam esse alerta são os dados da aba Financeiro — chave PIX, dados bancários ou cachê por hora. Abra o perfil e verifique os campos obrigatórios sinalizados.",
      },
      {
        subtitulo: "O influencer não aparece na lista?",
        texto:
          "Verifique se o filtro de status está configurado para exibir o status correto. Influencers inativos ou cancelados só aparecem quando o filtro correspondente está selecionado.",
      },
      {
        subtitulo: "Não consigo editar o perfil de um influencer?",
        texto:
          "A edição está disponível para o próprio influencer, sua agência e perfis com permissão de gestão. Se o botão Editar não aparecer, seu perfil pode não ter essa permissão.",
      },
      {
        subtitulo: "Os canais do influencer não aparecem na Agenda ou no Feedback?",
        texto:
          "Verifique se os canais estão cadastrados na aba Canais do perfil e se as operadoras estão vinculadas na aba Operadoras. Dados ausentes nessas abas afetam outros módulos da plataforma.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        subtitulo: "Um prospecto não aparece na lista?",
        texto:
          "Verifique se o filtro de status não está ocultando a etapa onde ele se encontra. Se o filtro de plataforma ou cachê estiver ativo, também pode estar excluindo o prospecto da visualização.",
      },
      {
        subtitulo: "O funil não está refletindo a quantidade correta de prospectos?",
        texto:
          "Os cards do funil respondem aos filtros aplicados. Com filtros ativos, os totais exibidos representam apenas os prospectos que atendem aos critérios selecionados — não o total geral.",
      },
      {
        subtitulo: "Não consigo adicionar ou editar um prospecto?",
        texto:
          "O Scout é restrito a admins e gestores. Se você não tem esse perfil, o botão de adição e edição não estará disponível.",
      },
      {
        subtitulo: "Quero converter um prospecto em influencer ativo. Como faço?",
        texto:
          "Após fechar a parceria, o prospecto precisa ser cadastrado manualmente na página Influencers. O Scout não realiza essa conversão automaticamente.",
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
