/**
 * Evita loop infinito: falha repetida de chunk / import dinâmico dispara reload no main e no ErrorBoundary.
 * Número de recargas automáticas permitidas por janela de tempo (sessionStorage).
 */
const STORAGE_KEY = "spin_chunk_reload_guard_v1";
const MAX_AUTO_RELOADS = 2;
const WINDOW_MS = 120_000;
/** Query param descartável: URL nova força o browser a buscar o `index.html` do servidor. */
const PARAM_CACHE_BUST = "_spinv";

export type IsChunkLoadErrorOptions = {
  /**
   * Safari/WebKit costuma reportar falha de `import()` só como `TypeError: Load failed`.
   * No ErrorBoundary (lazy) isso é quase sempre chunk; em `unhandledrejection` pode ser
   * fetch de API — use `false` nesse listener e confie em `vite:preloadError`.
   */
  allowSafariLoadFailed?: boolean;
};

/** Safari / WebKit nativo (iOS, iPadOS, macOS Safari) — não Chrome/Firefox/Edge no iOS. */
export function isSafariWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Chromium/i.test(ua);
}

function normalizeErrorMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err.trim().toLowerCase();
  const parts: string[] = [];
  if (err instanceof Error) {
    if (err.message) parts.push(err.message);
    if (err.name && err.name !== "Error") parts.push(err.name);
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause != null && cause !== err) {
      parts.push(normalizeErrorMessage(cause));
    }
  }
  if (parts.length === 0) {
    try {
      parts.push(String(err).trim().toLowerCase());
    } catch {
      return "";
    }
  }
  return parts.join(" ").trim().toLowerCase();
}

function messageMatchesChunkFailure(msg: string, allowSafariLoadFailed: boolean): boolean {
  if (!msg) return false;

  if (msg.includes("failed to fetch dynamically imported module")) return true;
  if (msg.includes("error loading dynamically imported module")) return true;
  if (msg.includes("importing a module script failed")) return true;
  if (msg.includes("chunk load error")) return true;
  if (msg.includes("loading css chunk") && msg.includes("failed")) return true;
  if (msg.includes("loading chunk") && (msg.includes("failed") || msg.includes("error"))) return true;
  if (msg.includes("unexpected token '<'") || msg.includes("unexpected token \u003c")) return true;
  if (msg.includes("mime type") && msg.includes("text/html")) return true;
  if (msg.includes("is not a valid javascript mime type")) return true;

  if (allowSafariLoadFailed) {
    if (msg.includes("load failed")) return true;
    if (msg.includes("networkerror") || msg.includes("network error")) return true;
    if (msg.includes("the network connection was lost")) return true;
    if (msg.includes("cancelled") && msg.includes("fetch")) return true;
  }

  return false;
}

/**
 * Safari no ErrorBoundary: `TypeError` vazio ou genérico após lazy load — quase sempre chunk/HTML em cache.
 */
export function isLikelySafariModuleLoadFailure(err: unknown): boolean {
  if (!isSafariWebKit()) return false;
  if (isChunkLoadError(err)) return true;
  if (!(err instanceof TypeError)) return false;
  const msg = normalizeErrorMessage(err);
  if (!msg || msg === "typeerror") return true;
  return messageMatchesChunkFailure(msg, true);
}

/**
 * Detecta falha de carregamento de chunk / módulo dinâmico (Chrome, Firefox, Safari/WebKit).
 */
export function isChunkLoadError(err: unknown, opts?: IsChunkLoadErrorOptions): boolean {
  const allowSafariLoadFailed = opts?.allowSafariLoadFailed !== false;
  if (err instanceof Error && err.name === "ChunkLoadError") return true;

  const msg = normalizeErrorMessage(err);
  if (messageMatchesChunkFailure(msg, allowSafariLoadFailed)) return true;

  return false;
}

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
  // Safari: `reload()` costuma reaproveitar o index.html em cache — ir direto ao cache-bust.
  if (isSafariWebKit() || tentativa >= MAX_AUTO_RELOADS) {
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

/**
 * Listeners de boot: `unhandledrejection` (mensagens explícitas) + `vite:preloadError`
 * (Vite — inclui falhas de preload no Safari sem mensagem útil).
 */
export function registerChunkReloadListeners(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (ev) => {
    // Sem `Load failed` genérico — no Safari isso também cobre fetch de API não tratada.
    if (!isChunkLoadError(ev.reason, { allowSafariLoadFailed: false })) return;
    ev.preventDefault();
    reloadAfterChunkError("unhandledrejection");
  });

  window.addEventListener("vite:preloadError", ((ev: Event) => {
    ev.preventDefault();
    reloadAfterChunkError("vite:preloadError");
  }) as EventListener);
}
