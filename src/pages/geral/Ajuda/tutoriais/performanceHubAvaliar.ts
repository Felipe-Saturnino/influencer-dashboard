import { ClipboardCheck } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/performance-hub-avaliar";

/** Tutorial: realizar avaliação Performance Coach no Gerenciamento. */
export const TUTORIAL_PERFORMANCE_HUB_AVALIAR: TutorialDef = {
  id: "performance-hub-avaliar",
  urlSlug: "PerformanceHubAvaliar",
  titulo: "Realizar Avaliação",
  section: "Academy",
  icon: ClipboardCheck,
  relatedPageKey: "academy_performance_hub",
  relatedTabId: "gerenciamento",
  objetivo:
    "Criar uma avaliação Performance Coach, preencher critérios e vídeo, salvar rascunho ou publicar para o prestador analisar.",
  passos: [
    {
      titulo: "1. Abrir o Gerenciamento",
      texto:
        "1. No menu, seção Academy, clique em Performance Hub.\n2. Na barra de filtros, selecione o **time** (Game Presenter ou Shuffler) e o **mês** no carrossel.\n3. Clique na aba **Gerenciamento**.",
      imagens: [
        {
          src: `${IMG}/01-gerenciamento-agenda.png`,
          alt: "Performance Hub — aba Gerenciamento com Agenda de Avaliações",
        },
      ],
    },
    {
      titulo: "2. Iniciar a avaliação",
      texto:
        "Na **Agenda de Avaliações**, localize o prestador e clique no ícone **Avaliar performance** na coluna Ação.\n\n— A coluna **Realizadas** mostra quantas avaliações publicadas o prestador já tem no mês; **Pendentes** indica quantas faltam para o mínimo de 3.\n— Se já existir rascunho em andamento, use a tabela **Avaliações em Rascunho** e o mesmo ícone para continuar.",
      imagens: [
        {
          src: `${IMG}/02-agenda-avaliar.png`,
          alt: "Agenda de Avaliações com ação Avaliar performance",
        },
      ],
    },
    {
      titulo: "3. Dados da Avaliação",
      texto:
        "No modal, aba **Dados da Avaliação**:\n\n1. **Turno** — Manhã, Tarde ou Noite.\n2. **Estúdio** — unidade onde a avaliação foi gravada.\n3. **Game Presenter:** preencha **Jogo** e **Mesa** (obrigatórios). **Shuffler:** não há Jogo/Mesa nesta aba.\n4. **Vídeo da avaliação** (obrigatório para concluir) — use **Enviar vídeo da avaliação**. Grave em 720p; o limite é 500 MB por arquivo.\n\nO sistema pode sugerir turno, estúdio e jogo com base no cadastro do prestador — confira antes de salvar.",
      imagens: [
        {
          src: `${IMG}/03-modal-dados.png`,
          alt: "Modal de avaliação — aba Dados da Avaliação",
        },
      ],
    },
    {
      titulo: "4. Critérios — Comunicação, Imagem e Mesa/Procedimentos",
      texto:
        "Percorra as abas de critérios. Em cada critério, preencha:\n\n— **Nota** (0 a 10) — obrigatória para concluir.\n— **Comentário** — obrigatório para concluir.\n\n**Game Presenter:** abas Comunicação, Imagem e **Mesa** (critérios variam conforme o jogo — cartas ou roleta).\n**Shuffler:** Comunicação, Imagem e **Procedimentos**.\n\nNo rodapé do modal, acompanhe a nota parcial de cada dimensão e a **Nota Final** (média ponderada pelos pesos da Configuração).",
      imagens: [
        {
          src: `${IMG}/04-modal-criterios.png`,
          alt: "Modal de avaliação — aba de critérios com nota e comentário",
        },
      ],
    },
    {
      titulo: "5. Considerações",
      texto:
        "Na aba **Considerações**, preencha:\n\n1. **Pontos Fortes** — destaque o que o prestador fez bem.\n2. **Pontos a Desenvolver** — oportunidades de melhoria.\n\nAmbos os campos são obrigatórios para **Concluir**.",
      imagens: [
        {
          src: `${IMG}/05-modal-consideracoes.png`,
          alt: "Modal de avaliação — aba Considerações",
        },
      ],
    },
    {
      titulo: "6. Salvar ou Concluir",
      texto:
        "1. **Salvar** — grava como **Rascunho**. A avaliação fica na tabela Avaliações em Rascunho; você pode retomar depois. O vídeo é enviado junto, se ainda não estava salvo.\n2. **Concluir** — valida todos os campos obrigatórios, publica a avaliação com status **Aguardando** e libera para o prestador **Analisar Avaliação** na aba Avaliações (Aprovar ou Solicitar Feedback).\n\nApós concluir, a avaliação sai dos rascunhos e entra nos consolidados e na meta mensal do prestador (mínimo de 3 publicadas no mês).",
      imagens: [
        {
          src: `${IMG}/06-modal-salvar-concluir.png`,
          alt: "Rodapé do modal com Salvar, Concluir e Nota Final",
        },
      ],
    },
  ],
  notasFinais:
    "— **Salvar** não exige todos os critérios preenchidos; **Concluir** exige dados, vídeo, todas as notas, todos os comentários e as considerações.\n— Avaliações publicadas aparecem na aba **Avaliações** com status Aguardando, Feedback ou Aprovado — rascunhos ficam só no Gerenciamento.\n— O vídeo fica disponível por 90 dias após a conclusão; depois disso a coluna exibe **Vídeo removido**, mas notas e textos permanecem.\n— Ao trocar o filtro de **Time** na barra, o layout e os critérios seguem Game Presenter ou Shuffler.",
};
