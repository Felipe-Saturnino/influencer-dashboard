import { describe, expect, it } from "vitest";
import {
  compareAtivoBoolean,
  compareCondicaoPeca,
  compareInfluencerPerfilStatus,
  compareLocaleTexto,
  compareNumber,
  comparePagamentoStatus,
  comparePerfilStatusNullable,
} from "@/lib/classificacaoSort";

describe("compareLocaleTexto", () => {
  it("ordena asc em pt-BR", () => {
    expect(compareLocaleTexto("Ana", "Bruno", "asc")).toBeLessThan(0);
    expect(compareLocaleTexto("Bruno", "Ana", "asc")).toBeGreaterThan(0);
  });

  it("inverte em desc", () => {
    expect(compareLocaleTexto("Ana", "Bruno", "desc")).toBeGreaterThan(0);
  });
});

describe("compareNumber", () => {
  it("ordena valores numéricos", () => {
    expect(compareNumber(1, 2, "asc")).toBe(-1);
    expect(compareNumber(2, 1, "desc")).toBe(-1);
  });
});

describe("comparePagamentoStatus", () => {
  it("respeita fluxo perfil_incompleto → pago em asc", () => {
    expect(comparePagamentoStatus("perfil_incompleto", "pago", "asc")).toBeLessThan(0);
    expect(comparePagamentoStatus("pago", "em_analise", "asc")).toBeGreaterThan(0);
  });
});

describe("compareInfluencerPerfilStatus", () => {
  it("agente fica por último em asc", () => {
    expect(
      compareInfluencerPerfilStatus({ statusInfluencer: "ativo" }, { is_agente: true }, "asc"),
    ).toBeLessThan(0);
  });

  it("ativo antes de cancelado em asc", () => {
    expect(
      compareInfluencerPerfilStatus({ statusInfluencer: "ativo" }, { statusInfluencer: "cancelado" }, "asc"),
    ).toBeLessThan(0);
  });
});

describe("comparePerfilStatusNullable", () => {
  it("null fica após status definido em asc", () => {
    expect(comparePerfilStatusNullable(null, "ativo", "asc")).toBeGreaterThan(0);
  });
});

describe("compareAtivoBoolean", () => {
  it("ativo antes de inativo em asc", () => {
    expect(compareAtivoBoolean(true, false, "asc")).toBeGreaterThan(0);
  });
});

describe("compareCondicaoPeca", () => {
  it("good antes de damaged em asc", () => {
    expect(compareCondicaoPeca("good", "damaged", "asc")).toBeLessThan(0);
  });
});
