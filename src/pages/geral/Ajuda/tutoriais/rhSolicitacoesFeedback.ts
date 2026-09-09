import { MessageSquare } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/solicitacoes/feedback";

/** Tutorial: registrar e aprovar feedback em Solicitações RH — visão de gestor. */
export const TUTORIAL_RH_SOLICITACOES_FEEDBACK: TutorialDef = {
  id: "rh-solicitacoes-feedback",
  urlSlug: "RhSolicitacoesFeedback",
  titulo: "Registrar e Aprovar Feedback",
  section: "RH",
  icon: MessageSquare,
  relatedPageKey: "rh_solicitacoes",
  relatedTabId: "feedback",
  objetivo:
    "Como gestor, registrar um feedback nesta página ou aprovar feedbacks que a liderança registrou no Controle de Turno.",
  passos: [
    {
      titulo: "1. Abrir a aba Feedback",
      texto:
        "1. No menu, seção RH, clique em **Solicitações**.\n2. Clique na aba **Feedback**.\n3. O carrossel abre em **Em análise** — fila dos feedbacks pendentes de parecer.\n4. A tabela traz **Data do Registro**, **Liderança**, **Prestador**, **Recomendação**, **Status**, **Origem** e **Ações**.\n5. **Origem** indica se o registro veio do **Controle de Turno** (liderança no estúdio) ou desta página (**Solicitações**).",
      imagens: [
        {
          src: `${IMG}/01-aba-feedback.png`,
          alt: "Solicitações — aba Feedback em Em análise",
        },
      ],
    },
    {
      titulo: "2. Registrar um feedback",
      texto:
        "1. Clique em **Registrar Feedback** (permissão de **Editar**).\n2. Selecione o **Time** (**Game Presenter** ou **Shuffler**) e o **Prestador**.\n3. Escolha a **Recomendação**: Orientação, Alinhamento de Execução, Notificação de Descumprimento Contratual, Notificação de Suspensão da Execução Contratual ou Persistência do Descumprimento.\n4. Preencha a **Observação** com o ocorrido e os argumentos para aplicação.\n5. Clique em **Registrar**.\n6. O feedback entra em **Em análise** com origem **Solicitações** — ainda precisa do passo **Atender** para fechar o ciclo.",
      imagens: [
        {
          src: `${IMG}/02-modal-registrar-feedback.png`,
          alt: "Modal Registrar Feedback",
        },
      ],
    },
    {
      titulo: "3. Aprovar feedback da liderança (Controle de Turno)",
      texto:
        "1. Feedbacks criados em **Controle de Turno → Notificações → Feedbacks** aparecem aqui com origem **Controle de Turno** e status **Em análise** (no CT o status equivalente é **Revisar**).\n2. Clique em **Atender solicitação** na linha.\n3. Na aba **Dados**, confira prestador, recomendação, liderança, origem e a observação/ata.\n4. Na aba **Atendimento**, escolha **Aprovado** (passa a **Aplicado** no espelho do Controle de Turno) ou **Rejeitado**.\n5. Preencha **Observação do RH** e clique em **Salvar**.\n6. No Controle de Turno, o status e o campo **Aplicado Por** atualizam quando a origem for Controle de Turno.",
      aviso:
        "Feedback registrado só nesta página (origem Solicitações) **não** cria linha no Controle de Turno. O espelho bidirecional vale para origem Controle de Turno.",
      imagens: [
        {
          src: `${IMG}/03-atender-feedback.png`,
          alt: "Modal Atender feedback com origem Controle de Turno",
        },
      ],
    },
    {
      titulo: "4. Acompanhar Aplicado e Rejeitado",
      texto:
        "1. No carrossel **Aprovado**, a aba Feedback também inclui status **Aplicado** (parecer concluído).\n2. Em **Rejeitado**, consulte o parecer com **Ver**.\n3. Use **Todos Status** quando precisar ver a fila completa de uma vez.",
    },
  ],
  notasFinais:
    "— Gestores registram e/ou aprovam; liderança de piso costuma abrir o pedido no Controle de Turno.\n— Sem **Editar**, a aba é só leitura.",
};
