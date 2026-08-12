import { Megaphone } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/conteudo/portal-rh";

/** Tutorial: ver quem leu comunicados no Portal de RH. */
export const TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS: TutorialDef = {
  id: "portal-rh-comunicados-lidos",
  urlSlug: "PortalRhComunicadosLidos",
  titulo: "Ver Lidos nos Comunicados",
  section: "Conteúdo",
  icon: Megaphone,
  relatedPageKey: "rh_portal",
  relatedTabId: "comunicados",
  objetivo:
    "Consultar quem marcou um comunicado como lido na aba Comunicados do Portal de RH.",
  passos: [
    {
      titulo: "1. Abrir a aba Comunicados",
      texto:
        "1. No menu, seção Conteúdo, clique em Portal de RH.\n2. Clique na aba Comunicados.\n3. Use o carrossel de mês, o Histórico ou a busca para encontrar o comunicado.\n4. Em cada card, com permissão de Editar nesta página, aparece o botão Ver Lidos ao lado de Lido.",
      imagens: [
        {
          src: `${IMG}/01-comunicados-ver-lidos.png`,
          alt: "Aba Comunicados com cards e botão Ver Lidos",
        },
      ],
    },
    {
      titulo: "2. Ver quem leu",
      texto:
        "1. Clique em Ver Lidos no comunicado desejado.\n2. O modal lista o nome de quem registrou a leitura e a data/hora.\n3. Feche o modal pelo X quando terminar.",
      imagens: [
        {
          src: `${IMG}/02-modal-lidos.png`,
          alt: "Modal Lidos com lista de quem leu o comunicado",
        },
      ],
    },
  ],
  notasFinais:
    "— O botão Ver Lidos só aparece com permissão de Editar no Portal de RH.\n— A lista reflete quem clicou em Lido naquele comunicado.",
};
