import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC, FONT, FONT_TITLE } from "../../../constants/theme";
import { MENU } from "../../../constants/menu";
import { AbaGlossario } from "./GlossarioPanel";
import type { PageKey } from "../../../types";
import { HelpCircle, BookOpen, LifeBuoy, BookMarked } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { PageHeader } from "../../../components/PageHeader";
import { PAGE_HEADER_ICON_PROPS } from "../../../lib/pageHeaderStyles";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";

type Aba = "conheca" | "troubleshooting" | "glossario";

function podeVerPaginaNoMenu(cv: string | null | undefined): boolean {
  return cv === "sim" || cv === "proprios";
}

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
// Handoffs de seção (ex.: Dashboards, Lives): fundir aqui texto legado útil + itens novos do handoff,
// estendendo subtítulos existentes — evitar blocos duplicados; não descartar o handoff só porque Ajuda é antiga.
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
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
          "Use as setas para navegar entre os meses disponíveis. O botão Histórico exibe o acumulado de todo o período — nesse modo a navegação de mês fica desativada e os subtítulos dos blocos principais passam a mostrar \"acumulado\" (o comparativo MoM do mês anterior deixa de aparecer nos KPIs Executivos).\n\nO filtro de influencer restringe todas as abas ao influencer selecionado. O filtro de operadora restringe aos influencers vinculados àquela plataforma. Ambos os filtros são aplicados simultaneamente em todas as abas ao trocar de aba.\n\nEnquanto uma aba carrega dados, a barra de filtros pode exibir \"Carregando...\" — os filtros permanecem os mesmos ao mudar entre Overview, Conversão e Financeiro.\n\nCom o foco em uma aba, use as setas ← → do teclado para alternar entre Overview, Conversão e Financeiro (padrão de acessibilidade com role=\"tablist\").",
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
          "Tabela com os resultados separados por tipo de jogo — Blackjack (verde), Roleta (vermelho), Baccarat (azul) e Futebol Brasileiro (amarelo). Selecione quais KPIs exibir pelos botões 'KPIs visíveis'. O percentual abaixo de cada valor indica a participação daquele jogo no total do período (coluna Total alinhada ao resumo diário oficial).\n\nNo mês corrente, a evolução é dia a dia; no Histórico, o subtítulo da seção é \"mês a mês\" e cada linha representa um mês. Alterne para o modo Gráfico para visualizar a evolução temporal de um único KPI por jogo.",
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
          "O dashboard de Mídias Sociais consolida o desempenho orgânico dos canais da Spin Gaming (Instagram, Facebook, YouTube) e os resultados de conversão das campanhas com UTMs mapeadas. Está dividido em três abas: Overview, Conversão e Alcance.",
      },
      {
        subtitulo: "Filtros e Navegação",
        texto:
          "Use as setas para navegar entre os meses disponíveis desde Janeiro de 2026, quando os dados de mídias sociais passaram a ser registrados. O botão Histórico exibe o acumulado de todo o período disponível.\n\nAs três abas (Overview, Conversão, Alcance) compartilham o mesmo período. Com o foco em uma aba, use ← → do teclado para alternar (tablist).",
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
          "O botão Excluir aparece para perfis com permissão de exclusão. Para evitar exclusões acidentais, é necessário clicar duas vezes — o primeiro clique transforma o botão em 'Confirmar?', e o segundo executa a exclusão. Clicar fora do botão cancela a operação.",
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
          "Os quatro cards no topo mostram a distribuição dos prospectos por etapa:\n\n— Visualizado: primeiro contato identificado, informações básicas coletadas\n— Contato: negociação em andamento, dados de contato registrados\n— Negociação: proposta enviada, cachê em discussão\n— Fechado: parceria confirmada — o prospecto vira influencer ativo na plataforma\n\nA grade Cobertura de Plataformas (logo abaixo) lista cada canal com a contagem de prospectos. Cada célula é um botão de filtro: clique para restringir a lista àquela plataforma; clique de novo para limpar. Esse filtro é independente dos chips de Status do bloco de filtros inferior.\n\nAtenção: na vista padrão, prospectos com status Fechado não aparecem na lista. Para visualizá-los, selecione explicitamente o filtro 'Fechado' nos chips de Status.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "No bloco inferior, combine:\n\n— Status: chips Visualizado, Contato, Negociação, Fechado\n— Cachê por Hora — até: slider até o maior cachê cadastrado\n— Views — até: slider até o maior volume de views cadastrado\n— Busca: por nome artístico ou e-mail\n\nO botão Limpar filtros aparece automaticamente quando há qualquer filtro ativo (inclui filtro de plataforma da Cobertura).",
      },
      {
        subtitulo: "Card de Prospecto",
        texto:
          "Cada card exibe nome artístico, StatusBadge com dropdown para alterar a etapa do funil, plataformas com métricas inline e badges de informações adicionais.\n\nAs métricas variam por plataforma: YouTube, Twitch, Kick e TikTok mostram Média de Views; Instagram, Discord, WhatsApp e Telegram mostram Seguidores.\n\nBadges adicionais aparecem quando informados: tag da operadora vinculada, valor do cachê negociado e 'Live Cassino' quando o prospecto já realiza ou tem histórico de lives de cassino.",
      },
      {
        subtitulo: "Cadastrando e Editando um Prospecto",
        texto:
          "Clique em Novo Influencer (botão com ícone + e gradiente de criação) para registrar um novo prospecto. O formulário tem Nome Artístico e Status no topo, mais três abas (tablist acessível — Contato, Canais, Anotações). Pressione Esc para fechar o modal.\n\n— Contato: Tipo de Contato (Agente, Plataforma ou Direto), Nome do Agente (quando tipo for Agente), Telefone, Cachê Negociado, Live Cassino (Sim/Não), E-mail e Operadora\n— Canais: toggle de plataformas ativas. Cada plataforma ativa exige link e métrica correspondente (Views ou Seguidores conforme a plataforma). Abaixo, seleção de Categorias em multi-seleção: Vida Real, Jogos Populares, Variedades, Esportes, Cassino\n— Anotações: campo para nova anotação com botão 'Adicionar Anotação' e histórico de todas as anotações anteriores com usuário e data de registro",
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
  gestao_dealers: {
    titulo: "Gestão de Dealers",
    blocos: [
      {
        texto:
          "Catálogo central do elenco de dealers de casino ao vivo da Spin Gaming. Reúne o cadastro completo de cada dealer — fotos, especialidades por jogo, turno, gênero e operadora vinculada — e centraliza as solicitações de troca ou feedback enviadas pelas operadoras ao estúdio.",
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
        subtitulo: "Cadastrando e Editando um Dealer",
        texto:
          "Gestores e administradores com permissão de criação encontram o botão '+ Adicionar Dealer' no topo da página. O formulário requer nome real, nickname, pelo menos um jogo de especialidade e gênero.\n\nO campo Fotos aceita múltiplas imagens de uma vez — elas ficam disponíveis no carrossel do card e no modal Ver. Para remover uma foto já enviada, clique no ícone de exclusão sobre a miniatura.\n\nO campo Status (Aprovado / Pendente) aparece apenas ao editar dealers já cadastrados — novos dealers entram como Aprovado por padrão. O campo VIP marca o dealer com o badge de destaque na listagem.\n\nA operadora pode ser travada automaticamente quando o usuário tem escopo restrito a uma única parceira — nesse caso, o campo aparece preenchido e bloqueado para edição.",
      },
      {
        subtitulo: "Visibilidade por Perfil",
        texto:
          "— Gestor / Admin: acesso completo ao elenco de todas as operadoras. Pode criar, editar e visualizar qualquer dealer. Visualiza o histórico de solicitações de todas as operadoras.\n— Operador: visualiza apenas os dealers vinculados à sua operadora. Pode solicitar trocas ou deixar feedbacks. Não tem acesso ao botão Editar.\n— Executivo: visualização completa, sem ações de escrita.\n\nO botão Solicitar só aparece quando a operadora ativa está definida no escopo do usuário. O botão Histórico aparece para qualquer perfil com permissão de visualização na Central de Notificações.",
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
          "No topo, cinco cards (formato Financeiro — rótulo em caixa alta acima do valor) mostram **TOTAL DE PEÇAS**, **DISPONÍVEIS**, **EMPRESTADAS**, **FIXOS** e **EM MANUTENÇÃO**; os números refletem os filtros ativos.\n\nAbaixo, a barra de filtros (sem título de secção) reúne operadora, categoria, tamanho, pesquisa, bipagem e abas de status.",
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
          "Ao cadastrar uma nova peça, o código é gerado automaticamente pelo sistema. Selecione as operadoras vinculadas à peça (pode ser mais de uma), a categoria, o tamanho e a data de entrada. Após salvar, o sistema exibe o código de barras gerado e permite baixar a etiqueta em PDF para impressão.",
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
          "Repositório de materiais ao vivo por operadora: campanhas com vigência e blocos de roteiro (Abertura, Durante o jogo e Fechamento) com scripts, orientações e alertas. O conteúdo alimenta a Central de Notificações — operadores veem campanhas vigentes e podem abrir conversas com o estúdio quando há solicitação vinculada.",
      },
      {
        subtitulo: "Filtros e operadora",
        texto:
          "Selecione a operadora na barra superior (quando o perfil tem acesso a mais de uma). Sem operadora selecionada, a página orienta a escolha antes de exibir blocos.\n\nFiltros de Jogo (Todos, Blackjack, Roleta, Baccarat, Futebol Brasileiro) e Tipo (Script, Orientação, Alerta) refinam as sugestões dentro de cada bloco — não afetam o bloco de Campanhas.\n\nEm telas estreitas, os chips de filtro podem rolar horizontalmente; use o gesto de arrastar ou as setas do touchpad para ver todas as opções.",
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
          "O acesso é controlado em Gestão de Usuários → Permissões para a página Roteiro de Mesa. Criação, edição e exclusão dependem de can_criar, can_editar e can_excluir. Sem permissão de edição, a página funciona em modo consulta — visualização dos blocos e campanhas da operadora no escopo.",
      },
    ],
  },
  playbook_influencers: {
    titulo: "Playbook — Influencers",
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
        subtitulo: "Permissões",
        texto:
          "A visualização da Spin na Rede está disponível para todos os perfis que têm acesso à seção Conteúdo. Não há ações de escrita nesta página — é exclusivamente de leitura.",
      },
    ],
  },
  informativos: {
    titulo: "Informativos",
    blocos: [
      {
        texto:
          "A página Informativos permite criar avisos direcionados a um ou mais perfis da plataforma. O conteúdo publicado é exibido na Home dos utilizadores cujo perfil foi selecionado na postagem.",
      },
      {
        subtitulo: "Aba Informativos",
        texto:
          "Lista os informativos já publicados, filtrados por mês (data de postagem), modo Histórico (todo o período) e busca por palavras-chave no assunto ou na descrição.",
      },
      {
        subtitulo: "Gerenciamento de Informativos",
        texto:
          "Visível apenas para quem tem permissão de editar nesta página. Inclui tabela com todos os status (rascunho, aprovação, publicado, arquivado), filtros de status, carrossel de mês, Histórico e ações por linha: editar, aprovar, arquivar (dois cliques), histórico de alterações e excluir (quando liberado). Use Novo Informativo para criar; no modal informe assunto, descrição com formatação e os perfis que verão o aviso na Home. Ao marcar o perfil Operador, escolha também a operadora de destino (operadoras com status Ativa em Gestão de Operadoras) ou a opção Todos.\n\nPublicação direta só quando o informativo for apenas para perfis internos operacionais (Gestor, RH, Prestadores, etc.). Se incluir Administrador, Executivo, Operador, Agência, Influencer, Afiliado ou Investidor, use apenas Enviar para aprovação. Quem pode aprovar depende dos perfis alvo; apenas Administradores podem aprovar a própria postagem — os demais precisam de outro utilizador.",
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
          "Disponível apenas para usuários com permissão de editar no Portal de RH.\n\nA aba exibe uma tabela com todas as postagens (comunicados, políticas e RH Talks), incluindo arquivadas, com colunas de assunto, autor, tipo, datas e status.\n\nAções disponíveis por status:\n— Rascunho: Editar\n— Em aprovação: Editar, Aprovar\n— Publicado: Arquivar (dois cliques para confirmar)\n— Qualquer status: ver Histórico de alterações (registro de alterações da postagem, na linha da tabela)\n\nO carrossel de mês e o botão Histórico usam a data de publicação. O Histórico na barra mostra todas as postagens de todos os meses; o filtro Status da postagem (incluindo Arquivado) define o que aparece na tabela. Use também os filtros de tipo e a busca por palavras-chave. Clique em Nova Postagem para redigir um novo conteúdo.",
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
          "No bloco **Solicitações** (título de secção padrão), a tabela lista os pedidos em aberto (Solicitado ou Aprovado). Cada linha exibe o influencer, seu perfil (Ativo/Inativo/Cancelado), o ID da conta na operadora, o CPF mascarado — clique no ícone de olho para revelar temporariamente —, o valor e o status atual.\n\nInfluencers e agências podem criar novas solicitações pelo botão **Solicitar Banca** na mesma linha do título (ícone + no padrão de criação da plataforma). Para concluir o cadastro ou aceitar o Playbook, o sistema exibe um aviso e bloqueia a solicitação até que a pendência seja resolvida.\n\nPerfis de gestão interna podem Aprovar, Recusar ou Liberar cada solicitação. A ação de Excluir é irreversível e exige confirmação.",
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
          "Alteração de status (Ativo/Inativo/Cancelado) é restrita a Gestores e Admin. Afiliados visualizam e editam apenas seu próprio perfil. Operadores visualizam apenas os afiliados de sua operadora.",
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
          "Com permissão de criar, use **Novo Afiliado** (botão com ícone + e gradiente de criação) na barra de filtros para abrir o cadastro de prospecto.\n\nCada card exibe nome, status do funil e uma prévia do campo Operação (truncado em 2 linhas). O botão Ver abre o modal de visualização completa. O botão Editar abre o formulário de edição. Pressione Esc para fechar qualquer modal.",
      },
      {
        subtitulo: "Cadastro e Edição",
        texto:
          "O formulário é organizado em abas (Contato, Operação, Anotações), com navegação por teclado (← →) e Esc para fechar.\n\n— Contato: e-mail, telefone, tipo de contato (Direto, Agência, Site Spin), Live Cassino e operadora\n— Operação: descrição livre das atividades\n— Anotações: histórico (salvo com 'Adicionar Anotação', não no Salvar principal)\n\nEnquanto o registro não tiver usuário na plataforma, o modal exibe aviso de que e-mail e operadora serão obrigatórios ao salvar. Depois da criação, e-mail e operadora ficam bloqueados.",
      },
      {
        subtitulo: "Criação de usuário na plataforma",
        texto:
          "Sempre que você salva um prospecto (novo ou existente) que ainda não tem usuário na plataforma, o sistema exige e-mail e operadora e aciona a criação automática do perfil Afiliado, do cadastro de perfil e do vínculo com a operadora — em qualquer status do funil, não só em Fechado.\n\nO botão exibe 'Salvando...' durante o processo. Se a criação falhar, o prospecto permanece salvo no Network e uma mensagem vermelha descreve o erro (ex.: e-mail já cadastrado). Após sucesso, o parceiro aparece em Afiliados e pode receber e-mail de boas-vindas quando o envio estiver configurado.",
      },
      {
        subtitulo: "Anotações",
        texto:
          "Cada prospecto tem um histórico de anotações com autoria e data. Anotações são salvas individualmente ao clicar em 'Adicionar Anotação' — não fazem parte do botão Salvar principal. O histórico fica disponível tanto no modal de visualização quanto no de edição.",
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
          "O bloco **Ciclo de pagamento** (título de secção padrão) reúne o seletor de ciclo, ações e a tabela. Selecione um ciclo pelo dropdown para ver os pagamentos daquela semana. O ciclo atual aparece com a tag Atual e exibe uma prévia em tempo real — os valores são estimativas calculadas a partir das lives realizadas e dos cachês cadastrados. Os pagamentos definitivos são gerados ao encerrar o ciclo.\n\nNo ciclo fechado, a tabela exibe colunas de status e ação. Perfis com permissão de edição podem analisar (aprovar ou ajustar o valor) e registrar pagamentos. Um indicador na tabela mostra a data do pagamento quando o status é Pago.",
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
          "A página Campanhas permite cadastrar as campanhas de mídia social utilizadas nas ações de marketing da plataforma. Cada campanha pode ser vinculada a uma operadora específica ou permanecer genérica. Os UTMs mapeados na Gestão de Links que são associados a uma campanha alimentam automaticamente o Dashboard de Mídias com dados de funil e performance.",
      },
      {
        subtitulo: "Indicadores de Resumo",
        texto:
          "Três cards no topo (formato Financeiro/Banca de Jogo — rótulo em caixa alta acima do valor): **TOTAL**, **ATIVAS** e **INATIVAS**. Os valores se atualizam imediatamente após qualquer criação, edição ou exclusão.",
      },
      {
        subtitulo: "Tabela de Campanhas",
        texto:
          "Lista todas as campanhas ordenadas pelo campo selecionado. Colunas disponíveis: Nome, Operadora, Status (Ativa/Inativa) e data de criação.\n\nO botão Editar abre o formulário preenchido com os dados atuais da campanha, permitindo alterar o nome, a operadora e o status. O botão Excluir remove a campanha permanentemente — os vínculos com UTMs mapeados na Gestão de Links são desfeitos automaticamente, mas os dados históricos de performance permanecem nos dashboards.",
      },
      {
        subtitulo: "Criando uma Campanha",
        texto:
          "No bloco **Campanhas cadastradas**, use **Nova Campanha** na mesma linha do título (ícone + no padrão de criação) para abrir o formulário. O nome é obrigatório; a operadora é opcional — use quando a campanha for específica para uma plataforma. Novas campanhas são criadas como Ativas por padrão.\n\nAo editar, o campo Status permite marcar a campanha como Inativa. UTMs já mapeados permanecem vinculados mesmo após a inativação — a campanha inativa apenas deixa de aparecer como opção ao mapear novos links.",
      },
    ],
  },
  gestao_operadoras: {
    titulo: "Gestão de Operadoras",
    blocos: [
      {
        texto:
          "Página de acesso restrito a administradores. Centraliza o cadastro e a configuração das operadoras parceiras da Spin Gaming, incluindo identidade visual (brandguide), status de operação e horários de turno.",
      },
      {
        subtitulo: "Lista de operadoras",
        texto:
          "Exibe todas as operadoras cadastradas com status (Ativa ou Inativa), slug interno e data de criação. Os cards de resumo no topo mostram os totais. A tabela permite ordenação por qualquer coluna.",
      },
      {
        subtitulo: "Cadastrar ou editar operadora",
        texto:
          "Ao criar ou editar, o modal abre com três abas:\n— Dados cadastrais: nome, identificador interno (gerado automaticamente) e status de ativação.\n— Brandguide: cores de marca, logo e fonte customizada para whitelabel.\n— Operações (só na edição): horários de turno dos dealers e lista de mesas cadastradas.\n\nUma operadora só pode ser ativada quando tiver pelo menos uma mesa registrada na Gestão de Mesas. Novas operadoras são criadas como inativas.",
      },
      {
        subtitulo: "Excluir operadora",
        texto:
          "A exclusão permanente só é possível quando não existirem registros vinculados (mesas, escalas, RH). Para remover o acesso sem perder histórico, desative a operadora em vez de excluir.",
      },
    ],
  },
  gestao_mesas: {
    titulo: "Gestão de Mesas",
    blocos: [
      {
        texto:
          "Cadastro e manutenção das mesas físicas de cada operadora. As mesas cadastradas aqui são referência para a programação de lives, escalas de dealers e relatórios de performance.",
      },
      {
        subtitulo: "Filtros e navegação",
        texto:
          "No topo, use as setas do carrossel para alternar a operadora exibida ou o botão **Todas Operadoras** para ver todas de uma vez. Os cards de resumo (Baccarat, Blackjack, Roleta e Futebol Brasileiro) atualizam conforme o filtro ativo. A tabela pode ser ordenada por qualquer coluna clicando no cabeçalho.",
      },
      {
        subtitulo: "Cadastrar ou editar mesa",
        texto:
          "Cada mesa exige: operadora, nome, tipo de jogo, número da mesa, ID interno Spin e ID da mesa no catálogo da operadora. O ID Spin não pode ser alterado após o cadastro — exclua e recadastre se estiver incorreto. Para tipos de jogo não listados, selecione 'Outro' e especifique.",
      },
    ],
  },
  status_tecnico: {
    titulo: "Status Técnico",
    blocos: [
      {
        texto:
          "Página restrita a administradores. Centraliza o monitoramento das integrações de dados da plataforma, exibe alertas automáticos, logs de erro recentes e gerencia as redes autorizadas para check-in de prestadores.",
      },
      {
        subtitulo: "Painel de integrações",
        texto:
          "Exibe o status de cada pipeline de dados (CDA, Social Media, Spin na Rede RSS, Lobby, e-mails) com o horário do último sync, volume de registros processados hoje e contagem de erros. Administradores podem disparar sincronizações manuais diretamente pela tabela — todas as ações exigem confirmação antes de executar.",
      },
      {
        subtitulo: "Fluxo de dados",
        texto:
          "Gráfico de barras empilhadas com os últimos 14 dias. Cada cor representa uma fonte de dados. Passe o cursor sobre uma barra para ver o detalhamento por fonte naquele dia.",
      },
      {
        subtitulo: "Alertas automáticos",
        texto:
          "A plataforma detecta automaticamente condições anômalas: syncs atrasados (> 24h ou > 36h), taxas de erro acima de 5%, e e-mails operacionais não enviados no dia. Alertas em vermelho indicam falha; em amarelo, atenção.",
      },
      {
        subtitulo: "Redes permitidas — Check-in de prestadores",
        texto:
          "Gerencia os prefixos de rede CIDR autorizados para registro de ponto dos prestadores. O check-in fica bloqueado para qualquer IP que não esteja coberto por pelo menos um CIDR configurado. Administradores podem adicionar prefixos com o botão **Nova Rede** (ícone + e gradiente de criação) ou remover prefixos na tabela.",
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

// ─── Conteúdo: Troubleshooting ────────────────────────────────────────────────
const CONTEUDO_TROUBLE: Record<string, { titulo: string; blocos: { subtitulo: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        subtitulo: "Os dados mudaram ao trocar de aba, mas eu não alterei os filtros?",
        texto:
          "Comportamento esperado: todas as abas compartilham os mesmos filtros, mas cada uma busca seus dados de forma independente ao ser carregada pela primeira vez. O indicador 'Carregando...' na barra de filtros indica que a aba atual ainda está buscando os dados. Aguarde o término do carregamento. Use ← → do teclado nas abas quando o foco estiver na tablist.",
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
        subtitulo: "O PVI está como 0 ou parece inconsistente?",
        texto:
          "O PVI (Player Value Index) é calculado com base em três componentes: ticket médio de depósito, GGR por jogador e WD Ratio. Se qualquer um desses dados for zero (ex.: influencer sem depósitos registrados), o PVI não pode ser calculado corretamente e pode aparecer baixo ou zerado. Isso é esperado para influencers com poucos FTDs no período.",
      },
      {
        subtitulo: "Os KPIs mostram valores diferentes entre Overview e Financeiro?",
        texto:
          "As abas usam fontes de dados parcialmente diferentes: Financeiro usa um procedimento otimizado do banco para meses fechados, e cai no modo de busca linha a linha para o mês atual (MTD). Para meses passados fechados os valores devem ser idênticos. Se houver divergência em meses fechados, entre em contato com o suporte informando o mês e os valores observados.",
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
          "O Comparativo de Mesa só é exibido quando uma operadora específica está selecionada (não com **Todas Operadoras** no filtro). Selecione uma operadora no filtro e verifique se há dados de mesa individuais cadastrados para o período. Se não houver registros de mesas individuais (somente resumo diário), a seção permanece vazia.",
      },
      {
        subtitulo: "A aba Posicionamento não carrega ou aparece vazia?",
        texto:
          "O Posicionamento exibe dados do dia atual. Se o monitoramento automático ainda não executou hoje (acontece em horários específicos ao longo do dia), os dados podem não estar disponíveis. Verifique o horário exibido em 'Última atualização' — se indicar um horário de ontem, aguarde a próxima execução. Se o campo não aparecer, selecione uma operadora específica no filtro: **Todas Operadoras** na aba Posicionamento exibe ambas simultaneamente (Blaze e Casa de Apostas).",
      },
      {
        subtitulo: "Os dados do Histórico parecem diferentes do mês selecionado individualmente?",
        texto:
          "O Histórico agrega todos os meses disponíveis desde o início da operação. Algumas métricas como UAP e ARPU são calculadas de forma diferente: no modo Histórico, o UAP exibido no KPI é a média mensal dos períodos, não a soma. Isso é esperado — UAP é uma métrica de período, não acumulável. Para ver o UAP exato de um mês específico, navegue até aquele mês sem ativar o Histórico.",
      },
      {
        subtitulo: "O modo gráfico do Detalhamento mostra barras muito pequenas para uma operadora?",
        texto:
          "No gráfico por operadora, cada plataforma é representada por uma barra separada no mesmo dia. Se uma operadora tem volume muito menor que outra, as barras ficam proporcionalmente pequenas. Isso é comportamento correto — use a tabela para ver os valores exatos. Alterne para o modo Tabela clicando no botão 'Tabela' no canto superior direito da seção.",
      },
      {
        subtitulo: "Não consigo selecionar operadoras no filtro?",
        texto:
          "O filtro de operadoras é exibido apenas para usuários com permissão de visualização multi-operadora. Se o seletor não aparecer, seu perfil de acesso está restrito a uma operadora específica, e os dados já estão filtrados automaticamente. Isso é configurado pelo administrador da plataforma.",
      },
    ],
  },
  dash_midias_sociais: {
    titulo: "Mídias Sociais",
    blocos: [
      {
        subtitulo: "Não aparecem dados no Overview mesmo com o mês selecionado?",
        texto:
          "O Overview exibe dados de campanhas com UTMs mapeadas. Se nenhuma campanha tiver UTMs vinculadas no período, as tabelas ficam vazias e os KPIs mostram zero. Verifique se as campanhas estão ativas e com UTMs cadastradas em Marketing → Gestão de Links. O dashboard de Mídias Sociais só exibe dados de tráfego originado por links rastreados.",
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
          "Apenas campanhas com pelo menos uma UTM mapeada e tráfego registrado no período aparecem na tabela. Campanhas criadas mas sem UTMs vinculadas ou sem acessos no período não aparecem. Para verificar as UTMs cadastradas, acesse Marketing → Gestão de Links.",
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
  agenda: {
    titulo: "Agenda",
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
        subtitulo: "A live foi salva mas não aparece para minha operadora?",
        texto:
          "Novas lives recebem a operadora do primeiro vínculo ativo do influencer. Se a live não aparece no seu escopo, verifique em Influencers → Operadoras se o vínculo correto está ativo e em primeiro lugar, ou peça a um Gestor/Admin para ajustar a live.",
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
          "Na página de Resultados, o botão Excluir aparece apenas para lives ainda com status Agendada (as que aguardam validação), para perfis com permissão — com confirmação em dois cliques. Lives já validadas não são excluídas aqui; edição ou exclusão segue as regras da Agenda (Admin e Gestor para lives Realizada/Não Realizada).",
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
  gestao_dealers: {
    titulo: "Gestão de Dealers",
    blocos: [
      {
        subtitulo: "Um dealer não aparece na listagem?",
        texto:
          "Verifique se há filtros ativos — turno, gênero, jogo ou operadora podem estar restringindo a listagem. O bloco consolidado exibe a contagem filtrada; compare com o total sem filtros para confirmar.\n\nO campo de busca aceita nome real e nickname. Se a busca estiver preenchida, ela se aplica em conjunto com os demais filtros — limpe o campo para ver todos os dealers do filtro atual.\n\nPara perfis com escopo de operadora restrito, apenas os dealers vinculados àquela operadora aparecem na listagem — isso é comportamento esperado.",
      },
      {
        subtitulo: "O botão Solicitar não aparece no card?",
        texto:
          "O botão Solicitar só é exibido para o perfil Operador e apenas quando a operadora ativa está definida no escopo do usuário. Se o botão não aparece, verifique:\n\n— Se o usuário tem o perfil Operador configurado na Gestão de Usuários.\n— Se o escopo de operadora está atribuído corretamente ao usuário.\n— Se o filtro de operadora na página está definido para a operadora do escopo — quando o usuário tem acesso a mais de uma, a operadora precisa estar selecionada no filtro para que o botão apareça.",
      },
      {
        subtitulo: "O botão Histórico não aparece?",
        texto:
          "O botão Histórico requer permissão de visualização na Central de Notificações (configurada em Gestão de Usuários → Permissões). Verifique se a permissão de visualização para a página 'Central de Notificações' está ativa no perfil do usuário.\n\nPara o perfil Operador, o Histórico também exige que a operadora ativa esteja definida no escopo — sem ela, o botão não é renderizado.",
      },
      {
        subtitulo: "Não consigo editar um dealer?",
        texto:
          "O botão Editar aparece apenas para perfis com permissão de edição configurada em Gestão de Usuários. Verifique se a permissão 'can_editar' está ativa para a página 'Gestão de Dealers'.\n\nPara perfis com edição restrita a 'próprios', o botão só aparece em dealers vinculados a operadoras dentro do escopo do usuário. Dealers sem operadora ou de outras operadoras não exibem o botão Editar.",
      },
      {
        subtitulo: "Não consigo salvar um dealer — aparece mensagem de erro?",
        texto:
          "Verifique os campos obrigatórios:\n\n— Nome real: não pode estar em branco.\n— Nickname: não pode estar em branco.\n— Jogos: pelo menos um jogo de especialidade deve ser selecionado.\n\nSe o upload de foto falhar, o erro indicará o motivo. Confirme se o bucket 'dealer-photos' existe e está configurado no Supabase Storage. O erro pode ocorrer também por limite de tamanho de arquivo — tente com imagens menores.",
      },
      {
        subtitulo: "A foto enviada não aparece no card?",
        texto:
          "Após o upload, a URL da foto é armazenada no campo 'fotos' do dealer. Se a foto não aparece após salvar, verifique:\n\n— Se o upload foi concluído antes de clicar em Salvar — o indicador 'Enviando...' deve ter desaparecido.\n— Se a URL gerada pelo Storage é pública. Acesse o Supabase → Storage → dealer-photos e confirme que o bucket está configurado como público.\n— Fotos enviadas mas não salvas (modal fechado antes do Salvar) são perdidas — o upload ocorre no Storage mas a URL não é vinculada ao dealer.",
      },
      {
        subtitulo: "O histórico de solicitações do dealer está vazio?",
        texto:
          "O modal de Histórico exibe solicitações registradas na tabela 'dealer_solicitacoes' para aquele dealer. Se estiver vazio, significa que nenhuma solicitação foi criada para esse dealer ainda — isso é comportamento esperado para dealers recém-cadastrados ou sem interação da operadora.\n\nPara o perfil Operador, o Histórico é filtrado pela operadora do escopo — solicitações de outras operadoras para o mesmo dealer não são exibidas.",
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
          "O badge exibe apenas solicitações abertas (pendente ou em andamento) onde o campo 'aguarda_resposta_de' está definido como 'gestor' — ou seja, a bola está com o estúdio. Solicitações em andamento mas aguardando resposta da operadora não são contabilizadas no badge.\n\nSe o número parece desatualizado, recarregue a página — a contagem é calculada no momento do carregamento dos dados e não atualiza em tempo real nessa visualização.",
      },
      {
        subtitulo: "Não consigo responder na thread?",
        texto:
          "O campo de texto e o botão de envio só aparecem quando:\n\n— A solicitação está com status diferente de 'resolvido' ou 'cancelado'.\n— O perfil tem permissão de edição ativa na Central de Notificações (Gestão de Usuários → Permissões → can_editar).\n\nSe a thread abre em modo somente leitura com a mensagem 'Sem permissão para responder nesta página', verifique a configuração de permissão na Gestão de Usuários.",
      },
      {
        subtitulo: "A campanha não aparece para o Operador?",
        texto:
          "As campanhas exibidas para operadores vêm da tabela 'roteiro_mesa_campanhas' filtradas pela operadora do escopo e pelo período selecionado. Se uma campanha não aparece:\n\n— Verifique se a campanha foi cadastrada com a operadora correta no módulo Roteiro de Mesa.\n— Confirme que as datas de início e fim da campanha estão dentro do período selecionado na Central.\n— Ative o Histórico para ver campanhas fora do mês atual.\n— Verifique se o filtro de operadora na barra superior corresponde à operadora vinculada à campanha.",
      },
      {
        subtitulo: "O botão 'Marcar como resolvido' não aparece na thread?",
        texto:
          "O botão de resolução só é exibido para perfis Staff (admin, gestor ou executivo) com permissão de edição ativa. Perfis Operador não têm acesso a essa ação — operadores podem enviar mensagens mas não podem encerrar solicitações.\n\nSe você é Gestor e o botão não aparece, verifique se a permissão 'can_editar' está ativa para a Central de Notificações na Gestão de Usuários.",
      },
      {
        subtitulo: "O banner de pendências na Gestão de Dealers não aparece?",
        texto:
          "O banner amarelo de pendências (componente BannerPendencias) só é exibido para o perfil Operador quando há solicitações com 'aguarda_resposta_de = operadora' em aberto. Verifique:\n\n— Se o usuário tem o perfil Operador configurado.\n— Se há solicitações abertas aguardando resposta da operadora — o banner não aparece quando todas as solicitações estão aguardando o estúdio.\n— O banner monitora em tempo real via realtime do Supabase. Se a conexão realtime estiver instável, o banner pode não atualizar automaticamente — recarregue a página para forçar a leitura.",
      },
      {
        subtitulo: "As solicitações concluídas não aparecem na seção de histórico?",
        texto:
          "A seção 'Solicitações concluídas' exibe itens com status 'resolvido' cuja data de resolução está dentro do período selecionado. Se o período estiver no mês atual e as resoluções ocorreram em meses anteriores, os itens não aparecerão — ative Histórico para ver o acumulado completo.\n\nA seção só é exibida para o perfil Operador. Para Gestores, os itens resolvidos aparecem dentro das próprias abas do inbox, mesclados com os abertos.",
      },
    ],
  },
  rh_figurinos: {
    titulo: "Figurinos",
    blocos: [
      {
        subtitulo: "A câmera não abre ao clicar em Bipar código?",
        texto:
          "O navegador precisa de permissão para acessar a câmera. Verifique se a permissão foi concedida — na barra do navegador deve aparecer um ícone de câmera. Se negado, recarregue a página e permita o acesso quando solicitado. Em dispositivos sem câmera, use o campo de texto manual abaixo do leitor para digitar o código.",
      },
      {
        subtitulo: "O código bipado retornou 'não reconhecido'?",
        texto:
          "O código pode não estar cadastrado no sistema ou pode ter sido lido incorretamente. Tente digitar o código manualmente no campo abaixo do leitor. Certifique-se de que o código começa com 'FIG-' (ex: FIG-000003). Se o código foi cadastrado recentemente, aguarde alguns segundos e tente novamente.",
      },
      {
        subtitulo: "O prestador não aparece na lista de retirada?",
        texto:
          "A lista de prestadores vem da página Gestão de Prestadores e exibe apenas funcionários com status Ativo ou Indisponível. Se o prestador não aparece, verifique se ele está cadastrado e ativo na Gestão de Prestadores. Funcionários com status Inativo ou Desligado não são exibidos.",
      },
      {
        subtitulo: "Os botões Retirada e Manutenção não aparecem na tabela?",
        texto:
          "Esses botões exigem permissão de edição na página Figurinos. Se você não os vê, sua conta está configurada apenas para visualização. Solicite ao administrador a liberação de permissão de edição.",
      },
      {
        subtitulo: "A peça está na aba errada ou não aparece?",
        texto:
          "Verifique se os filtros de operadora, categoria ou tamanho estão ativos — eles restringem o que aparece em todas as abas. Clique em **Todas Operadoras**, **Todas as categorias** e **Todos os tamanhos** para ver o inventário completo. Cada aba exibe apenas peças com o status correspondente.",
      },
      {
        subtitulo: "A etiqueta PDF não baixou depois de cadastrar a peça?",
        texto:
          "O download da etiqueta é opcional — você pode fechar o modal e baixar depois pelo botão Baixar etiqueta nos detalhes da peça. Para acessar os detalhes, clique no código da peça (ex: FIG-000003) na tabela. Se o download falhar mesmo tentando, verifique se o bloqueador de pop-ups do navegador está impedindo o download.",
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
          "É necessário selecionar uma operadora na barra de filtros (perfis com múltiplas operadoras). Sem seleção, a página exibe apenas a orientação para escolher a operadora.\n\nSe a operadora já está selecionada e os blocos continuam vazios, confirme permissão de visualização e se há campanhas ou sugestões cadastradas para aquela operadora.",
      },
      {
        subtitulo: "A campanha não aparece na Central de Notificações?",
        texto:
          "Confirme operadora, datas de início/fim e permissões. A Central filtra por escopo; campanhas fora do período podem exigir modo Histórico na Central.\n\nA campanha precisa estar ativa no intervalo selecionado na Central e vinculada à operadora do escopo do operador.",
      },
      {
        subtitulo: "Filtros de jogo ou tipo escondem itens?",
        texto:
          "Os filtros Jogo e Tipo aplicam-se às sugestões dos blocos Abertura, Durante o jogo e Fechamento — não ao bloco Campanhas. Volte Jogo e Tipo para 'Todos' para ver o conjunto completo de roteiros do bloco.",
      },
      {
        subtitulo: "Erro ao salvar bloco ou campanha?",
        texto:
          "Verifique campos obrigatórios (título, texto, operadora, datas em campanhas) e conexão. A interface exibe mensagem genérica em português — detalhes técnicos ficam no console do navegador para suporte.\n\nSe o problema persistir, valide no Supabase (RLS, policies e tabelas roteiro_mesa_*) com o administrador.",
      },
      {
        subtitulo: "Não consigo excluir uma sugestão ou campanha?",
        texto:
          "A exclusão exige permissão can_excluir na página Roteiro de Mesa. Sem ela, os botões de lixeira não aparecem. Confirme também que a operadora do item está dentro do escopo do usuário.",
      },
    ],
  },
  playbook_influencers: {
    titulo: "Playbook — Influencers",
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
          "O botão fica inativo em três situações:\n— Você não tem permissão de editar nesta página (um aviso amarelo aparece explicando o motivo).\n— O campo UTM está vazio — preencha antes de emitir.\n— Você é gestor e não selecionou um influencer na lista.\n\nVerifique qual situação se aplica e siga a instrução correspondente. Se precisar de permissão de editar, contate o administrador e peça que ative Editar em Links e Materiais na Gestão de Usuários.",
      },
      {
        subtitulo: "Apareceu um aviso de perfil incompleto ou Playbook pendente ao tentar emitir?",
        texto:
          "O link só pode ser emitido quando o perfil do influencer está completo e o Playbook foi confirmado. O aviso indica qual requisito está faltando e oferece um botão para ir direto à página correspondente. Complete o requisito indicado e volte para emitir o link.",
      },
      {
        subtitulo: "O UTM foi preenchido automaticamente com um nome errado?",
        texto:
          "O UTM é gerado a partir do nome artístico cadastrado no perfil do influencer. Se o nome artístico estiver desatualizado, atualize-o em Influencers (área de perfil) e volte para emitir. Você também pode editar o campo UTM manualmente antes de emitir — use apenas letras sem acento, números e _.",
      },
      {
        subtitulo: "O link já foi emitido mas não aparece na tela?",
        texto:
          "Se você acabou de entrar na página e o link não carregou, aguarde o indicador de carregamento desaparecer. Se demorar mais de alguns segundos, recarregue a página. Se o link já foi emitido anteriormente por outro gestor, ele será carregado automaticamente ao selecionar o influencer na lista.",
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
        subtitulo: "Como gestor, não vejo nenhum influencer na lista?",
        texto:
          "A lista exibe apenas influencers dentro do seu escopo de visibilidade configurado na Gestão de Usuários. Se a lista estiver vazia, o seu escopo pode não incluir nenhum influencer ativo. Contate o administrador para revisar o seu escopo de acesso.",
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
          "A aba só aparece para utilizadores com permissão de Editar em Informativos na Gestão de Usuários. Peça ao administrador para liberar Ver e Editar (e Criar/Excluir, se necessário).",
      },
      {
        subtitulo: "Publiquei um informativo mas não aparece na Home?",
        texto:
          "Confirme que o status está Publicado e que o perfil do utilizador foi marcado no campo Perfil ao criar o informativo. Para o perfil Operador, verifique também o campo Operadora: Todos envia a todas as operadoras; uma operadora específica só aparece na Home dos operadores daquela parceira. A integração na Home depende do perfil logado e, no caso de Operador, do escopo de operadora configurado na postagem.",
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
          "A aba de Gerenciamento aparece apenas para usuários com permissão de Editar no Portal de RH. Se você precisa dessa permissão, contate o administrador para ativá-la em Gestão de Usuários.",
      },
      {
        subtitulo: "O botão 'Ver Ata' está desabilitado numa RH Talk?",
        texto:
          "Essa ata tem acesso restrito a participantes da reunião. Se você esteve presente na reunião mas não consegue ver, pode ser que o registro de participação não tenha sido feito. Informe ao RH para que adicionem seu usuário como participante.",
      },
      {
        subtitulo: "Cliquei em 'Lido' mas o badge 'Novo' voltou?",
        texto:
          "O badge Novo desaparece após o clique quando a operação é registrada com sucesso. Se voltou após recarregar a página, pode ter ocorrido uma falha no registro. Tente clicar em Lido novamente. Se o problema persistir, contate o suporte.",
      },
      {
        subtitulo: "Tentei publicar uma postagem mas deu erro?",
        texto:
          "Verifique se todos os campos obrigatórios (marcados com asterisco vermelho) estão preenchidos. Se todos estão preenchidos e o erro persiste, pode ser uma instabilidade temporária. Aguarde alguns segundos e tente novamente. Rascunhos são salvos mesmo que a publicação falhe — verifique na aba Gerenciamento se o rascunho foi salvo.",
      },
      {
        subtitulo: "Uma postagem que aprovar não aparece na lista de publicados?",
        texto:
          "Após aprovar, a página atualiza automaticamente. Se a postagem não aparecer nos publicados, verifique o filtro de mês ativo — ela pode ter sido publicada em um mês diferente do selecionado. Mude o carrossel para o mês de publicação ou use a aba Gerenciamento com filtro Status: Publicado.",
      },
      {
        subtitulo: "Não consigo arquivar uma postagem publicada?",
        texto:
          "O botão Arquivar exige dois cliques: o primeiro destaca o botão e exibe Confirmar?; o segundo executa a ação. Se você clicou fora do botão antes de confirmar, repita o processo.",
      },
      {
        subtitulo: "O anexo ou imagem não abre ao clicar?",
        texto:
          "Os arquivos são abertos em uma nova aba. Verifique se o navegador está bloqueando novas abas desta página e permita o popup. Se o link mostrar 'Carregando…' por mais de 10 segundos, pode ser que o arquivo tenha sido removido do armazenamento. Informe ao responsável pela postagem.",
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
          "A tabela de Solicitações exibe apenas pedidos com status Solicitado ou Aprovado — pedidos Liberados aparecem apenas no Consolidado de Bancas. Se você não vê a solicitação, confirme o mês selecionado no carrossel — a solicitação pode ter sido criada em outro período. Ative o Histórico para ver tudo sem restrição de data.",
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
          "Clique na linha do influencer para expandir o histórico. Se o histórico aparecer vazio após expandir, significa que não há solicitações registradas para aquele influencer no período selecionado. Ative o Histórico (filtro) para ver todas as transações sem restrição de data.",
      },
    ],
  },
  afiliados: {
    titulo: "Afiliados — Problemas Comuns",
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
    titulo: "Network — Problemas Comuns",
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
          "Esses botões dependem do seu perfil e da permissão de edição. O botão Analisar aparece para pagamentos Em análise; Pagar aparece para pagamentos Aguardando pagamento. Se você tem permissão e os botões não aparecem, confirme que o ciclo está fechado — no ciclo aberto (prévia), nenhuma ação está disponível.",
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
          "Tente recarregar a página. Se o problema persistir, verifique se seu perfil tem permissão de visualização para a seção Campanhas.",
      },
    ],
  },
  gestao_operadoras: {
    titulo: "Gestão de Operadoras",
    blocos: [
      {
        subtitulo: "Não consigo ativar uma operadora?",
        texto:
          "O status Ativa só pode ser definido quando a operadora tiver pelo menos uma mesa cadastrada em Gestão de Mesas. Cadastre as mesas primeiro e tente novamente.",
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
    titulo: "Gestão de Mesas",
    blocos: [
      {
        subtitulo: "Erro ao cadastrar uma mesa — 'já existe uma mesa com este ID'?",
        texto:
          "O ID Spin e o ID da operadora são únicos por operadora. Verifique se já existe uma mesa com os mesmos identificadores na lista. Se precisar corrigir o ID Spin de uma mesa existente, exclua e recadastre.",
      },
      {
        subtitulo: "A lista aparece vazia mesmo havendo mesas cadastradas?",
        texto:
          "Verifique se o filtro de operadora está selecionado em **Todas Operadoras**. Se um filtro específico estiver ativo, apenas as mesas daquela operadora serão exibidas.",
      },
    ],
  },
  status_tecnico: {
    titulo: "Status Técnico",
    blocos: [
      {
        subtitulo: "Uma integração aparece como 'Falha' — o que fazer?",
        texto:
          "Verifique os Logs Recentes na mesma página: o campo Descrição traz a causa do erro. Os erros mais comuns são token de API expirado (renove o secret no Supabase) ou Edge Function não publicada (execute o deploy no CLI do Supabase). Se o erro persistir após corrigir a causa, use o botão Sync para forçar uma nova tentativa.",
      },
      {
        subtitulo: "O botão Sync não aparece para uma integração?",
        texto:
          "Apenas as integrações CDA, Social Media KPIs e Spin na Rede RSS possuem sync manual. Lobby Blaze e Lobby CDA operam via job automatizado externo e não têm ação disponível na interface.",
      },
      {
        subtitulo: "Um prestador não consegue fazer check-in?",
        texto:
          "O sistema de ponto bloqueia IPs não cobertos por CIDR autorizado. Verifique o IP público da rede do prestador e confira se ele está dentro de algum dos prefixos listados em 'Redes Permitidas'. Se necessário, adicione o CIDR correspondente.",
      },
      {
        subtitulo: "O alerta 'E-mail não enviado hoje' está aparecendo mesmo após o envio?",
        texto:
          "Os alertas são calculados com base nos registros de email_envios do dia corrente (UTC). Se o envio foi feito muito cedo ou próximo da meia-noite, pode haver defasagem de fuso horário. Verifique nos Logs Recentes se o envio aparece registrado.",
      },
    ],
  },
  gestao_usuarios: {
    titulo: "Gestão de Usuários",
    blocos: [
      {
        subtitulo: "Um usuário diz que não vê determinada página no menu após alteração?",
        texto:
          "As permissões e menus são carregados no login. Após salvar qualquer alteração nas abas Permissões, Operadora, Gestores ou Prestadores, o usuário afetado precisa fazer logout e login novamente para que as mudanças reflitam no menu.",
      },
      {
        subtitulo: "As abas Permissões, Operadora, Gestores e Prestadores não aparecem?",
        texto:
          "Essas abas são exibidas somente para o perfil Administrador com permissão de Editar em Gestão de Usuários. Se você é administrador e as abas não aparecem, verifique se sua sessão está ativa e recarregue a página.",
      },
      {
        subtitulo: "Erro ao salvar permissões ou páginas?",
        texto:
          "Verifique sua conexão com a internet. Se o erro persistir, recarregue a página antes de tentar novamente — isso evita salvar um estado inconsistente. Em caso de erro contínuo, contate o suporte técnico.",
      },
      {
        subtitulo: "Não consigo criar um novo usuário?",
        texto:
          "O botão Novo Usuário (pill com ícone +) só aparece para administradores com permissão de Criar ativa. Verifique na aba Permissões se o perfil Administrador está configurado corretamente (o admin tem acesso total fixo, portanto o botão deve sempre aparecer). Se o e-mail informado já estiver cadastrado, o sistema retornará erro — use a busca para localizar o usuário existente.",
      },
    ],
  },
  gestao_links: {
    titulo: "Gestão de Links",
    blocos: [
      {
        subtitulo: "Um link mapeado não aparece nos dashboards?",
        texto:
          "Após o mapeamento, a sincronização histórica ocorre automaticamente mas pode levar alguns minutos. Novos dados chegam diariamente até as 4h. Se após 24h o link ainda não reflete nos dashboards, verifique: (1) o link foi mapeado para o influencer correto? Na aba Mapeados, a coluna Influencer / Campanha confirma a associação. (2) O influencer tem perfil ativo e está presente no dashboard? Perfis Cancelados podem não aparecer nos relatórios.",
      },
      {
        subtitulo: "O botão Mapear não aparece na aba Pendentes?",
        texto:
          "O botão Mapear requer permissão de edição na Gestão de Links. Se não aparece, seu perfil não tem essa permissão. Entre em contato com o gestor para solicitar acesso.",
      },
      {
        subtitulo: "Quero remapear um link que já foi mapeado incorretamente?",
        texto:
          "Na aba Mapeados, clique em Reabrir na linha correspondente. O link volta para Pendentes e pode ser mapeado novamente para o influencer ou campanha corretos.",
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
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ABAS: Aba[] = ["conheca", "troubleshooting", "glossario"];

const LABELS_ABA: Record<Aba, string> = {
  conheca: "Conheça a Plataforma",
  troubleshooting: "Troubleshooting",
  glossario: "Glossário",
};

const AJUDA_TAB_ICONS: Record<Aba, ReactNode> = {
  conheca: <BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />,
  troubleshooting: <LifeBuoy {...FILTRO_BAR_TAB_ICON_PROPS} />,
  glossario: <BookMarked {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

export default function Ajuda() {
  const { theme: t, isDark, permissions } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey>("streamers");

  const menuAjudaVisivel = useMemo(
    () =>
      MENU.map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => podeVerPaginaNoMenu(permissions[item.key])),
      })).filter((sec) => sec.items.length > 0),
    [permissions],
  );

  const primeiroPageKeyVisivel = useMemo((): PageKey | null => {
    const first = menuAjudaVisivel[0]?.items[0];
    return first?.key ?? null;
  }, [menuAjudaVisivel]);

  const paginaAtualVisivel = useMemo(
    () => menuAjudaVisivel.some((sec) => sec.items.some((item) => item.key === paginaSelecionada)),
    [menuAjudaVisivel, paginaSelecionada],
  );

  useEffect(() => {
    if (!primeiroPageKeyVisivel) return;
    if (!paginaAtualVisivel) {
      setPaginaSelecionada(primeiroPageKeyVisivel);
    }
  }, [primeiroPageKeyVisivel, paginaAtualVisivel]);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
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

      <PageHeader
        icon={<HelpCircle {...PAGE_HEADER_ICON_PROPS} />}
        title="Ajuda"
        subtitle={getPageCanonicalSubtitle("ajuda")}
      />

      <div
        role="tablist"
        aria-label="Seções de ajuda"
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ajuda-${k}`)}
      >
        {ABAS.map((a) => (
          <FiltroBarTabButton
            key={a}
            id={`tab-ajuda-${a}`}
            active={aba === a}
            aria-controls={`panel-ajuda-${a}`}
            onClick={() => setAba(a)}
            icon={AJUDA_TAB_ICONS[a]}
          >
            {LABELS_ABA[a]}
          </FiltroBarTabButton>
        ))}
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
            <AbaGlossario dark={isDark} t={t} />
          </div>
        </div>
      ) : menuAjudaVisivel.length === 0 ? (
        <div
          role="tabpanel"
          id={`panel-ajuda-${aba}`}
          aria-labelledby={`tab-ajuda-${aba}`}
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: "48px 32px",
            boxShadow: cardShadow,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: navActiveBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: t.text,
              fontFamily: FONT.body,
              margin: "0 auto 8px",
              maxWidth: 420,
            }}
          >
            Você não tem acesso às páginas da plataforma.
          </p>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: t.textMuted,
              fontFamily: FONT.body,
              margin: "0 auto",
              maxWidth: 420,
            }}
          >
            Procure o administrador para solicitar as permissões necessárias em Gestão de Usuários.
          </p>
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
              {menuAjudaVisivel.map((sec) => (
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
                  {sec.items.map(({ key, label, icon: Icon }) => {
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
