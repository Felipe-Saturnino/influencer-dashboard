/**
 * Evita loop infinito: falha repetida de chunk / import dinâmico dispara reload no main e no ErrorBoundary.
 * Número de recargas automáticas permitidas por janela de tempo (sessionStorage).
 */
const STORAGE_KEY = "spin_chunk_reload_guard_v1";
const MAX_AUTO_RELOADS = 2;
const WINDOW_MS = 120_000;
/** Query param descartável: URL nova força o browser a buscar o `index.html` do servidor. */
const PARAM_CACHE_BUST = "_spinv";

/** `true` quando a recarga foi disparada; `false` quando o limite da janela já foi atingido. */
export function reloadAfterChunkError(context?: string): boolean {
  if (typeof window === "undefined") return false;
  let tentativa = 1;
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
    tentativa = entry.count;

    if (entry.count > MAX_AUTO_RELOADS) {
      console.error(
        "[App] Limite de recargas automáticas por erro de chunk atingido. Interrompendo para evitar loop.",
        context ?? "",
        "Tente limpar o cache do site, outra rede ou confira o deploy.",
      );
      return false;
    }
  } catch {
    /* storage indisponível — uma recarga ainda pode ajudar */
  }
  console.warn("[App] Erro de carregamento de módulo — recarregando página.", context ?? "");
  // `reload()` pode reaproveitar o index.html em cache — e é ele que aponta para o chunk inexistente.
  if (tentativa >= MAX_AUTO_RELOADS) {
    recarregarIgnorandoCacheDoHtml();
    return true;
  }
  window.location.reload();
  return true;
}

/**
 * Recarga manual pedida pelo usuário depois de um erro de chunk: libera novas tentativas
 * automáticas e busca o `index.html` no servidor — `reload()` sozinho pode devolver o HTML
 * em cache, que é justamente o que aponta para o chunk inexistente.
 */
export function recarregarAposErroDeChunk(): void {
  limparChunkReloadGuard();
  recarregarIgnorandoCacheDoHtml();
}

function recarregarIgnorandoCacheDoHtml(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_CACHE_BUST, Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/** Remove o param de cache-busting da barra de endereço — chamar no boot, antes do render. */
export function limparParamCacheBustDaUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PARAM_CACHE_BUST)) return;
    url.searchParams.delete(PARAM_CACHE_BUST);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* sem History API — o param é inofensivo para o roteamento */
  }
}

/** Libera novas recargas automáticas — usar quando o usuário pede recarga manual. */
export function limparChunkReloadGuard(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage indisponível — nada a limpar */
  }
}
