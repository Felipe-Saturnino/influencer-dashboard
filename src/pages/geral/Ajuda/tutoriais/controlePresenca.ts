import { CalendarClock } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/controle-presenca";

/** Tutorial: Check-in e Check-out no Controle de Presença. */
export const TUTORIAL_CONTROLE_PRESENCA: TutorialDef = {
  id: "controle-presenca",
  urlSlug: "ControledePresenca",
  titulo: "Controle de Presença",
  section: "Escala",
  icon: CalendarClock,
  relatedPageKey: "rh_calendario",
  relatedTabId: "presenca",
  objetivo: "Realizar o Check-in e o Check-out no Controle de Presença.",
  passos: [
    {
      titulo: "1. Abrir a aba Controle de Presença",
      texto:
        "1. No menu, seção Escala, clique em Calendário.\n2. Clique na aba Controle de Presença.\n3. Veja o resumo (Escalados, Trocas, Venda, Compra) e a tabela do mês:\n— Situação: Escalado ou Folga\n— Entrada / Saída: Escalada vs Realizada (horário realizado em vermelho quando diverge)\n— Status: Folga, Falta, Pendente, Registrado, Em aberto, etc.",
      imagens: [{ src: `${IMG}/02-controle-presenca.png`, alt: "Tabela Controle de Presença" }],
    },
    {
      titulo: "2. Check-in",
      texto:
        "1. Com o mês atual selecionado, use o botão Fazer Check-in (canto direito da barra).\n2. Confirme o modal Check-in Realizado (horário e mensagem «Turno iniciado, bom turno.»).\n3. Clique em Fechar.\n4. Após o check-in: o botão passa a Fazer Check-out; na linha do turno, o status fica Em aberto e a Entrada realizada é preenchida.",
      aviso: "Se aparecer aviso de rede, conecte-se à rede Spin e tente de novo.",
      imagens: [
        { src: `${IMG}/03-cta-check-in.png`, alt: "Botão Fazer Check-in" },
        { src: `${IMG}/04-modal-check-in-realizado.png`, alt: "Modal Check-in Realizado" },
      ],
    },
    {
      titulo: "3. Check-out",
      texto:
        "1. Ao encerrar o turno, clique em Fazer Check-out.\n2. Confirme o modal Check-out Realizado (horário + horas cumpridas no turno).\n3. Clique em Fechar.\n4. O status da linha tende a Registrado (ou Pendente, conforme regras do dia). O botão volta a Fazer Check-in (pode ficar desabilitado por um tempo se o fluxo do dia já estiver fechado).",
      imagens: [{ src: `${IMG}/06-modal-check-out-realizado.png`, alt: "Modal Check-out Realizado" }],
    },
  ],
  notasFinais:
    "— Realize a aprovação dos dias até o último dia do mês, pois as datas serão consideradas no cálculo do pagamento de horas trabalhadas.\n— Para justificar Falta ou Pendente (atestado ou esquecimento), use o tutorial Justificativa de Presença.",
};
