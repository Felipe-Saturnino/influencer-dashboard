import { describe, expect, it } from "vitest";
import { staffIdTosValido } from "../../../../src/pages/rh/GestaoStaff/gestaoStaffHelpers";

describe("staffIdTosValido", () => {
  it("aceita vazio ou UUID com hífens", () => {
    expect(staffIdTosValido("")).toBe(true);
    expect(staffIdTosValido("  ")).toBe(true);
    expect(staffIdTosValido("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejeita texto que não é UUID", () => {
    expect(staffIdTosValido("nao-e-uuid")).toBe(false);
    expect(staffIdTosValido("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});
