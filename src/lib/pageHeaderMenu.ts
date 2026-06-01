import type { PageKey } from "../types";
import { getMenuItem } from "../constants/menu";

/** Páginas fora do menu lateral — label canónico alinhado ao PageHeader. */
const PAGE_MENU_LABEL_OVERRIDE: Partial<Record<PageKey, string>> = {
  ajuda: "Ajuda",
};

export function getPageMenuLabel(pageKey: PageKey): string {
  return PAGE_MENU_LABEL_OVERRIDE[pageKey] ?? getMenuItem(pageKey)?.label ?? pageKey;
}
