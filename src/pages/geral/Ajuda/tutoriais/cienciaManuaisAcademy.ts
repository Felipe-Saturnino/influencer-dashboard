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
  objetivo:
    "Identificar se um manual exige ciência e registrar o aceite Lido e Ciente na aba Manuais.",
  passos: [
    {
      titulo: "1. Abrir a aba Manuais",
      texto:
        "1. No menu, seção Academy, clique em Portal da Academy.\n2. Clique na aba Manuais.\n3. A tabela Manuais de treinamento lista os documentos publicados, com código, título, versão, tipo, jogos e a coluna Sua Ciência.",
    },
    {
      titulo: "2. Identificar se a ciência é obrigatória",
      texto:
        "1. Observe a coluna Sua Ciência em cada linha.\n2. Pendente (em amarelo) significa que o manual exige o seu aceite e ainda não foi confirmado.\n3. O travessão (—) significa que o manual não exige ciência — você pode ler, mas não precisa confirmar aceite.\n4. Depois do aceite, a coluna passa a Ciente, com a data do registro.",
      imagens: [
        {
          src: `${IMG}/01-manuais-sua-ciencia.png`,
          alt: "Tabela Manuais com coluna Sua Ciência em Pendente ou travessão",
        },
      ],
    },
    {
      titulo: "3. Ler e confirmar quando estiver Pendente",
      texto:
        "1. Na linha com Pendente, clique no ícone de visualizar (olho) na coluna Ação.\n2. No modal Ler manual, leia a introdução, a descrição e, se houver, imagens, vídeos e anexos.\n3. Role até o final do modal e clique em Lido e Ciente.\n4. O modal fecha e a coluna Sua Ciência muda para Ciente com a data.",
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
        "1. Em linhas com travessão (—) na coluna Sua Ciência, você pode abrir o manual para consultar o conteúdo.\n2. O modal Ler manual não exibe o botão Lido e Ciente — não há aceite a registrar.",
      imagens: [
        {
          src: `${IMG}/03-ler-manual-sem-ciencia-obrigatoria.png`,
          alt: "Modal Ler manual sem botão Lido e Ciente",
        },
      ],
    },
  ],
  notasFinais:
    "— Manuais com ciência pendente também podem aparecer na Home (Central Academy) até o aceite.\n— Ciência obrigatória vale quando o manual exige aceite e o seu time está entre os aplicáveis; caso contrário, a coluna mostra travessão.",
};
