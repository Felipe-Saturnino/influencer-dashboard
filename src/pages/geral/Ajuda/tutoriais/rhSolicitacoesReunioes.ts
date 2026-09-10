import { Users } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/solicitacoes/reunioes";

/** Tutorial: agendar e atender reuniões em Solicitações RH — visão de gestor. */
export const TUTORIAL_RH_SOLICITACOES_REUNIOES: TutorialDef = {
  id: "rh-solicitacoes-reunioes",
  urlSlug: "RhSolicitacoesReunioes",
  titulo: "Agendar e Atender Reunião",
  section: "RH",
  icon: Users,
  relatedPageKey: "rh_solicitacoes",
  relatedTabId: "reunioes",
  objetivo:
    "Como gestor, agendar uma reunião com o prestador ou atender (aprovar/rejeitar) uma reunião pendente na aba Reuniões.",
  passos: [
    {
      titulo: "1. Abrir a aba Reuniões",
      texto:
        "1. No menu, seção RH, clique em **Solicitações**.\n2. Na segunda linha da barra, clique na aba **Reuniões**.\n3. O carrossel de status abre em **Em análise** — fila das reuniões aguardando parecer.\n4. A lista inclui **Reunião com RH** e **Reunião com Liderança** (pedidos pelo Calendário ou agendados nesta página).",
      imagens: [
        {
          src: `${IMG}/01-aba-reunioes.png`,
          alt: "Solicitações — aba Reuniões em Em análise",
        },
      ],
    },
    {
      titulo: "2. Agendar uma reunião",
      texto:
        "1. Clique em **Agendar Reunião** (exige permissão de **Editar**).\n2. Em **Tipo de Reunião**, escolha **Reunião com RH** ou **Reunião com Liderança**.\n3. Selecione o **Prestador**.\n4. Informe a **Data Solicitada** — deve ser um dia **futuro**.\n5. Preencha a **Observação** (intuito da ata).\n6. Clique em **Agendar**.\n7. A solicitação entra em **Em análise**. Só depois do **Aprovado** a reunião aparece como **Agendado** no **Calendário** do prestador (e de quem atendeu, quando aplicável).",
      imagens: [
        {
          src: `${IMG}/02-modal-agendar-reuniao.png`,
          alt: "Modal Agendar Reunião",
        },
      ],
    },
    {
      titulo: "3. Atender uma reunião pendente",
      texto:
        "1. Em **Em análise**, na linha desejada, clique no ícone de lápis (**Atender solicitação**).\n2. Na aba **Dados**, confira tipo, **Data da reunião**, turno (se houver) e o motivo.\n3. Na aba **Atendimento**, escolha **Status** **Aprovado** ou **Rejeitado**.\n4. Preencha **Observação do RH** (obrigatória ao mudar o status).\n5. Clique em **Salvar**.\n6. Com **Aprovado**, a reunião passa a constar no **Calendário**. Com **Rejeitado**, o pedido encerra e o prestador vê o parecer.",
      aviso:
        "Pedidos feitos pelo prestador no Calendário (**Agendar Reunião**) também chegam aqui em Em análise — o gestor ou o RH conclui o atendimento nesta aba.",
    },
    {
      titulo: "4. Consultar reuniões já atendidas",
      texto:
        "1. No carrossel, vá para **Aprovado** ou **Rejeitado** (ou use **Todos Status**).\n2. Use o ícone **Ver** — abas **Dados** e **Atendimento** mostram data, parecer e quem atendeu.\n3. A ação **Atender** não aparece mais após o parecer.",
    },
  ],
  notasFinais:
    "— Reunião com RH e Reunião com Liderança compartilham a mesma aba e o mesmo fluxo de atendimento.\n— Sem permissão de **Editar**, a aba é só leitura (sem Agendar nem Atender).",
};
