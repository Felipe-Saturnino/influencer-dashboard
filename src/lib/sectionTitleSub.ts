import type { ReactNode } from "react";

/** Separador canónico entre título de bloco (nível 3) e subtítulo — mesmo padrão dos dashboards. */
export const SECTION_TITLE_SUB_SEPARATOR = " — ";

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
