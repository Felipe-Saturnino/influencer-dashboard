import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isChunkLoadError,
  isLikelySafariModuleLoadFailure,
  isSafariWebKit,
  limparParamCacheBustDaUrl,
  recarregarAposErroDeChunk,
  reloadAfterChunkError,
} from "@/lib/chunkReloadGuard";

describe("isChunkLoadError", () => {
  it("reconhece mensagens explícitas de chunk / import dinâmico", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Importing a module script failed"))).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error("x"), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new SyntaxError("Unexpected token '<'"))).toBe(true);
  });

  it("reconhece Load failed do Safari no ErrorBoundary (default)", () => {
    expect(isChunkLoadError(new TypeError("Load failed"))).toBe(true);
    expect(isChunkLoadError(new TypeError("TypeError: Load failed"))).toBe(true);
  });

  it("reconhece falha via error.cause encadeado", () => {
    const err = new Error("wrapper");
    (err as Error & { cause?: unknown }).cause = new TypeError("Load failed");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("não trata Load failed genérico em unhandledrejection (allowSafariLoadFailed false)", () => {
    expect(isChunkLoadError(new TypeError("Load failed"), { allowSafariLoadFailed: false })).toBe(false);
    expect(
      isChunkLoadError(new Error("Importing a module script failed"), { allowSafariLoadFailed: false }),
    ).toBe(true);
  });

  it("não classifica erros de aplicação comuns", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("isLikelySafariModuleLoadFailure", () => {
  const safariUa =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("trata TypeError vazio no Safari como falha de módulo", () => {
    vi.stubGlobal("navigator", { userAgent: safariUa });
    expect(isSafariWebKit()).toBe(true);
    expect(isLikelySafariModuleLoadFailure(new TypeError(""))).toBe(true);
  });

  it("não aplica heurística Safari fora do WebKit", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(isLikelySafariModuleLoadFailure(new TypeError(""))).toBe(false);
  });
});

describe("reloadAfterChunkError", () => {
  const STORAGE_KEY = "spin_chunk_reload_guard_v1";
  const HREF_BASE = "https://exemplo.test/Home";
  const chromeUa =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  let reload: ReturnType<typeof vi.fn>;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    reload = vi.fn();
    replace = vi.fn();
    vi.stubGlobal("navigator", { userAgent: chromeUa });
    vi.stubGlobal("location", { ...window.location, href: HREF_BASE, reload, replace } as unknown as Location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("recarrega até MAX_AUTO_RELOADS vezes na janela", () => {
    reloadAfterChunkError("t1");
    reloadAfterChunkError("t2");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const entry = JSON.parse(raw!) as { count: number };
    expect(entry.count).toBe(2);
  });

  it("na última tentativa navega com param de cache-busting", () => {
    reloadAfterChunkError("t1");
    reloadAfterChunkError("t2");

    const destino = new URL(replace.mock.calls[0]![0] as string);
    expect(destino.pathname).toBe("/Home");
    expect(destino.searchParams.get("_spinv")).toBeTruthy();
  });

  it("no Safari usa cache-busting já na primeira tentativa", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    reloadAfterChunkError("safari-1");

    expect(reload).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    const destino = new URL(replace.mock.calls[0]![0] as string);
    expect(destino.searchParams.get("_spinv")).toBeTruthy();
  });

  it("não chama reload após exceder o limite", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 3, windowStart: Date.now() }));
    reloadAfterChunkError("blocked");
    expect(reload).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("recarga manual limpa o guard e ignora o html em cache", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 3, windowStart: Date.now() }));

    recarregarAposErroDeChunk();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
    const destino = new URL(replace.mock.calls[0]![0] as string);
    expect(destino.searchParams.get("_spinv")).toBeTruthy();
  });
});

describe("limparParamCacheBustDaUrl", () => {
  let replaceState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replaceState = vi.fn();
    vi.spyOn(window.history, "replaceState").mockImplementation(replaceState);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("remove o param da barra de endereço", () => {
    vi.stubGlobal("location", { ...window.location, href: "https://exemplo.test/Home?_spinv=abc&aba=geral" } as Location);

    limparParamCacheBustDaUrl();

    expect(replaceState).toHaveBeenCalledWith(null, "", "/Home?aba=geral");
  });

  it("não mexe no histórico quando o param não está presente", () => {
    vi.stubGlobal("location", { ...window.location, href: "https://exemplo.test/Home?aba=geral" } as Location);

    limparParamCacheBustDaUrl();

    expect(replaceState).not.toHaveBeenCalled();
  });
});
