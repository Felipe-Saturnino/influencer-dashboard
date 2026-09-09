import { describe, expect, it } from "vitest";
import {
  normalizarTextoBusca,
  textoContemBusca,
  textoContemBuscaEmAlgum,
  tokensBusca,
} from "../../../src/lib/searchText";

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

  it("textoContemBusca exige todas as palavras (permite pular nome do meio)", () => {
    expect(textoContemBusca("Alexandre Galvão Zanchetta", "Alexandre Zanchetta")).toBe(true);
    expect(textoContemBusca("Alexandre Galvão Zanchetta", "alexandre  zanchetta")).toBe(true);
    expect(textoContemBusca("Alexandre Galvão Zanchetta", "Alexandre Galvão Zanchetta")).toBe(true);
    expect(textoContemBusca("Alexandre Galvão Zanchetta", "Zanchetta Alexandre")).toBe(true);
    expect(textoContemBusca("Alexandre Galvão Zanchetta", "Alexandre Silva")).toBe(false);
  });

  it("tokensBusca separa por espaço após normalizar", () => {
    expect(tokensBusca("  Alexandre   Zanchetta ")).toEqual(["alexandre", "zanchetta"]);
    expect(tokensBusca("")).toEqual([]);
  });

  it("textoContemBuscaEmAlgum percorre vários campos", () => {
    expect(textoContemBuscaEmAlgum("flavia", "Ana", "flávia@email.com")).toBe(true);
    expect(textoContemBuscaEmAlgum("x", "Ana", "Bia")).toBe(false);
    expect(textoContemBuscaEmAlgum("", "Ana")).toBe(true);
  });

  it("textoContemBuscaEmAlgum combina tokens entre campos", () => {
    expect(textoContemBuscaEmAlgum("Alexandre Filipe", "Alexandre Galvão Zanchetta", "Filipe")).toBe(true);
    expect(textoContemBuscaEmAlgum("Alexandre Zanchetta", "Alexandre Galvão Zanchetta", "Filipe")).toBe(true);
    expect(textoContemBuscaEmAlgum("Alexandre Outro", "Alexandre Galvão Zanchetta", "Filipe")).toBe(false);
  });
});
