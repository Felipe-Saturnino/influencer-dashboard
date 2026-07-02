import { MENU } from "../constants/menu";
import type { PermissoesMapa } from "../context/AppContext";
import type { PageKey } from "../types";
import { MENU_ORDERED_PAGE_KEYS } from "./menuPagesOrder";

export function podeVerPaginaAjuda(canView: string | null | undefined): boolean {
  return canView === "sim" || canView === "proprios";
}

export function buildMenuAjudaVisivel(permissions: PermissoesMapa) {
  return MENU.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => podeVerPaginaAjuda(permissions[item.key])),
  })).filter((sec) => sec.items.length > 0);
}

export function pageKeysVisiveisAjuda(permissions: PermissoesMapa): Set<PageKey> {
  const keys = new Set<PageKey>();
  for (const key of MENU_ORDERED_PAGE_KEYS) {
    if (podeVerPaginaAjuda(permissions[key])) keys.add(key);
  }
  return keys;
}

export function glossarioCategoriaVisivel(
  categoriaKey: string,
  permissions: PermissoesMapa,
  mapa: Record<string, PageKey[]>,
): boolean {
  const pageKeys = mapa[categoriaKey];
  if (!pageKeys?.length) return false;
  const visiveis = pageKeysVisiveisAjuda(permissions);
  return pageKeys.some((k) => visiveis.has(k));
}
