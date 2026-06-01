import type { ReactNode } from "react";

/** Travessão entre título e subtítulo (espaçamento via `SECTION_TITLE_SUB_GAP_PX` no layout). */
export const SECTION_TITLE_SUB_SEPARATOR = "—";

/** Espaço entre o título do bloco e o grupo subtítulo (travessão + texto). */
export const SECTION_TITLE_SUB_GAP_PX = 12;

/** Espaço entre o travessão e o texto do subtítulo. */
export const SECTION_TITLE_SUB_DASH_GAP_PX = 6;

/** Remove separadores duplicados no início do texto passado em `sub`. */
const SUB_LEADING_SEP_RE = /^[\s·•—–-]+/;

export function hasSectionTitleSub(sub: ReactNode | undefined): sub is ReactNode {
  if (sub === undefined || sub === null || sub === false) return false;
  if (typeof sub === "string") return sub.trim() !== "";
  return true;
}

export function normalizeSectionTitleSub(sub: ReactNode): ReactNode | null {
  if (sub === null || sub === false) return null;
  if (typeof sub === "string") {
    const trimmed = sub.trim();
    if (!trimmed) return null;
    return trimmed.replace(SUB_LEADING_SEP_RE, "");
  }
  return sub;
}
