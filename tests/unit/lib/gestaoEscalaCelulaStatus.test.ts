import { describe, expect, it } from "vitest";
import {
  chaveCorCelulaEscalaDiaria,
  fundoCelulaStatusEscalaDiaria,
  linhaPassaFiltrosColunaDiaEscala,
} from "@/pages/rh/GestaoEscala/gestaoEscalaHelpers";

describe("chaveCorCelulaEscalaDiaria", () => {
  it("agrupa Compra - Turno com o turno correspondente", () => {
    expect(chaveCorCelulaEscalaDiaria("Manhã")).toBe("manha");
    expect(chaveCorCelulaEscalaDiaria("Compra - Manhã")).toBe("manha");
    expect(chaveCorCelulaEscalaDiaria("Tarde")).toBe("tarde");
    expect(chaveCorCelulaEscalaDiaria("Compra - Tarde")).toBe("tarde");
    expect(chaveCorCelulaEscalaDiaria("Noite")).toBe("noite");
    expect(chaveCorCelulaEscalaDiaria("Compra - Noite")).toBe("noite");
  });

  it("mapeia Venda, Folga, Troca e Compra legada", () => {
    expect(chaveCorCelulaEscalaDiaria("Venda")).toBe("venda");
    expect(chaveCorCelulaEscalaDiaria("Folga")).toBe("folga");
    expect(chaveCorCelulaEscalaDiaria("Troca")).toBe("troca");
    expect(chaveCorCelulaEscalaDiaria("Compra")).toBe("compra");
    expect(chaveCorCelulaEscalaDiaria("—")).toBeNull();
  });
});

describe("fundoCelulaStatusEscalaDiaria", () => {
  it("devolve fundo para status conhecidos", () => {
    expect(fundoCelulaStatusEscalaDiaria("Manhã", false)).toBeTruthy();
    expect(fundoCelulaStatusEscalaDiaria("—", false)).toBeUndefined();
  });
});

describe("linhaPassaFiltrosColunaDiaEscala", () => {
  it("passa quando não há filtros ativos", () => {
    expect(linhaPassaFiltrosColunaDiaEscala({ "2026-08-01": "Folga" }, {})).toBe(true);
  });

  it("checklist vazia esconde todas as linhas daquele dia", () => {
    expect(linhaPassaFiltrosColunaDiaEscala({ "2026-08-01": "Manhã" }, { "2026-08-01": [] })).toBe(
      false,
    );
  });
});
