import { FileWarning } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/justificativa-presenca";

/**
 * Tutorial: justificar Falta / Pendente no Controle de Presença
 * (Médico / atestado e Esquecimento).
 */
export const TUTORIAL_JUSTIFICATIVA_PRESENCA: TutorialDef = {
  id: "justificativa-presenca",
  urlSlug: "JustificativaPresenca",
  titulo: "Justificativa de Presença",
  section: "Escala",
  icon: FileWarning,
  relatedPageKey: "rh_calendario",
  relatedTabId: "presenca",
  objetivo:
    "Justificar um dia com status Falta ou Pendente — atestado médico ou esquecimento de Check-in / Check-out.",
  passos: [
    {
      titulo: "1. Quando justificar",
      texto:
        "1. No menu, seção Escala, clique em Calendário → aba Controle de Presença.\n2. Na tabela do mês, localize o dia com Status Falta ou Pendente (após o limite do turno).\n3. Na coluna Ações, clique no ícone Justificar.\n4. Abre o modal Justificar com a data do dia no subtítulo.",
      imagens: [
        {
          src: `${IMG}/01-tabela-justificar.png`,
          alt: "Tabela Controle de Presença com coluna Ações",
        },
        {
          src: `${IMG}/02-modal-motivo.png`,
          alt: "Modal Justificar — escolha do Motivo",
        },
      ],
    },
    {
      titulo: "2. Motivo Médico (atestado)",
      texto:
        "1. Em Motivo, escolha Médico.\n2. Informe Início do Atestado e Fim do Atestado (obrigatórios).\n3. Em Atestado, anexe o arquivo do documento (obrigatório).\n4. Observação é opcional.\n5. Clique em Salvar.\n6. O status da linha fica Em análise até o RH atender a solicitação de Atestado em Solicitações (seção RH).\n7. Se o RH aprovar com Abono remunerado = SIM, os dias cobertos pelo atestado passam a Status Abonado.",
      imagens: [
        {
          src: `${IMG}/03-motivo-medico.png`,
          alt: "Justificar — motivo Médico com período e anexo",
        },
      ],
    },
    {
      titulo: "3. Motivo Esquecimento",
      texto:
        "1. Em Motivo, escolha Esquecimento — use quando esqueceu de registrar o Check-in e/ou o Check-out.\n2. Preencha Correção de Entrada e Correção de Saída no formato HH:MM (ex.: digitar 0800 vira 08:00).\n3. Clique em Salvar.\n4. A correção segue para análise do líder imediato (por campo — entrada e saída), sem autoaprovação.\n5. Depois que o líder aprovar, os horários realizados ficam confirmados na linha.",
      imagens: [
        {
          src: `${IMG}/04-motivo-esquecimento.png`,
          alt: "Justificar — motivo Esquecimento com correção de entrada e saída",
        },
      ],
    },
  ],
  notasFinais:
    "— Depois de salvar a justificativa, o botão Justificar some naquela linha.\n— Motivo Outro usa o mesmo formulário de horários que Esquecimento (também vai para o líder).\n— Atestado médico não é aprovado pelo líder no Calendário — o atendimento é em Solicitações (RH).",
};
