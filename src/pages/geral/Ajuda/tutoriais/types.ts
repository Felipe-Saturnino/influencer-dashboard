import type { LucideIcon } from "lucide-react";
import type { PageKey } from "../../../../types";

/** Passo numerado do tutorial (texto + imagens opcionais). */
export type TutorialPasso = {
  titulo: string;
  /** Parágrafos / listas em texto simples (quebras com \n). */
  texto: string;
  imagens?: { src: string; alt: string }[];
};

export type TutorialDef = {
  id: string;
  /** Rótulo no menu lateral — ex.: Controle de Presença */
  titulo: string;
  /** Secção do menu (mesmo nome de `menu.ts`) — ex.: Escala */
  section: string;
  icon: LucideIcon;
  /** Se definido, o tutorial só aparece com Ver sim|próprios nesta página. */
  relatedPageKey?: PageKey;
  publico: string;
  objetivo: string;
  preRequisitos?: string;
  tempoEstimado?: string;
  passos: TutorialPasso[];
  /** Notas finais / o que este perfil não faz */
  notasFinais?: string;
};

export type TutorialSecaoNav = {
  section: string;
  items: TutorialDef[];
};
