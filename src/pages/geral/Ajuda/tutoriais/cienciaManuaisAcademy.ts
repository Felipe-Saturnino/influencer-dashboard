import { BookCheck } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/academy/ciencia-manuais";

/** Tutorial: ler manual completo (anexos) e registrar ciência no Portal da Academy. */
export const TUTORIAL_CIENCIA_MANUAIS_ACADEMY: TutorialDef = {
  id: "ciencia-manuais-academy",
  urlSlug: "CienciaManuaisAcademy",
  titulo: "Ciência nos Manuais",
  section: "Academy",
  icon: BookCheck,
  relatedPageKey: "academy_portal",
  relatedTabId: "manuais",
  objetivo:
    "Abrir o conteúdo completo de um manual (texto, imagens, vídeos e anexos) e registrar o aceite **Lido e Ciente** quando a ciência for obrigatória.",
  passos: [
    {
      titulo: "1. Abrir a aba Manuais",
      texto:
        "1. No menu, seção Academy, clique em **Portal da Academy**.\n2. Clique na aba **Manuais**.\n3. Use o carrossel de mês ou **Histórico** para localizar o manual.\n4. Os filtros por tipo (Jogos, Imagem, Comunicação, Geral) restringem a lista.",
      imagens: [
        {
          src: `${IMG}/01-aba-manuais.png`,
          alt: "Portal da Academy — aba Manuais",
        },
      ],
    },
    {
      titulo: "2. Identificar ciência no card",
      texto:
        "No canto superior direito de cada card:\n\n— **Ciência pendente** (amarelo) — manual exige aceite e você ainda não confirmou.\n— **Ciência não exigida** — leitura opcional, sem botão de aceite.\n— **Ciente** (verde) — aceite já registrado, com a data.\n\nManuais com ciência pendente também podem aparecer na Home (Central Academy) até o aceite.",
      imagens: [
        {
          src: `${IMG}/01-manuais-sua-ciencia.png`,
          alt: "Cards de manuais com status de ciência",
        },
      ],
    },
    {
      titulo: "3. Abrir o conteúdo completo",
      texto:
        "1. No card desejado, clique em **Visualizar**.\n2. O modal **Ler manual** exibe título, **Introdução**, **Descrição** (texto formatado) e, quando houver, a seção **Imagem e vídeo**.\n3. Role até o final — em **Anexos**, use **Ver anexo** para abrir cada arquivo em nova aba (PDF, planilha, etc.).\n4. Leia todo o material antes de confirmar a ciência.",
      imagens: [
        {
          src: `${IMG}/02-modal-conteudo-anexos.png`,
          alt: "Modal Ler manual com descrição, mídia e links Ver anexo",
        },
      ],
    },
    {
      titulo: "4. Registrar Lido e Ciente",
      texto:
        "Quando o manual exige ciência e o aceite ainda está pendente:\n\n1. Após ler o conteúdo e abrir os anexos necessários, clique em **Lido e Ciente** no rodapé do modal.\n2. O modal fecha e o card passa a **Ciente** com a data do registro.\n\nO botão não aparece em manuais sem ciência obrigatória nem depois que você já confirmou.",
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
      titulo: "5. Manual sem ciência obrigatória",
      texto:
        "Em cards com **Ciência não exigida**, você pode abrir com **Visualizar** para consultar introdução, descrição e anexos.\n\nO modal **não** exibe **Lido e Ciente** — não há aceite a registrar.",
      imagens: [
        {
          src: `${IMG}/03-ler-manual-sem-ciencia-obrigatoria.png`,
          alt: "Modal Ler manual sem botão de ciência",
        },
      ],
    },
  ],
  notasFinais:
    "— Comunicados e Dicas usam reações com emoji — isso não substitui a ciência dos Manuais.",
};
