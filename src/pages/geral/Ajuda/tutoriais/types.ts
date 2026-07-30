import type { LucideIcon } from "lucide-react";
import type { PageKey } from "../../../../types";

/** Passo numerado do tutorial (texto + imagens opcionais). */
export type TutorialPasso = {
  titulo: string;
  /** Parágrafos / listas em texto simples (quebras com \n). */
  texto: string;
  /** Aviso estilo Confluence (caixa amarela) abaixo do texto. */
  aviso?: string;
  imagens?: { src: string; alt: string }[];
};

export type TutorialDef = {
  id: string;
  /** Segmento canônico em `/Ajuda/Tutoriais/{urlSlug}`. */
  urlSlug: string;
  /** Rótulo no menu lateral — ex.: Controle de Presença */
  titulo: string;
  /** Secção do menu (mesmo nome de `menu.ts`) — ex.: Escala */
  section: string;
  icon: LucideIcon;
  /** Se definido, o tutorial só aparece com Ver sim|próprios nesta página. */
  relatedPageKey?: PageKey;
  /** Aba interna da página em que o atalho contextual deve aparecer. */
  relatedTabId?: string;
  /** Uma linha sob o título do tutorial. */
  objetivo: string;
  passos: TutorialPasso[];
  /** Notas finais */
  notasFinais?: string;
};

export type TutorialSecaoNav = {
  section: string;
  items: TutorialDef[];
};
