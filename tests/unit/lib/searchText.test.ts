import { describe, expect, it } from "vitest";
import { normalizarTextoBusca, textoContemBusca, textoContemBuscaEmAlgum } from "../../../src/lib/searchText";

describe("searchText", () => {
  it("normalizarTextoBusca remove acentos e colapsa case", () => {
    expect(normalizarTextoBusca("  Flávia  ")).toBe("flavia");
    expect(normalizarTextoBusca("José")).toBe("jose");
    expect(normalizarTextoBusca("São Paulo")).toBe("sao paulo");
  });

  it("textoContemBusca ignora acentos na busca e no texto", () => {
    expect(textoContemBusca("Flávia Costa", "flavia")).toBe(true);
    expect(textoContemBusca("Flavia", "Flávia")).toBe(true);
    expect(textoContemBusca("Maria", "ana")).toBe(false);
    expect(textoContemBusca("qualquer", "")).toBe(true);
  });

  it("textoContemBuscaEmAlgum percorre vários campos", () => {
    expect(textoContemBuscaEmAlgum("flavia", "Ana", "flávia@email.com")).toBe(true);
    expect(textoContemBuscaEmAlgum("x", "Ana", "Bia")).toBe(false);
    expect(textoContemBuscaEmAlgum("", "Ana")).toBe(true);
  });
});
