import type { PageKey } from "../types";
import { getMenuItem } from "../constants/menu";

export function getPageMenuLabel(pageKey: PageKey): string {
  return getMenuItem(pageKey)?.label ?? pageKey;
}
