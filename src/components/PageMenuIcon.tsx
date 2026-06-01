import { createElement } from "react";
import type { PageKey } from "../types";
import { getMenuItem } from "../constants/menu";
import { PAGE_HEADER_ICON_PROPS } from "../lib/pageHeaderStyles";

/** Ícone Lucide do menu para o cabeçalho da página (badge 32×32 / ícone 16px no `PageHeader`). */
export function PageMenuIcon({ pageKey }: { pageKey: PageKey }) {
  const item = getMenuItem(pageKey);
  if (!item) return null;
  return createElement(item.icon, PAGE_HEADER_ICON_PROPS);
}
