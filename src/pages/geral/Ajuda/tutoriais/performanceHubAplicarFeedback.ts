import { MessageSquareReply } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/performance-hub-aplicar-feedback";

/** Tutorial: aplicar feedback na aba Feedback (repasse ao prestador). */
export const TUTORIAL_PERFORMANCE_HUB_APLICAR_FEEDBACK: TutorialDef = {
  id: "performance-hub-aplicar-feedback",
  urlSlug: "PerformanceHubAplicarFeedback",
  titulo: "Aplicar Feedback",
  section: "Academy",
  icon: MessageSquareReply,
  relatedPageKey: "academy_performance_hub",
  relatedTabId: "feedback",
  objetivo:
    "Repassar feedback ao prestador que solicitou esclarecimento sobre uma avaliação e encerrar o ciclo com status Aprovado.",
  passos: [
    {
      titulo: "1. Abrir a aba Feedback",
      texto:
        "1. No menu, seção Academy, clique em Performance Hub.\n2. Na barra de filtros, selecione o **time** (Game Presenter ou Shuffler) e o **mês** no carrossel — a lista respeita o período filtrado.\n3. Clique na aba **Feedback** (entre Avaliações e Gerenciamento).",
      imagens: [
        {
          src: `${IMG}/01-aba-feedback.png`,
          alt: "Performance Hub — aba Feedback selecionada",
        },
      ],
    },
    {
      titulo: "2. Localizar feedbacks pendentes",
      texto:
        "No bloco **Feedbacks Pendentes**, a tabela lista avaliações em status **Feedback** — ou seja, o prestador analisou a avaliação e pediu esclarecimento.\n\nColunas principais:\n— **Data da Avaliação** e **Avaliado**\n— **Time** (Game Presenter ou Shuffler)\n— **Data da Solicitação do Feedback** — quando o prestador pediu o repasse\n— **Mensagem** — o que o prestador deseja entender melhor\n\nSe não houver linhas, a mensagem exibida é: **Nenhum feedback pendente para o período selecionado.**",
      imagens: [
        {
          src: `${IMG}/02-feedbacks-pendentes.png`,
          alt: "Tabela Feedbacks Pendentes com mensagem do prestador",
        },
      ],
    },
    {
      titulo: "3. Abrir Aplicar feedback",
      texto:
        "Na linha do prestador, clique no ícone **Aplicar feedback** na coluna Ações.\n\n— Use **Ver avaliação** (ícone de olho) se quiser apenas ler a avaliação sem aplicar o repasse.\n— **Aplicar feedback** só aparece em pendentes; em **Feedbacks Aplicados** a ação não está disponível.",
      imagens: [
        {
          src: `${IMG}/03-acao-aplicar-feedback.png`,
          alt: "Coluna Ações com ícone Aplicar feedback",
        },
      ],
    },
    {
      titulo: "4. Revisar a avaliação",
      texto:
        "O modal **Aplicar Feedback** abre em modo de leitura. Percorra as abas para entender o contexto antes de responder:\n\n— **Dados da Avaliação** — turno, estúdio, jogo (Game Presenter), notas, pontos fortes e pontos a desenvolver, link **Assistir** do vídeo.\n— **Comunicação**, **Imagem** e **Mesa** (GP) ou **Procedimentos** (Shuffler) — nota e comentário de cada critério.\n\nLeia a mensagem do prestador na tabela antes de redigir o repasse — ela indica o que precisa ser esclarecido.",
      imagens: [
        {
          src: `${IMG}/04-modal-revisar-avaliacao.png`,
          alt: "Modal Aplicar Feedback — abas da avaliação em leitura",
        },
      ],
    },
    {
      titulo: "5. Registrar o repasse",
      texto:
        "1. No rodapé do modal, clique em **Aprovar**.\n2. No pop-up **Aplicar Feedback**, preencha o campo **Feedback** (obrigatório) — descreva o repasse que será registrado para o prestador. Placeholder: *Descreva o feedback aplicado para registro do repasse*.\n3. Clique em **Aprovar** no pop-up para confirmar.\n\n— **Voltar** fecha o pop-up sem salvar.\n— O texto do repasse fica gravado no histórico da avaliação.",
      imagens: [
        {
          src: `${IMG}/05-popup-aplicar-feedback.png`,
          alt: "Pop-up Aplicar Feedback com campo Feedback preenchido",
        },
      ],
    },
    {
      titulo: "6. Confirmar em Feedbacks Aplicados",
      texto:
        "Após o sucesso:\n\n1. A avaliação **sai** de **Feedbacks Pendentes**.\n2. Aparece em **Feedbacks Aplicados**, com **Data da Aplicação de Feedback** e **Aplicador do Feedback** (quem registrou o repasse).\n3. O status da avaliação passa a **Aprovado** — na aba **Avaliações**, o prestador vê **Ver** e **Histórico**.\n\nEm **Feedbacks Aplicados**, use **Ver avaliação** para reler notas e critérios, ou **Histórico da avaliação** para ver a linha do tempo (solicitação, aplicação, aprovação).",
      imagens: [
        {
          src: `${IMG}/06-feedbacks-aplicados.png`,
          alt: "Tabela Feedbacks Aplicados após o repasse",
        },
      ],
    },
  ],
  notasFinais:
    "— O prestador entra em **Feedback** ao usar **Solicitar Feedback** na aba Avaliações (status Aguardando) — a solicitação aparece na coluna Mensagem dos pendentes.\n— **Aplicar feedback** na aba Feedback é a única forma de registrar o repasse e aprovar a avaliação nesse status — na aba Avaliações, linhas em Feedback exibem só **Ver** e **Histórico**.\n— Sem texto no campo **Feedback**, o pop-up não confirma e exibe orientação para preencher o repasse.\n— Use o filtro de **Time** e o carrossel de mês para achar solicitações de competências anteriores ou do outro time.",
};
