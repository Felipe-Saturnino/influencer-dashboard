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
    "Atender e aprovar solicitações de Atestado e de Reunião com RH na página Solicitações.",
  passos: [
    {
      titulo: "1. Abrir Solicitações",
      texto:
        "1. No menu, seção RH, clique em Solicitações.\n2. O carrossel de status abre em Em análise — é onde ficam as solicitações pendentes de atendimento.\n3. Use o filtro Tipo de solicitação para restringir a Atestado ou Reunião com RH, se quiser.",
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
        "1. Na coluna Ações, clique no ícone de lápis (Atender solicitação).\n2. No modal Atender solicitação, a aba Dados mostra solicitante, tipo, status e os detalhes do pedido.\n3. Em Atestado, confira o período e o anexo do documento.",
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
        "1. Clique na aba Atendimento.\n2. Em Status, escolha Aprovado.\n3. Em Abono remunerado?, selecione SIM ou NÃO.\n4. Preencha Observação do RH (obrigatória ao mudar o status).\n5. Clique em Salvar.\n6. Com SIM, no Calendário o Status fica Abonado nos dias Escalado/Troca/Compra; com NÃO, fica Atestado em todos os dias do período. Em ambos os casos a Escala mostra Atestado em todo o período e vendas de Folga abertas no Marketplace nesse intervalo são canceladas.",
      imagens: [
        {
          src: `${IMG}/03-atender-atestado-aprovacao.png`,
          alt: "Aba Atendimento com Status Aprovado e Abono remunerado",
        },
      ],
    },
    {
      titulo: "4. Filtrar Reunião com RH",
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
      titulo: "5. Aprovar uma reunião",
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
    "— Para rejeitar, use Status Rejeitado na aba Atendimento, com observação, e Salvar.\n— Solicitações já aprovadas ou rejeitadas ficam só com a ação Ver.",
};
