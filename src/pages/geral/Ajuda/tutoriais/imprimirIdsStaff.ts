import { Printer } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/escala/gestao-staff";

/** Tutorial: gerar PDF de etiquetas de ID (barcode) na Gestão de Staff. */
export const TUTORIAL_IMPRIMIR_IDS_STAFF: TutorialDef = {
  id: "imprimir-ids-staff",
  urlSlug: "ImprimirIdsStaff",
  titulo: "Imprimir IDs",
  section: "Escala",
  icon: Printer,
  relatedPageKey: "rh_staff",
  objetivo:
    "Gerar um PDF com etiquetas de 8×6 cm (código de barras, número e nickname) para impressão dos IDs do staff.",
  passos: [
    {
      titulo: "1. Abrir Imprimir IDs",
      texto:
        "1. No menu, seção Escala, clique em Gestão de Staff.\n2. Na barra de filtros (junto à pesquisa), clique em Imprimir IDs — o botão fica à direita da fileira.",
      imagens: [
        {
          src: `${IMG}/01-imprimir-ids-botao.png`,
          alt: "Gestão de Staff com o botão Imprimir IDs na barra de filtros",
        },
      ],
    },
    {
      titulo: "2. Selecionar prestadores",
      texto:
        "1. No modal Imprimir IDs, use a busca por nickname, nome, time ou barcode se precisar filtrar.\n2. Marque os prestadores que têm barcode — quem está sem barcode aparece na lista, mas fica desabilitado e não entra na impressão.\n3. Use Selecionar todos com barcode para marcar de uma vez quem já tem código, ou Limpar seleção para recomeçar.",
      imagens: [
        {
          src: `${IMG}/02-imprimir-ids-modal.png`,
          alt: "Modal Imprimir IDs com lista de prestadores e aviso de quem está sem barcode",
        },
      ],
    },
    {
      titulo: "3. Gerar o PDF",
      texto:
        "1. Com ao menos um prestador selecionado, clique em Gerar PDF.\n2. O navegador baixa um único ficheiro A4 com até 8 etiquetas por folha (8×6 cm), com guia de corte, código de barras, número e nickname.\n3. Imprima o PDF e corte pelas guias.",
      imagens: [
        {
          src: `${IMG}/03-imprimir-ids-selecionados.png`,
          alt: "Modal Imprimir IDs com prestadores selecionados e botão Gerar PDF",
        },
      ],
    },
  ],
  notasFinais:
    "— Cadastre o barcode na edição do Staff (aba Dados de função) antes de imprimir.\n— Se o PDF não baixar, permita downloads neste site; se o problema persistir, entre em contato com o suporte.",
};
