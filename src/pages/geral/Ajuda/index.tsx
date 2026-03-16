import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import type { PageKey } from "../../../types";
import {
  GiHelp,
  GiRadarSweep,
  GiFunnel,
  GiMoneyStack,
  GiCalendar,
  GiConversation,
  GiPerson,
  GiBinoculars,
  GiCash,
} from "react-icons/gi";

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
};

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

type Aba = "conheca" | "troubleshooting";
type PageKey2 = PageKey;

// ─── Menu estrutura ───────────────────────────────────────────────────────────
const MENU_AJUDA = [
  {
    section: "Dashboards",
    items: [
      { key: "dash_overview" as PageKey2, label: "Overview", Icon: GiRadarSweep },
      { key: "dash_conversao" as PageKey2, label: "Conversão", Icon: GiFunnel },
      { key: "dash_financeiro" as PageKey2, label: "Financeiro", Icon: GiMoneyStack },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda" as PageKey2, label: "Agenda", Icon: GiCalendar },
      { key: "feedback" as PageKey2, label: "Feedback", Icon: GiConversation },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers" as PageKey2, label: "Influencers", Icon: GiPerson },
      { key: "scout" as PageKey2, label: "Scout", Icon: GiBinoculars },
      { key: "financeiro" as PageKey2, label: "Financeiro", Icon: GiCash },
    ],
  },
];

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  dash_overview: {
    titulo: "Overview",
    blocos: [
      {
        texto:
          "O painel executivo da operação. Reúne os principais indicadores de performance das campanhas com influenciadores — financeiros, operacionais e de aquisição — em uma única tela.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "No topo da página você controla o recorte temporal da análise. Use as setas para navegar entre meses ou clique em Histórico para comparar períodos anteriores.\n\nTodos os indicadores exibem um comparativo MTD (mês até hoje) em relação ao mesmo período do mês anterior.\n\nOs filtros de influencer e operadora permitem segmentar os dados para uma visão específica da operação.",
      },
      {
        subtitulo: "KPIs Executivos",
        texto:
          "Indicadores consolidados da operação no período selecionado, organizados em três grupos:\n\n— Financeiros: GGR Total (receita bruta gerada), Investimento (total pago aos influencers) e ROI Geral (retorno sobre o investimento).\n\n— Operacionais: Lives realizadas, Horas Realizadas e Influencers Ativos (com ao menos uma live validada).\n\n— Aquisição: Depósitos (quantidade e volume), Registros, Custo por Registro, FTDs e Custo por FTD.",
      },
      {
        subtitulo: "Funil de Conversão",
        texto:
          "Representa a jornada da audiência desde a live até a conversão em jogador ativo.\n\nViews → Acessos → Registros → FTDs\n\nO volume de Views é calculado como a média das médias de views das lives do período. As taxas entre cada etapa mostram onde a audiência está sendo perdida ao longo do funil.",
      },
      {
        subtitulo: "Ranking de Influencers",
        texto:
          "Tabela com o desempenho individual de cada influencer no período: lives, horas, views, acessos, registros, FTDs, GGR, investimento e ROI.\n\nCada influencer recebe uma classificação de performance — Rentável, Atenção, Não Rentável ou Bônus — com base nos resultados do período.",
      },
    ],
  },
  dash_conversao: {
    titulo: "Conversão",
    blocos: [
      {
        texto:
          "Análise detalhada do funil de aquisição gerado pelas lives. Mostra onde a audiência converte — e onde é perdida — para cada influencer no período.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "Mesmos filtros do Overview: navegação por mês, modo Histórico, filtro de influencer e filtro de operadora. Todos os blocos da página respondem aos filtros aplicados.",
      },
      {
        subtitulo: "Comparativo de Funil",
        texto:
          "Permite comparar o funil de conversão de dois influencers lado a lado. Selecione um influencer em cada painel para visualizar:\n\nViews → Acessos → Registros → FTDs\n\nCada etapa exibe o volume absoluto e a taxa de conversão em relação à etapa anterior. As Taxas Chave condensam os indicadores mais relevantes: View→FTD, Acesso→FTD e FTD/Hora.",
      },
      {
        subtitulo: "Ranking FTD/Hora — Eficiência por Influencer",
        texto:
          "Classifica os top 10 influencers pela quantidade de FTDs gerados por hora de live. É o indicador mais direto de eficiência de transmissão — mostra quem converte mais com menos tempo na tela.\n\nInfluencers sem horas registradas são omitidos do ranking.",
      },
      {
        subtitulo: "Comparativo de Taxas e Ações Recomendadas",
        texto:
          "Tabela com as métricas de conversão de todos os influencers do período: views, acessos, registros, FTDs e as taxas entre cada etapa do funil.\n\nA coluna Ação exibe uma recomendação calculada automaticamente pela plataforma com base na etapa do funil que apresenta maior oportunidade de melhoria para cada influencer.",
      },
    ],
  },
  dash_financeiro: {
    titulo: "Dashboard Financeiro",
    blocos: [
      {
        texto:
          "Visão financeira consolidada da operação por influencer. Mostra o comportamento dos jogadores captados — depósitos, saques, GGR e perfil — permitindo avaliar a qualidade e a rentabilidade de cada parceria.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "Mesmos filtros dos demais dashboards: navegação por mês, modo Histórico, filtro de influencer e filtro de operadora.",
      },
      {
        subtitulo: "KPIs Financeiros",
        texto:
          "Indicadores consolidados do comportamento financeiro dos jogadores captados no período, com comparativo MTD em relação ao mês anterior:\n\n— FTD: volume total dos primeiros depósitos realizados, com ticket médio por jogador.\n— Depósitos: volume total depositado no período, com ticket médio.\n— Saques: volume total sacado, com ticket médio.\n— WD Ratio: proporção entre saques e depósitos (saques ÷ depósitos) — quanto menor, mais saudável para a operação.\n— GGR por Jogador: receita bruta média gerada por cada jogador ativo no período.\n— PVI: indicador de qualidade da base de jogadores captados.",
      },
      {
        subtitulo: "Investimento por Influencer",
        texto:
          "Gráfico de distribuição que mostra como o investimento total do período está dividido entre os influencers ativos. Útil para identificar concentração de budget e equilibrar a alocação entre parceiros.",
      },
      {
        subtitulo: "Ranking Financeiro",
        texto:
          "Tabela com a performance financeira detalhada de cada influencer. As colunas incluem: R$ FTD, ticket médio FTD, R$ depósitos, ticket médio depósito, R$ saques, ticket médio saques, R$ GGR, GGR/jogador, WD Ratio, PVI e perfil do jogador.\n\nUse os filtros de perfil para segmentar a análise por tipo de jogador: Whales, Core, Recreativos ou Caçadores de Bônus.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        texto:
          "Calendário completo das lives da operação. Permite visualizar, criar e acompanhar todas as ativações agendadas por influencer, plataforma e operadora.",
      },
      {
        subtitulo: "Visualização do Calendário",
        texto:
          "A agenda pode ser exibida em três modos: Mensal, Semanal ou Diário. Use as setas para navegar entre períodos ou clique em Hoje para voltar à data atual.\n\nCada live é exibida no dia correspondente com seu status identificado por cor: Agendada (roxo), Realizada (verde) e Não Realizada (vermelho).",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Use os filtros no topo para segmentar a visualização por influencer, operadora e plataforma (Twitch, YouTube, Instagram, TikTok ou Kick). Os filtros de status permitem ocultar ou destacar lives por situação.",
      },
      {
        subtitulo: "Criando uma Nova Live",
        texto:
          "Clique em + Nova Live para abrir o modal de criação. Preencha:\n\n— Influencer: selecione o parceiro responsável pela live\n— Data e Horário: quando a live está programada\n— Plataforma: Twitch, YouTube, Instagram, TikTok ou Kick\n— Link: o campo de link é exibido automaticamente para a plataforma selecionada e é obrigatório para salvar a live",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Todos os perfis podem criar lives. Influencers visualizam apenas as próprias lives na agenda — gestores e admins visualizam todas.",
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
          "Combine os filtros para localizar rapidamente qualquer parceiro na base:\n\n— Busca: por nome artístico ou e-mail\n— Status: Ativo, Inativo ou Cancelado\n— Plataforma: Twitch, YouTube, Instagram, TikTok ou Kick\n— Operadora: filtra por relacionamento comercial\n— Cachê por hora: slider para encontrar parceiros dentro de uma faixa de orçamento",
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
          "Exibe quantos prospectos estão cadastrados por plataforma — Twitch, YouTube, Instagram, TikTok e Kick. Útil para identificar gaps de cobertura na estratégia de prospecção.",
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
  dash_overview: {
    titulo: "Overview",
    blocos: [
      {
        subtitulo: "Os dados não estão aparecendo?",
        texto:
          "Verifique se há lives validadas no período selecionado. Sem lives com status \"Realizada\" registradas em Resultados, os KPIs não são calculados.",
      },
      {
        subtitulo: "Os filtros estão retornando dados parciais?",
        texto:
          "Se você tem um perfil com escopo restrito, só visualiza dados dos influencers e operadoras vinculados ao seu acesso. Isso é esperado.",
      },
      {
        subtitulo: "Os valores de comparativo MTD estão zerados?",
        texto:
          "O comparativo só é gerado quando existem dados no mesmo período do mês anterior. Se for o primeiro mês de operação, essa coluna ficará vazia.",
      },
      {
        subtitulo: "O ROI aparece como \"—\"?",
        texto:
          "Isso indica que o investimento registrado é zero. Verifique se o cachê por hora está preenchido no cadastro do influencer e se as lives foram validadas em Resultados.",
      },
      {
        subtitulo: "O GGR está divergente do esperado?",
        texto:
          "Confira se o filtro de operadora está incluindo todas as operadoras relevantes. GGR é consolidado por operadora — um filtro ativo pode estar excluindo parte dos dados.",
      },
    ],
  },
  dash_conversao: {
    titulo: "Conversão",
    blocos: [
      {
        subtitulo: "O funil de um influencer está vazio ou com dados zerados?",
        texto:
          "Verifique se há lives validadas para esse influencer no período selecionado. Sem lives com status \"Realizada\" em Resultados, o funil não é calculado.",
      },
      {
        subtitulo: "A taxa View→Acesso está acima de 100%?",
        texto:
          "Isso é esperado e indica que o número de acessos via link superou a média de views das lives. Ocorre quando o link continua circulando após o encerramento da transmissão.",
      },
      {
        subtitulo: "O influencer não aparece no Ranking FTD/Hora?",
        texto:
          "O ranking exige que horas de live estejam registradas. Verifique se a duração foi preenchida na validação em Resultados.",
      },
      {
        subtitulo: "A coluna Ação está vazia para algum influencer?",
        texto:
          "A recomendação só é gerada quando há dados suficientes no funil. Influencers com poucas etapas preenchidas podem não receber uma ação sugerida.",
      },
      {
        subtitulo: "Os filtros de operadora estão afetando o funil?",
        texto:
          "Sim. Ao filtrar por operadora, apenas os acessos e conversões originados por links daquela operadora são considerados.",
      },
    ],
  },
  dash_financeiro: {
    titulo: "Dashboard Financeiro",
    blocos: [
      {
        subtitulo: "Os KPIs estão zerados ou sem dados?",
        texto:
          "Verifique se há lives validadas no período e se os filtros de influencer e operadora não estão excluindo toda a base. Dados financeiros dependem de jogadores ativos originados pelas ativações.",
      },
      {
        subtitulo: "O WD Ratio está em 0% ou muito baixo?",
        texto:
          "Indica que não houve saques no período — pode ser esperado em meses iniciais de operação ou quando os jogadores ainda estão na fase de depósito.",
      },
      {
        subtitulo: "O WD Ratio está muito alto (próximo ou acima de 100%)?",
        texto:
          "Sinal de atenção: os jogadores estão sacando mais do que depositando. Vale verificar o perfil da audiência captada por cada influencer no Ranking Financeiro.",
      },
      {
        subtitulo: "O GGR por Jogador aparece como \"—\"?",
        texto:
          "Indica que não há jogadores ativos com GGR registrado no período selecionado. Confirme se as operadoras estão com os dados integrados corretamente.",
      },
      {
        subtitulo: "O Ranking Financeiro não exibe todos os influencers esperados?",
        texto:
          "Influencers sem jogadores ativos no período não aparecem na tabela. Use o filtro de operadora para verificar se a segmentação está excluindo algum parceiro.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        subtitulo: "Uma live não aparece no calendário?",
        texto:
          "Verifique se os filtros de influencer, operadora ou plataforma não estão ocultando a live. Influencers só visualizam as próprias lives — se você tem esse perfil e não vê uma live, ela pode ter sido cadastrada com outro influencer.",
      },
      {
        subtitulo: "Não consigo salvar uma nova live?",
        texto:
          "O campo de link é obrigatório. Verifique se o link da plataforma selecionada foi preenchido corretamente antes de confirmar.",
      },
      {
        subtitulo: "A live está no dia errado no calendário?",
        texto:
          "Confirme o fuso horário configurado no perfil. A data e horário exibidos seguem o fuso da plataforma.",
      },
      {
        subtitulo: "O botão + Nova Live não aparece?",
        texto:
          "Verifique se você está logado com um perfil com permissão de criação. Se o botão não aparecer mesmo assim, entre em contato com o administrador da conta.",
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
export default function Ajuda() {
  const { theme: t } = useApp();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey2>("dash_overview");

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
      : CONTEUDO_TROUBLE[paginaSelecionada];

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── Header padrão SectionTitle ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: BRAND.roxo,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <GiHelp size={14} color="#fff" />
        </div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: t.text,
          fontFamily: FONT_TITLE,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Ajuda
        </h1>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 24px 40px" }}>
        Conheça as funcionalidades da plataforma e encontre soluções para problemas comuns.
      </p>

      {/* ── Abas pill padrão ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["conheca", "troubleshooting"] as Aba[]).map((a) => {
          const ativo = aba === a;
          return (
            <button
              key={a}
              onClick={() => setAba(a)}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                border: `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: ativo ? `${BRAND.roxoVivo}22` : (t.inputBg ?? t.cardBg),
                color: ativo ? BRAND.roxoVivo : t.textMuted,
                transition: "all 0.2s",
              }}
            >
              {a === "conheca" ? "Conheça a Plataforma" : "Troubleshooting"}
            </button>
          );
        })}
      </div>

      {/* ── Layout principal ── */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* ── Menu lateral ── */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "16px 12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
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
                    onClick={() => setPaginaSelecionada(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: ativo ? `${BRAND.roxo}18` : "transparent",
                      color: ativo ? BRAND.roxoVivo : t.text,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      fontWeight: ativo ? 700 : 500,
                      border: ativo ? `1px solid ${BRAND.roxoVivo}55` : "1px solid transparent",
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
                      background: ativo ? `${BRAND.roxo}30` : `${t.textMuted}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={11} color={ativo ? BRAND.roxoVivo : t.textMuted} />
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Área de conteúdo ── */}
        <div style={{
          flex: 1,
          minWidth: 300,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "28px 32px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
          {dadosConteudo ? (
            <>
              {/* Título da seção */}
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
                  background: `linear-gradient(90deg, ${BRAND.roxo}, ${BRAND.azul})`,
                  borderRadius: 2,
                }} />
              </div>

              {/* Blocos de conteúdo */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {dadosConteudo.blocos.map((bloco, i) => (
                  <div key={i}>
                    {"subtitulo" in bloco && bloco.subtitulo && (
                      <p style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        color: BRAND.roxoVivo,
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
            /* ── Empty state ── */
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
                background: `${BRAND.roxo}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <GiHelp size={22} color={BRAND.roxoVivo} />
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
    </div>
  );
}
