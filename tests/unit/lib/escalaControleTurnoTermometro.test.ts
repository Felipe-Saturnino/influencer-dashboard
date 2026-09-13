import { describe, expect, it } from "vitest";
import { parseTermometroCt } from "../../../src/lib/escalaControleTurno";

describe("parseTermometroCt", () => {
  it("aceita 0 a 5", () => {
    expect(parseTermometroCt(0)).toBe(0);
    expect(parseTermometroCt(5)).toBe(5);
    expect(parseTermometroCt("3")).toBe(3);
  });

  it("rejeita fora da faixa e vazio", () => {
    expect(parseTermometroCt(null)).toBeNull();
    expect(parseTermometroCt("")).toBeNull();
    expect(parseTermometroCt(6)).toBeNull();
    expect(parseTermometroCt(-1)).toBeNull();
  });
});
