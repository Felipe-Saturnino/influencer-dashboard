/**
 * Evita loop infinito: falha repetida de chunk / import dinâmico dispara reload no main e no ErrorBoundary.
 * Número de recargas automáticas permitidas por janela de tempo (sessionStorage).
 */
const STORAGE_KEY = "spin_chunk_reload_guard_v1";
const MAX_AUTO_RELOADS = 2;
const WINDOW_MS = 120_000;

export function reloadAfterChunkError(context?: string): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    type Entry = { count: number; windowStart: number };
    let entry: Entry = { count: 0, windowStart: now };
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as Entry;
      if (now - prev.windowStart < WINDOW_MS) entry = prev;
    }
    entry = { count: entry.count + 1, windowStart: entry.windowStart };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));

    if (entry.count > MAX_AUTO_RELOADS) {
      console.error(
        "[App] Limite de recargas automáticas por erro de chunk atingido. Interrompendo para evitar loop.",
        context ?? "",
        "Tente limpar o cache do site, outra rede ou confira o deploy.",
      );
      return;
    }
  } catch {
    /* storage indisponível — uma recarga ainda pode ajudar */
  }
  console.warn("[App] Erro de carregamento de módulo — recarregando página.", context ?? "");
  window.location.reload();
}
