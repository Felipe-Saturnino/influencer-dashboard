import { describe, it, expect, vi, afterEach } from "vitest";
import { isIOSDevice, prefereAssetMesmaAba, prefereMidiaInlineNoDispositivo } from "@/lib/platformDetect";

describe("platformDetect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detecta iPhone Safari", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIOSDevice()).toBe(true);
    expect(prefereMidiaInlineNoDispositivo()).toBe(true);
    expect(prefereAssetMesmaAba()).toBe(true);
  });

  it("detecta Chrome no iPhone (CriOS)", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIOSDevice()).toBe(true);
    expect(prefereMidiaInlineNoDispositivo()).toBe(true);
  });

  it("não classifica Chrome desktop como iOS", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    expect(isIOSDevice()).toBe(false);
    expect(prefereMidiaInlineNoDispositivo()).toBe(false);
  });
});
