import { BookCheck } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/ciencia-manuais";

/** Tutorial: identificar e dar ciência em manuais obrigatórios no Portal da Academy. */
export const TUTORIAL_CIENCIA_MANUAIS_ACADEMY: TutorialDef = {
  id: "ciencia-manuais-academy",
  urlSlug: "CienciaManuaisAcademy",
  titulo: "Ciência nos Manuais",
  section: "Academy",
  icon: BookCheck,
  relatedPageKey: "academy_portal",
  relatedTabId: "manuais",
  objetivo:
    "Identificar se um manual exige ciência e registrar o aceite Lido e Ciente na aba Manuais.",
  passos: [
    {
      titulo: "1. Abrir a aba Manuais",
      texto:
        "1. No menu, seção Academy, clique em Portal da Academy.\n2. Clique na aba Manuais.\n3. Os manuais aparecem em cards com código, tipo, título, introdução, jogos e o status da sua ciência.",
    },
    {
      titulo: "2. Identificar se a ciência é obrigatória",
      texto:
        "1. Observe o status no canto superior direito de cada card.\n2. Ciência pendente (em amarelo) significa que o manual exige o seu aceite e ainda não foi confirmado.\n3. Ciência não exigida significa que o manual não exige ciência — você pode ler, mas não precisa confirmar aceite.\n4. Depois do aceite, o status passa a Ciente, com a data do registro.",
      imagens: [
        {
          src: `${IMG}/01-manuais-sua-ciencia.png`,
          alt: "Cards de Manuais com status de ciência Pendente ou Ciência não exigida",
        },
      ],
    },
    {
      titulo: "3. Ler e confirmar quando estiver Pendente",
      texto:
        "1. No card com Ciência pendente, clique em Visualizar.\n2. No modal Ler manual, leia a introdução, a descrição e, se houver, imagens, vídeos e anexos.\n3. Role até o final do modal e clique em Lido e Ciente.\n4. O modal fecha e o status do card muda para Ciente com a data.",
      aviso:
        "O botão Lido e Ciente só aparece quando o manual exige ciência e o aceite ainda está pendente. Após confirmar, o registro não pode ser desfeito por você.",
      imagens: [
        {
          src: `${IMG}/02-ler-manual-lido-e-ciente.png`,
          alt: "Modal Ler manual com botão Lido e Ciente",
        },
      ],
    },
    {
      titulo: "4. Manual sem ciência obrigatória",
      texto:
        "1. Em cards com Ciência não exigida, você pode abrir o manual para consultar o conteúdo.\n2. O modal Ler manual não exibe o botão Lido e Ciente — não há aceite a registrar.",
      imagens: [
        {
          src: `${IMG}/03-ler-manual-sem-ciencia-obrigatoria.png`,
          alt: "Modal Ler manual sem botão Lido e Ciente",
        },
      ],
    },
  ],
  notasFinais:
    "— Manuais com ciência pendente também podem aparecer na Home (Central Academy) até o aceite.\n— Ciência obrigatória vale quando o manual exige aceite e o seu time está entre os aplicáveis; caso contrário, o card mostra Ciência não exigida.\n— Com Editar = Sim, o botão Ver ciência no card lista quem já registrou o aceite.",
};
