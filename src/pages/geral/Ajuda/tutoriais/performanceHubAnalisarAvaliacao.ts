import { FileSearch } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/performance-hub-analisar-avaliacao";

/** Tutorial: prestador analisa avaliação publicada (aprovar ou solicitar feedback). */
export const TUTORIAL_PERFORMANCE_HUB_ANALISAR_AVALIACAO: TutorialDef = {
  id: "performance-hub-analisar-avaliacao",
  urlSlug: "PerformanceHubAnalisarAvaliacao",
  titulo: "Analisar Avaliação",
  section: "Academy",
  icon: FileSearch,
  relatedPageKey: "academy_performance_hub",
  relatedTabId: "avaliacoes",
  objetivo:
    "Revisar uma avaliação Performance Coach publicada para você, aprovar quando estiver de acordo ou solicitar feedback ao Shift Leader para esclarecer notas e comentários.",
  passos: [
    {
      titulo: "1. Abrir a aba Avaliações",
      texto:
        "1. No menu, seção Academy, clique em Performance Hub.\n2. Use o carrossel de **mês** ou **Histórico** para localizar a competência da avaliação.\n3. A aba **Avaliações** abre por padrão.\n\nCom permissão de **Ver = Próprios**, a lista exibe **somente as suas** avaliações publicadas — o fluxo é o mesmo para **Game Presenter** e **Shuffler** (a única diferença na tabela é a coluna **Mesa** ou **Procedimentos**). Não há filtro de Time na barra.",
      imagens: [
        {
          src: `${IMG}/01-aba-avaliacoes.png`,
          alt: "Performance Hub — aba Avaliações (visão do prestador)",
        },
      ],
    },
    {
      titulo: "2. Localizar avaliação em Aguardando",
      texto:
        "Procure linhas com status **Aguardando** — o Performance Coach já publicou a avaliação e aguarda sua análise.\n\nColunas principais: **Data**, notas (**Total**, **Imagem**, **Comunicação**, **Mesa** ou **Procedimentos**), **Status**, **Vídeo** e **Ações**.\n\nNa coluna **Ações**, avaliações em Aguardando exibem o ícone **Analisar avaliação**. Em **Feedback** ou **Aprovado**, aparecem **Ver** e **Histórico**.",
      imagens: [
        {
          src: `${IMG}/02-lista-aguardando.png`,
          alt: "Tabela de avaliações — colunas Status e Ações (exemplo com avaliação publicada)",
        },
      ],
    },
    {
      titulo: "3. Abrir Analisar Avaliação",
      texto:
        "Na linha da avaliação em **Aguardando**, clique no ícone **Analisar avaliação** na coluna Ações.\n\nO modal abre em modo de leitura — revise com calma antes de decidir entre **Aprovar** ou **Solicitar Feedback**.",
    },
    {
      titulo: "4. Revisar notas e critérios",
      texto:
        "Percorra as abas do modal:\n\n— **Dados da Avaliação** — turno, estúdio, jogo (**Game Presenter**), notas por dimensão, **Pontos Fortes**, **Pontos a Desenvolver** e link **Assistir** do vídeo.\n— **Comunicação** e **Imagem** — nota e comentário de cada critério.\n— **Mesa** (**Game Presenter**) ou **Procedimentos** (**Shuffler**) — mesma estrutura de nota + comentário.\n\nEnquanto o status for **Aguardando**, a aba **Feedback** ainda não aparece — ela surge depois que você solicita esclarecimento. No rodapé ficam **Aprovar** e **Solicitar Feedback**.\n\nUse o vídeo e os comentários do avaliador para entender o que foi pontuado antes de escolher o próximo passo.",
      imagens: [
        {
          src: `${IMG}/04-modal-revisar.png`,
          alt: "Modal Analisar Avaliação — abas em leitura",
        },
      ],
    },
    {
      titulo: "5. Aprovar a avaliação",
      texto:
        "Se você entendeu os pontos sinalizados:\n\n1. No rodapé do modal, clique em **Aprovar**.\n2. No pop-up **Aprovar Avaliação**, confirme que compreendeu a avaliação.\n3. Clique em **Aprovar** para concluir.\n\nO status da linha passa a **Aprovado** — o ciclo encerra e as ações ficam **Ver** e **Histórico**.",
    },
    {
      titulo: "6. Solicitar Feedback",
      texto:
        "Se precisar de esclarecimento sobre notas ou comentários:\n\n1. No rodapé do modal, clique em **Solicitar Feedback**.\n2. No pop-up **Solicitar Feedback da Avaliação**, preencha o campo **Mensagem** (obrigatório) — descreva o que deseja entender melhor para o Shift Leader repassar.\n3. Clique em **Solicitar** para confirmar.\n\nO status passa a **Feedback**. O botão **Solicitar Feedback** deixa de aparecer nessa avaliação — use **Ver** e **Histórico** enquanto aguarda o repasse.",
    },
    {
      titulo: "7. Conferir o status na lista",
      texto:
        "Após sua ação:\n\n— **Aprovado** — avaliação encerrada; você pode reler com **Ver** ou consultar a linha do tempo em **Histórico**.\n— **Feedback** — aguardando repasse do Shift Leader na aba Feedback; quando o coach aplicar o feedback, o status volta a **Aprovado**.\n\nSe não encontrar a avaliação, ajuste o carrossel de mês ou ative **Histórico** (**Todo o período**).",
      imagens: [
        {
          src: `${IMG}/07-status-apos-acao.png`,
          alt: "Lista com avaliação em status Feedback ou Aprovado",
        },
      ],
    },
  ],
  notasFinais:
    "— Só avaliações **publicadas** (status Aguardando, Feedback ou Aprovado) aparecem na aba Avaliações — rascunhos do coach ficam apenas no Gerenciamento.\n— **Aprovar** e **Solicitar Feedback** só estão disponíveis enquanto o status for **Aguardando**.\n— O vídeo fica disponível por 90 dias após a publicação; depois disso a coluna exibe **Vídeo removido**, mas notas e textos permanecem.\n— Game Presenter e Shuffler seguem o mesmo fluxo; a diferença é só a terceira dimensão na tabela e no modal (**Mesa** vs **Procedimentos**).",
};
