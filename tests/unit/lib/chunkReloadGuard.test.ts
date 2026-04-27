import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reloadAfterChunkError } from "@/lib/chunkReloadGuard";

describe("reloadAfterChunkError", () => {
  const STORAGE_KEY = "spin_chunk_reload_guard_v1";

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload } as Location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("recarrega até MAX_AUTO_RELOADS vezes na janela", () => {
    reloadAfterChunkError("t1");
    reloadAfterChunkError("t2");
    expect(window.location.reload).toHaveBeenCalledTimes(2);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const entry = JSON.parse(raw!) as { count: number };
    expect(entry.count).toBe(2);
  });

  it("não chama reload após exceder o limite", () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ count: 3, windowStart: Date.now() }),
    );
    reloadAfterChunkError("blocked");
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
