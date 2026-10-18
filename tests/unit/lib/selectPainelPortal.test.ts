import { describe, expect, it, vi, afterEach } from "vitest";
import { PAINEL_PORTAL_CAP, posicaoPainelPortal } from "@/lib/selectPainelPortal";

function rect(partial: Partial<DOMRect>): DOMRect {
  const top = partial.top ?? 200;
  const height = partial.height ?? 40;
  const left = partial.left ?? 24;
  const width = partial.width ?? 280;
  return {
    x: left,
    y: top,
    top,
    bottom: partial.bottom ?? top + height,
    left,
    right: partial.right ?? left + width,
    width,
    height,
    toJSON: () => ({}),
  };
}

describe("posicaoPainelPortal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ancora abaixo do trigger quando há espaço", () => {
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("innerHeight", 800);
    const pos = posicaoPainelPortal(rect({ top: 120, height: 44, left: 40, width: 320 }), {
      minWidth: 240,
      matchTriggerWidth: true,
    });
    expect(pos.top).toBeGreaterThan(164);
    expect(pos.bottom).toBeUndefined();
    expect(pos.width).toBe(320);
    expect(pos.maxHeight).toBeLessThanOrEqual(PAINEL_PORTAL_CAP);
  });

  it("vira para cima quando não cabe abaixo", () => {
    vi.stubGlobal("innerWidth", 1280);
    vi.stubGlobal("innerHeight", 400);
    const pos = posicaoPainelPortal(rect({ top: 340, height: 44, left: 40, width: 280 }), {
      minWidth: 240,
      matchTriggerWidth: true,
    });
    expect(pos.bottom).toBeGreaterThan(0);
    expect(pos.top).toBeUndefined();
  });
});
