import { CalendarClock } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/controle-presenca";

/** Tutorial: Check-in, Check-out e Justificativa — visão Próprios (sem liderança). */
export const TUTORIAL_CONTROLE_PRESENCA: TutorialDef = {
  id: "controle-presenca",
  urlSlug: "ControledePresenca",
  titulo: "Controle de Presença",
  section: "Escala",
  icon: CalendarClock,
  relatedPageKey: "rh_calendario",
  objetivo: "Realizar o Check-in / Check-out e justificar faltas ou pendências.",
  passos: [
    {
      titulo: "1. Abrir o Calendário",
      texto:
        "1. No menu, seção Escala, clique em Calendário.\n2. A aba padrão é Compromissos: grade do mês com turnos publicados (ex.: Noite 18h–06h).",
      imagens: [{ src: `${IMG}/01-calendario-compromissos.png`, alt: "Aba Compromissos do próprio mês" }],
    },
    {
      titulo: "2. Ir para Controle de Presença",
      texto:
        "1. Clique na aba Controle de Presença.\n2. Veja o resumo (Escalados, Trocas, Venda, Compra) e a tabela do mês:\n— Situação: Escalado ou Folga\n— Entrada / Saída: Escalada vs Realizada (horário realizado em vermelho quando diverge)\n— Status: Folga, Falta, Pendente, Registrado, Em aberto, etc.\n— Ações: ícone Justificar quando o dia permite",
      imagens: [{ src: `${IMG}/02-controle-presenca.png`, alt: "Tabela Controle de Presença" }],
    },
    {
      titulo: "3. Check-in",
      texto:
        "1. Com o mês atual selecionado, use o botão Fazer Check-in (canto direito da barra).\n2. Confirme o modal Check-in Realizado (horário e mensagem «Turno iniciado, bom turno.»).\n3. Clique em Fechar.\n4. Após o check-in: o botão passa a Fazer Check-out; na linha do turno, o status fica Em aberto e a Entrada realizada é preenchida.",
      aviso: "Se aparecer aviso de rede, conecte-se à rede Spin e tente de novo.",
      imagens: [
        { src: `${IMG}/03-cta-check-in.png`, alt: "Botão Fazer Check-in" },
        { src: `${IMG}/04-modal-check-in-realizado.png`, alt: "Modal Check-in Realizado" },
      ],
    },
    {
      titulo: "4. Check-out",
      texto:
        "1. Ao encerrar o turno, clique em Fazer Check-out.\n2. Confirme o modal Check-out Realizado (horário + horas cumpridas no turno).\n3. Clique em Fechar.\n4. O status da linha tende a Registrado (ou Pendente, conforme regras do dia). O botão volta a Fazer Check-in (pode ficar desabilitado por um tempo se o fluxo do dia já estiver fechado).",
      imagens: [{ src: `${IMG}/06-modal-check-out-realizado.png`, alt: "Modal Check-out Realizado" }],
    },
    {
      titulo: "5. Justificar (Falta ou Pendente)",
      texto:
        "Use quando o status for Falta ou Pendente (após o limite) e existir o ícone Justificar na coluna Ações.\n\n1. Clique em Justificar na linha do dia.\n2. Confira a data no título do modal.\n3. Em Motivo, escolha uma opção:\n\n— Médico: início e fim do atestado, anexo e observação opcional. Ao salvar, o RH recebe uma solicitação de Atestado em Solicitações (Em análise).\n— Esquecimento: informe Correção de Entrada e Correção de Saída (HH:MM). Após salvar, a correção segue para aprovação do líder.\n— Outro: observação obrigatória descrevendo o caso.\n\n4. Clique em Salvar (ou Cancelar para sair sem registrar).\n5. Depois de salvar com sucesso, o botão Justificar some naquela linha.",
      imagens: [
        { src: `${IMG}/07-modal-justificar.png`, alt: "Modal Justificar — escolher motivo" },
        { src: `${IMG}/08-justificar-medico.png`, alt: "Justificar — motivo Médico" },
        { src: `${IMG}/09-justificar-esquecimento.png`, alt: "Justificar — motivo Esquecimento" },
        { src: `${IMG}/10-justificar-outro.png`, alt: "Justificar — motivo Outro" },
      ],
    },
  ],
  notasFinais:
    "— Realize a aprovação ou justificativa dos dias até o último dia do mês, pois as datas serão consideradas no cálculo do pagamento de horas trabalhadas.\n— Após justificar ou realizar a correção do dia, o líder imediato terá de aprovar para confirmar que aquele foi o horário realizado.",
};
