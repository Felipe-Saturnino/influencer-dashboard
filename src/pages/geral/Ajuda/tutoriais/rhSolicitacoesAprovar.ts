import { ClipboardList } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/solicitacoes";

/** Tutorial: aprovar atestado e reunião com RH em Solicitações (seção RH). */
export const TUTORIAL_RH_SOLICITACOES_APROVAR: TutorialDef = {
  id: "rh-solicitacoes-aprovar",
  urlSlug: "RhSolicitacoesAprovar",
  titulo: "Aprovar Atestado e Reunião",
  section: "RH",
  icon: ClipboardList,
  relatedPageKey: "rh_solicitacoes",
  objetivo:
    "Atender solicitações de Atestado e de Reunião com RH — status, abono remunerado e o que muda no Calendário, na Escala e no Marketplace.",
  passos: [
    {
      titulo: "1. Abrir Solicitações",
      texto:
        "1. No menu, seção RH, clique em Solicitações.\n2. O carrossel de status abre em Em análise — é a fila das solicitações pendentes.\n3. Atestados entram sozinhos nesta fila quando alguém registra justificativa Médico no Calendário (Controle de Presença), já com status Em análise.\n4. Use o filtro Tipo de solicitação para restringir a Atestado, se quiser.",
      imagens: [
        {
          src: `${IMG}/01-lista-em-analise.png`,
          alt: "Página Solicitações com status Em análise e lista de atestados",
        },
      ],
    },
    {
      titulo: "2. Abrir Atender",
      texto:
        "1. Com o carrossel em Em análise, na coluna Ações clique no ícone de lápis (Atender solicitação). Essa ação exige permissão de Editar.\n2. No modal Atender solicitação, a aba Dados mostra solicitante, tipo, status Em análise e os detalhes do pedido.\n3. Confira o período do atestado e abra o anexo do documento antes de decidir.",
      imagens: [
        {
          src: `${IMG}/02-atender-atestado-dados.png`,
          alt: "Modal Atender solicitação — aba Dados de um atestado",
        },
      ],
    },
    {
      titulo: "3. Aprovar um atestado",
      texto:
        "1. Clique na aba Atendimento.\n2. Em Status, escolha Aprovado.\n3. Em Abono remunerado?, selecione SIM ou NÃO — o campo é obrigatório neste tipo.\n4. Preencha Observação do RH (obrigatória ao mudar o status).\n5. Clique em Salvar.\n6. A solicitação sai de Em análise e passa para o carrossel Aprovado. A ação Atender some; fica só Ver.",
      imagens: [
        {
          src: `${IMG}/03-atender-atestado-aprovacao.png`,
          alt: "Aba Atendimento com Status Aprovado e Abono remunerado SIM",
        },
      ],
    },
    {
      titulo: "4. O que muda após aprovar",
      texto:
        "1. Com Abono remunerado = SIM, no Calendário (Controle de Presença) o Status fica Abonado só nos dias que eram Escalado, Troca ou Compra. Os demais dias do período mantêm o Status que já tinham.\n2. Com Abono remunerado = NÃO, o Status fica Atestado em todos os dias do período.\n3. Em ambos os casos, a Escala grava Atestado em todo o período — inclusive dias de Folga ou Venda.\n4. Vendas de Folga ainda abertas no Marketplace nesse intervalo são canceladas.",
    },
    {
      titulo: "5. Filtrar Reunião com RH",
      texto:
        "1. Na barra de filtros, em Tipo de solicitação, escolha Reunião com RH.\n2. Em Em análise, use Atender na linha desejada — o fluxo é o mesmo do atestado.\n3. Na aba Dados, confira data da reunião, turno e motivo.",
      imagens: [
        {
          src: `${IMG}/04-filtro-reuniao-rh.png`,
          alt: "Lista filtrada por Reunião com RH",
        },
      ],
    },
    {
      titulo: "6. Aprovar uma reunião",
      texto:
        "1. Na aba Atendimento, escolha Status Aprovado.\n2. Preencha Observação do RH.\n3. Clique em Salvar — não há campo de abono remunerado neste tipo.\n4. Depois de aprovada, a reunião passa a aparecer no Calendário para o solicitante e para quem atendeu.",
      imagens: [
        {
          src: `${IMG}/05-reuniao-ver.png`,
          alt: "Solicitação de Reunião com RH (detalhes após o atendimento)",
        },
      ],
    },
  ],
  notasFinais:
    "— Para rejeitar um atestado: na aba Atendimento, Status Rejeitado, Observação do RH e Salvar. No Calendário, o Status desses dias volta a Falta. A solicitação fica no carrossel Rejeitado, só com a ação Ver.\n— Solicitações já aprovadas ou rejeitadas ficam só com a ação Ver.",
};
