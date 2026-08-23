import { FileCheck } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/conteudo/portal-rh/ciencia-politicas";

/** Tutorial: registrar ciência em políticas e normativas do Portal de RH. */
export const TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS: TutorialDef = {
  id: "portal-rh-ciencia-politicas",
  urlSlug: "PortalRhCienciaPoliticas",
  titulo: "Ciência nas Políticas",
  section: "Conteúdo",
  icon: FileCheck,
  relatedPageKey: "rh_portal",
  relatedTabId: "politicas",
  objetivo:
    "Identificar políticas que exigem ciência e registrar o aceite após ler o documento oficial na aba Políticas e normativas.",
  passos: [
    {
      titulo: "1. Abrir Políticas e normativas",
      texto:
        "1. No menu, seção Conteúdo, clique em Portal de RH.\n2. Clique na aba **Políticas e normativas**.\n3. Use o carrossel de mês, o **Histórico** ou a busca para localizar o documento.\n4. Os filtros por família (Políticas RH, Procedimentos, Códigos, Operações) restringem a lista — **Todos** mostra tudo que você pode ver no período.",
      imagens: [
        {
          src: `${IMG}/01-aba-politicas.png`,
          alt: "Portal de RH — aba Políticas e normativas",
        },
      ],
    },
    {
      titulo: "2. Identificar se a ciência é obrigatória",
      texto:
        "Cada card exibe código, tipo, título, objetivo, versão e aplicabilidade. No canto superior direito aparece o status da **sua** ciência:\n\n— **Ciência pendente** (amarelo) — o documento exige aceite e você ainda não confirmou.\n— **Ciência não exigida** — leitura opcional; não há botão de aceite.\n— **Ciente** (verde) — aceite registrado, com a data ao lado.",
      imagens: [
        {
          src: `${IMG}/02-status-ciencia-card.png`,
          alt: "Cards com Ciência pendente, Ciência não exigida ou Ciente",
        },
      ],
    },
    {
      titulo: "3. Ler o PDF e registrar ciência",
      texto:
        "1. No card com **Ciência pendente**, clique em **Visualizar**.\n2. O modal abre o **PDF oficial** — use a barra superior para **Nova aba** ou **Baixar**, se precisar.\n3. Leia o documento com atenção.\n4. No rodapé amarelo, confirme com **Li e estou ciente**.\n5. O modal fecha e o card passa a **Ciente** com a data do registro.",
      aviso:
        "O botão **Li e estou ciente** só aparece quando o documento exige ciência e o aceite ainda está pendente. Após confirmar, você não pode desfazer o registro.",
      imagens: [
        {
          src: `${IMG}/03-modal-pdf-li-e-ciente.png`,
          alt: "Modal do PDF com rodapé de ciência e botão Li e estou ciente",
        },
      ],
    },
    {
      titulo: "4. Documento sem ciência obrigatória",
      texto:
        "Em cards com **Ciência não exigida**, você pode abrir com **Visualizar** para consultar o conteúdo.\n\nO modal **não** exibe **Li e estou ciente** — não há aceite a registrar.",
      imagens: [
        {
          src: `${IMG}/05-sem-ciencia-obrigatoria.png`,
          alt: "Card ou modal sem botão de ciência",
        },
      ],
    },
  ],
  notasFinais:
    "— Comunicados usam **Lido**; RH Talks são atas de leitura — não substituem a ciência de políticas.\n— Políticas com ciência pendente também podem aparecer na Home (bloco Informações) até o aceite.",
};
