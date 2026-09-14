import { describe, expect, it } from "vitest";
import {
  arquivoCanalDenunciaPermitido,
  CANAL_DENUNCIA_ANEXO_MAX_BYTES,
  emailCanalDenunciaValido,
  isProtocoloCanalFormatoValido,
  mapComConcurrency,
  normalizarProtocoloCanal,
  statusLabel,
} from "../../../src/lib/canalDenunciasSpin";

describe("canalDenunciasSpin", () => {
  it("normalizarProtocoloCanal remove espaços e deixa maiúsculas", () => {
    expect(normalizarProtocoloCanal("  cdspin-ab12cd34ef567890  ")).toBe("CDSPIN-AB12CD34EF567890");
    expect(normalizarProtocoloCanal("cdspin00001")).toBe("CDSPIN00001");
  });

  it("aceita protocolo legado sequencial e o formato imprevisível", () => {
    expect(isProtocoloCanalFormatoValido("CDSPIN00001")).toBe(true);
    expect(isProtocoloCanalFormatoValido("CDSPIN-AB12CD34EF567890")).toBe(true);
    expect(isProtocoloCanalFormatoValido("CDSPIN0001")).toBe(false);
    expect(isProtocoloCanalFormatoValido("CDSPIN-ZZ")).toBe(false);
    expect(isProtocoloCanalFormatoValido("ABC")).toBe(false);
  });

  it("arquivoCanalDenunciaPermitido restringe tipo e tamanho", () => {
    expect(arquivoCanalDenunciaPermitido({ name: "prova.pdf", type: "application/pdf", size: 100 })).toBe(true);
    expect(arquivoCanalDenunciaPermitido({ name: "foto.JPG", type: "image/jpeg", size: 100 })).toBe(true);
    expect(arquivoCanalDenunciaPermitido({ name: "clip.mp4", type: "video/mp4", size: 100 })).toBe(true);
    expect(arquivoCanalDenunciaPermitido({ name: "virus.exe", type: "application/octet-stream", size: 100 })).toBe(
      false,
    );
    expect(
      arquivoCanalDenunciaPermitido({
        name: "grande.pdf",
        type: "application/pdf",
        size: CANAL_DENUNCIA_ANEXO_MAX_BYTES + 1,
      }),
    ).toBe(false);
  });

  it("emailCanalDenunciaValido e statusLabel cobrem o canal público", () => {
    expect(emailCanalDenunciaValido("a@b.co")).toBe(true);
    expect(emailCanalDenunciaValido("invalido")).toBe(false);
    expect(statusLabel("procedente")).toBe("Procedente");
    expect(statusLabel("nao_procedente")).toBe("Não procedente");
  });

  it("mapComConcurrency limita paralelismo e reporta falha", async () => {
    const seen: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const falhou = await mapComConcurrency([1, 2, 3, 4], 2, async (n) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      seen.push(n);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return n !== 3;
    });
    expect(falhou).toBe(true);
    expect(seen.sort()).toEqual([1, 2, 3, 4]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
