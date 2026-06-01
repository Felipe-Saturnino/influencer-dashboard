import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { PageKey } from "../types";
import { getAppRouteByPageKey } from "../lib/appRoutes";
import { useApp } from "../context/AppContext";

/**
 * Sincroniza o estado de aba do componente com `/{Pagina}/{Aba}`.
 * `tabIds` deve listar todas as chaves internas válidas do componente.
 */
export function useRouteTab<T extends string>(
  pageKey: PageKey,
  defaultTabId: T,
  tabIds: readonly T[],
): [T, Dispatch<SetStateAction<T>>] {
  const { activePage, activeTabSlug, navigateTo } = useApp();
  const route = getAppRouteByPageKey(pageKey);
  const tabIdsRef = useRef(tabIds);
  tabIdsRef.current = tabIds;

  const resolveFromRoute = useCallback((): T => {
    if (activePage !== pageKey) return defaultTabId;
    if (!activeTabSlug || !route?.tabs?.length) return defaultTabId;
    const match = route.tabs.find(
      (t) => t.slug === activeTabSlug || t.slug.toLowerCase() === activeTabSlug.toLowerCase(),
    );
    if (match && tabIdsRef.current.includes(match.tabId as T)) return match.tabId as T;
    return defaultTabId;
  }, [activePage, activeTabSlug, pageKey, defaultTabId, route?.tabs]);

  const [tab, setTabState] = useState<T>(resolveFromRoute);

  useEffect(() => {
    setTabState((prev) => {
      const next = resolveFromRoute();
      return next === prev ? prev : next;
    });
  }, [resolveFromRoute]);

  const setTab = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setTabState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        const slug = route?.tabs?.find((t) => t.tabId === resolved)?.slug ?? null;
        if (resolved === prev && activePage === pageKey && activeTabSlug === slug) {
          return prev;
        }
        navigateTo(pageKey, slug);
        return resolved;
      });
    },
    [navigateTo, pageKey, route?.tabs, activePage, activeTabSlug],
  );

  return [tab, setTab];
}
