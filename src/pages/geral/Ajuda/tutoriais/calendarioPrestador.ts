import { CalendarDays } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/calendario";

/** Tutorial: leitura da escala e agendamento de reuniões no Calendário com Ver = Próprios. */
export const TUTORIAL_CALENDARIO_PRESTADOR: TutorialDef = {
  id: "calendario-prestador",
  urlSlug: "Calendario",
  titulo: "Calendário",
  section: "Escala",
  icon: CalendarDays,
  relatedPageKey: "rh_calendario",
  relatedTabId: "compromissos",
  objetivo:
    "Consultar os dias escalados e as folgas do mês e solicitar o agendamento de uma reunião.",
  passos: [
    {
      titulo: "1. Abrir o Calendário",
      texto:
        "1. No menu, seção Escala, clique em Calendário.\n2. A aba Compromissos abre com o mês disponível.\n3. Use as setas ao lado do mês para consultar outros períodos.\n4. O filtro Todos Compromissos permite mostrar apenas Eventos, Reuniões, Treinamentos, Feedback ou Turnos.",
    },
    {
      titulo: "2. Identificar dias escalados e folgas",
      texto:
        "1. Em um mês com a escala aprovada, os dias escalados exibem um cartão dentro do quadro do dia.\n2. O cartão informa o turno e os horários de início e fim.\n3. Os quadros que mostram apenas o número do dia, sem cartão de turno, são as suas folgas.\n4. Clique em um quadro para abrir os detalhes daquele dia e consultar todos os compromissos.",
      aviso:
        "Se aparecer o aviso de que não há escala aprovada para o mês, os quadros podem ficar vazios porque a escala ainda não foi publicada — nesse caso, eles não devem ser interpretados como folga.",
      imagens: [
        {
          src: `${IMG}/01-calendario-compromissos-folgas.png`,
          alt: "Calendário com cartões nos dias escalados e quadros sem cartão nos dias de folga",
        },
      ],
    },
    {
      titulo: "3. Solicitar uma reunião",
      texto:
        "1. Na barra superior do Calendário, clique em Nova Agenda.\n2. Em Com quem será a reunião, escolha uma opção: Shift Lead, Gerente de Operações, RH ou Figurino.\n3. Em Motivo da Reunião, explique o assunto que deseja tratar.\n4. Em Data da reunião, escolha uma data futura em que você esteja escalado. As folgas não aparecem nessa lista.\n5. Clique em Agendar reunião — ou em Cancelar para sair sem registrar.",
      imagens: [
        {
          src: `${IMG}/02-agendar-reuniao.png`,
          alt: "Modal Agendar reunião com destino, motivo e data escalada",
        },
      ],
    },
    {
      titulo: "4. Acompanhar a reunião no calendário",
      texto:
        "1. Depois do agendamento, a reunião aparece no quadro da data escolhida.\n2. Clique no dia para conferir os detalhes.\n3. Reunião com RH fica Em Análise até a resposta do RH; depois aparece como Aprovada ou Recusada.\n4. Os demais destinos entram como Agendado.",
    },
  ],
  notasFinais:
    "— O Calendário reflete a escala aprovada do mês.\n— Quadro sem cartão de turno significa folga somente quando a escala do mês estiver aprovada.\n— O botão Download gera um PDF do seu calendário pessoal.",
};
