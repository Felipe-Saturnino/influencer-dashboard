import { Settings } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/performance-hub-configuracao-pesos";

/** Tutorial: configurar pesos do scoring na aba Configuração. */
export const TUTORIAL_PERFORMANCE_HUB_CONFIGURACAO_PESOS: TutorialDef = {
  id: "performance-hub-configuracao-pesos",
  urlSlug: "PerformanceHubConfiguracaoPesos",
  titulo: "Configurar Pesos",
  section: "Academy",
  icon: Settings,
  relatedPageKey: "academy_performance_hub",
  relatedTabId: "configuracao",
  objetivo:
    "Ajustar os pesos das dimensões e dos critérios do scoring por time (Game Presenter ou Shuffler) para novas avaliações.",
  passos: [
    {
      titulo: "1. Abrir a Configuração",
      texto:
        "1. No menu, seção Academy, clique em Performance Hub.\n2. Clique na aba **Configuração**.",
      imagens: [
        {
          src: `${IMG}/01-aba-configuracao.png`,
          alt: "Performance Hub — aba Configuração",
        },
      ],
    },
    {
      titulo: "2. Selecionar o time",
      texto:
        "Na barra de filtros, use o seletor de **Time** para escolher **Game Presenter** ou **Shuffler**.\n\n— Cada time tem pesos independentes — ao trocar o time, a tela recarrega a configuração daquele cargo.\n— Na aba Configuração **não** há filtro de Staff — só carrossel de período, Histórico e Time.",
      imagens: [
        {
          src: `${IMG}/02-filtro-time.png`,
          alt: "Barra de filtros com seletor de Time na Configuração",
        },
      ],
    },
    {
      titulo: "3. Ajustar pesos das dimensões",
      texto:
        "O bloco **Configuração de Pesos** lista as dimensões do time selecionado:\n\n**Game Presenter:** Comunicação, Imagem e Mesa.\n**Shuffler:** Comunicação, Imagem e Procedimentos.\n\nEm cada dimensão, altere o campo **Peso da dimensão** (0 a 10, passo 0,5). Esse peso entra na média ponderada da **Nota Final** da avaliação.",
      imagens: [
        {
          src: `${IMG}/03-peso-dimensao.png`,
          alt: "Seção de dimensão com campo Peso da dimensão",
        },
      ],
    },
    {
      titulo: "4. Ajustar pesos dos critérios",
      texto:
        "Dentro de cada dimensão, a tabela lista os **critérios** com coluna **Peso** editável (0 a 10, passo 0,5).\n\n— A nota de cada critério (0–10) é ponderada pelo peso do critério dentro da dimensão.\n— Na dimensão **Mesa** (Game Presenter), alguns critérios indicam o tipo entre parênteses — **cartas** ou **roleta** — conforme o jogo da avaliação.\n\nAlterações aqui **não recalculam** avaliações já publicadas — valem para **novas** avaliações e rascunhos salvos depois da alteração.",
      imagens: [
        {
          src: `${IMG}/04-peso-criterios.png`,
          alt: "Tabela de critérios com coluna Peso editável",
        },
      ],
    },
    {
      titulo: "5. Salvar",
      texto:
        "1. Revise os pesos de todas as dimensões do time.\n2. Clique em **Salvar** no canto inferior direito.\n3. Aguarde a confirmação **Pesos salvos com sucesso.**\n\nSe houver erro de conexão, a mensagem aparece em vermelho — tente novamente. Se o problema persistir, entre em contato com o suporte.",
      imagens: [
        {
          src: `${IMG}/05-salvar-pesos.png`,
          alt: "Botão Salvar e mensagem de sucesso na Configuração",
        },
      ],
    },
  ],
  notasFinais:
    "— Avaliações em andamento (rascunho) passam a usar os novos pesos na próxima vez que forem abertas ou salvas.\n— Consolidados e histórico de avaliações já publicadas mantêm a nota calculada no momento da conclusão.",
};
