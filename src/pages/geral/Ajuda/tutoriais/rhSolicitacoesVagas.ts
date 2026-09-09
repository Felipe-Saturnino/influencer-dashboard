import { Briefcase } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/solicitacoes/vagas";

/** Tutorial: solicitar abertura de vaga em Solicitações RH — visão de gestor. */
export const TUTORIAL_RH_SOLICITACOES_VAGAS: TutorialDef = {
  id: "rh-solicitacoes-vagas",
  urlSlug: "RhSolicitacoesVagas",
  titulo: "Solicitar Vaga",
  section: "RH",
  icon: Briefcase,
  relatedPageKey: "rh_solicitacoes",
  relatedTabId: "vagas",
  objetivo:
    "Como gestor, solicitar a abertura de uma vaga na aba Vagas de Solicitações (RH).",
  passos: [
    {
      titulo: "1. Abrir a aba Vagas",
      texto:
        "1. No menu, seção RH, clique em **Solicitações**.\n2. Clique na aba **Vagas**.\n3. O carrossel abre em **Em análise** — pedidos de abertura aguardando atendimento.\n4. Com permissão de **Editar**, o botão **Solicitar Vaga** aparece no bloco da lista.",
      imagens: [
        {
          src: `${IMG}/01-aba-vagas.png`,
          alt: "Solicitações — aba Vagas com CTA Solicitar Vaga",
        },
      ],
    },
    {
      titulo: "2. Preencher a solicitação",
      texto:
        "1. Clique em **Solicitar Vaga**.\n2. No modal, selecione o **organograma** (diretoria / gerência / time) da necessidade.\n3. Informe a **Data de Entrada** — a sugestão inicial é cerca de **15 dias úteis** a partir de hoje; ajuste se precisar.\n4. Preencha a **Observação** descrevendo a necessidade da vaga.\n5. Clique em **Solicitar**.",
      imagens: [
        {
          src: `${IMG}/02-modal-solicitar-vaga.png`,
          alt: "Modal Solicitar Vaga",
        },
      ],
    },
    {
      titulo: "3. Acompanhar o pedido",
      texto:
        "1. A solicitação entra em **Em análise** na aba **Vagas**.\n2. Quem tiver permissão de **Editar** pode **Atender** (aprovar ou rejeitar) com observação.\n3. Em **Aprovado** ou **Rejeitado**, use **Ver** para consultar o parecer e a data do atendimento.\n4. O desdobramento operacional da vaga (publicação, candidatos) segue na página **Vagas** da seção RH, quando o fluxo de cadastro for liberado.",
      aviso:
        "Solicitar Vaga registra o pedido nesta fila — não cria sozinha a vaga publicada no mural de candidaturas.",
    },
  ],
  notasFinais:
    "— Gestores usam esta aba para formalizar a necessidade de headcount ao RH.\n— Sem **Editar**, a lista é só leitura.",
};
