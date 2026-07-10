import { Eye, Settings } from "lucide-react";
import { MENU, type MenuSection } from "../constants/menu";
import type { PermissoesMapa } from "../context/AppContext";
import type { PageKey } from "../types";
import { MENU_ORDERED_PAGE_KEYS } from "./menuPagesOrder";

/** Páginas da secção Geral na Ajuda (fora do menu lateral; sem a própria Ajuda). */
export const AJUDA_GERAL_PAGE_KEYS: PageKey[] = ["configuracoes", "simulador_login"];

const MENU_AJUDA_GERAL: MenuSection = {
  section: "Geral",
  items: [
    { key: "configuracoes", label: "Configurações", icon: Settings },
    { key: "simulador_login", label: "Simulador de Login", icon: Eye },
  ],
};

export function podeVerPaginaAjuda(canView: string | null | undefined): boolean {
  return canView === "sim" || canView === "proprios";
}

export function buildMenuAjudaVisivel(permissions: PermissoesMapa): MenuSection[] {
  const secoesProduto = MENU.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => podeVerPaginaAjuda(permissions[item.key])),
  })).filter((sec) => sec.items.length > 0);

  const geralItems = MENU_AJUDA_GERAL.items.filter((item) =>
    podeVerPaginaAjuda(permissions[item.key]),
  );
  const secoes =
    geralItems.length > 0
      ? [...secoesProduto, { ...MENU_AJUDA_GERAL, items: geralItems }]
      : secoesProduto;

  return secoes;
}

export function pageKeysVisiveisAjuda(permissions: PermissoesMapa): Set<PageKey> {
  const keys = new Set<PageKey>();
  for (const key of MENU_ORDERED_PAGE_KEYS) {
    if (podeVerPaginaAjuda(permissions[key])) keys.add(key);
  }
  for (const key of AJUDA_GERAL_PAGE_KEYS) {
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
