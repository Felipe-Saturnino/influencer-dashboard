import { MENU } from "../constants/menu";
import type { PageKey } from "../types";

/** PageKeys na ordem das secções do menu lateral (`MENU`). */
export const MENU_ORDERED_PAGE_KEYS: PageKey[] = MENU.flatMap((sec) => sec.items.map((item) => item.key));

/** Utilitários fora do menu lateral — sempre após as secções de produto. */
export const GERAL_PAGE_KEYS_AFTER_MENU: PageKey[] = ["configuracoes", "ajuda"];

/** Reordena entradas de permissões/escopos para seguir `MENU` + Geral. */
export function sortPagesLikeMenu<T extends { key: PageKey }>(entries: readonly T[]): T[] {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const ordered: T[] = [];
  for (const key of MENU_ORDERED_PAGE_KEYS) {
    const row = byKey.get(key);
    if (row) ordered.push(row);
  }
  for (const key of GERAL_PAGE_KEYS_AFTER_MENU) {
    const row = byKey.get(key);
    if (row) ordered.push(row);
  }
  return ordered;
}
