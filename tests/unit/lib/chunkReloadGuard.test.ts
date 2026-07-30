import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { limparParamCacheBustDaUrl, reloadAfterChunkError } from "@/lib/chunkReloadGuard";

describe("reloadAfterChunkError", () => {
  const STORAGE_KEY = "spin_chunk_reload_guard_v1";
  const HREF_BASE = "https://exemplo.test/Home";
  let reload: ReturnType<typeof vi.fn>;
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    reload = vi.fn();
    replace = vi.fn();
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

  it("não chama reload após exceder o limite", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 3, windowStart: Date.now() }));
    reloadAfterChunkError("blocked");
    expect(reload).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
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
