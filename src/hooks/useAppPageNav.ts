import { useCallback, type MouseEvent } from "react";
import type { PageKey } from "../types";
import { useApp } from "../context/AppContext";
import { getAppPageHref } from "../lib/appPageLink";

/**
 * Retorna `href` canónico + handler de clique que navega via `navigateTo` (SPA).
 * Use em `<a>` no lugar de `<button onClick={() => setActivePage(...)}>` quando a URL deve aparecer no DOM.
 */
export function useAppPageNav() {
  const { navigateTo } = useApp();

  const propsFor = useCallback(
    (pageKey: PageKey, tabSlug?: string | null) => {
      const href = getAppPageHref(pageKey, tabSlug);
      return {
        href,
        onClick: (e: MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          navigateTo(pageKey, tabSlug ?? null);
        },
      };
    },
    [navigateTo],
  );

  return { propsFor, navigateTo };
}
