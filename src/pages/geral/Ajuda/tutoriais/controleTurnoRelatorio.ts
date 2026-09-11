import { ClipboardPen } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/controle-turno/relatorio";

/** Tutorial: gerar, salvar rascunho, publicar e consultar Relatório de Turno. */
export const TUTORIAL_CONTROLE_TURNO_RELATORIO: TutorialDef = {
  id: "controle-turno-relatorio",
  urlSlug: "ControleTurnoRelatorio",
  titulo: "Relatório de Turno",
  section: "Estúdio",
  icon: ClipboardPen,
  relatedPageKey: "escala_controle_turno",
  relatedTabId: "relatorio",
  objetivo:
    "Criar rascunho, publicar o relatório do turno e consultar turnos anteriores na aba Relatório de Turno.",
  passos: [
    {
      titulo: "1. Abrir a aba Relatório de Turno",
      texto:
        "1. No menu, seção Estúdio, clique em **Controle de Turno**.\n2. Na barra de abas, clique em **Relatório de Turno**.\n3. Escolha o **dia** no carrossel (ou **Hoje**). Nesta aba o filtro Manhã/Tarde/Noite some — os três turnos aparecem juntos.\n4. O bloco **Controle dos Turnos** mostra o status de cada turno: **Relatório não Iniciado**, **Relatório em Rascunho** ou **Relatório Publicado**.\n5. Abaixo, um card por turno (Manhã, Tarde, Noite) com indicadores de Escalados, Presentes, Atrasados e Faltas — calculados pela Escala do Turno daquele dia (entrada atrasada conta a partir de 5 minutos após o horário previsto).",
      imagens: [
        {
          src: `${IMG}/01-aba-relatorio.png`,
          alt: "Aba Relatório de Turno com status dos três turnos",
        },
      ],
    },
    {
      titulo: "2. Gerar o relatório (rascunho)",
      texto:
        "1. No card do turno desejado (status **não Iniciado**), clique em **Gerar Relatório** (exige permissão de **Criar**).\n2. Abre o modal **Gerar Relatório — [turno]** com três abas:\n   — **Andamento do Turno** — SOS, Figurino e Equipamentos (texto ou marque «Não houveram…»).\n   — **Manutenção** — checklists (Limpeza das Roletas, Limpeza das Mesas, Trocas de Cartas, Limpeza da CC Machine, Cartas Contadas).\n   — **Anotações** — **Comentários Gerais** (obrigatório).\n3. Preencha o que ocorreu no turno. Troque de aba sem perder o preenchimento.\n4. Clique em **Salvar rascunho** para gravar sem publicar. O status do card passa a **Relatório em Rascunho**.",
      imagens: [
        {
          src: `${IMG}/02-gerar-relatorio.png`,
          alt: "Modal Gerar Relatório com abas Andamento, Manutenção e Anotações",
        },
      ],
    },
    {
      titulo: "3. Continuar o rascunho",
      texto:
        "1. No card com **Relatório em Rascunho**, clique em **Editar Rascunho** (permissão de **Editar**).\n2. O modal **Editar Rascunho — [turno]** reabre com os campos já salvos.\n3. Ajuste SOS, figurino, equipamentos, checklists ou comentários.\n4. **Salvar rascunho** de novo atualiza o registro sem publicar.",
      imagens: [
        {
          src: `${IMG}/03-editar-rascunho.png`,
          alt: "Card com Relatório em Rascunho e Editar Rascunho",
        },
      ],
    },
    {
      titulo: "4. Publicar o relatório",
      texto:
        "1. No modal (gerar ou editar), clique em **Publicar**.\n2. Para publicar, **todos** os prestadores da **Escala do Turno** daquele dia/turno precisam estar com **Aprovado Sim**.\n3. Se ainda faltar aprovação, aparece o aviso **Não é possível publicar** — o sistema oferece **Salvar como Rascunho** até a Escala do Turno estar completa.\n4. Com a escala aprovada, **Publicar** grava o relatório final. O status vira **Relatório Publicado**.",
      aviso:
        "Publique só depois de concluir as sinalizações e aprovações na aba Escala do Turno.",
      imagens: [
        {
          src: `${IMG}/04-publicar-relatorio.png`,
          alt: "Rodapé do modal com Salvar rascunho e Publicar",
        },
      ],
    },
    {
      titulo: "5. Consultar turnos antigos",
      texto:
        "1. No carrossel, volte para o **dia** desejado (passados sem limite; futuro só até amanhã).\n2. Os cards mostram o que já foi gerado, rascunhado ou publicado naquele dia.\n3. Em relatório publicado ou em rascunho, use o ícone **Ver histórico** para ver quem criou/salvou/publicou e quando.\n4. A busca no topo filtra por relator ou palavras-chave do conteúdo (SOS, figurino, comentários, etc.).",
      imagens: [
        {
          src: `${IMG}/05-consultar-dia-anterior.png`,
          alt: "Relatório de Turno em dia anterior com histórico",
        },
      ],
    },
  ],
  notasFinais:
    "— Checklist de manutenção do relatório é do fechamento do turno; pedidos de manutenção abertos ficam na aba **Notificações**.",
};
