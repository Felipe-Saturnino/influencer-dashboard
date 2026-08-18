import { describe, expect, it } from "vitest";
import { resolverIdentidadeEfetiva } from "../../../src/lib/identidadeEfetiva";

const admin = {
  id: "admin-id",
  name: "Admin Viewer",
  email: "admin@spin.example",
  role: "admin" as const,
};

const simulado = {
  id: "gp-id",
  name: "Henrique",
  email: "henrique@spin.example",
};

describe("resolverIdentidadeEfetiva", () => {
  it("usa a conta real quando não há simulação", () => {
    const out = resolverIdentidadeEfetiva({
      user: admin,
      dadosUsuarioEfetivo: { id: admin.id, name: admin.name, email: admin.email },
      effectiveRole: "admin",
    });
    expect(out).toEqual({
      userId: "admin-id",
      email: "admin@spin.example",
      name: "Admin Viewer",
      role: "admin",
    });
  });

  it("prioriza o usuário escolhido no Simulador de Login", () => {
    const out = resolverIdentidadeEfetiva({
      user: admin,
      dadosUsuarioEfetivo: simulado,
      effectiveRole: "game_presenter",
    });
    expect(out).toEqual({
      userId: "gp-id",
      email: "henrique@spin.example",
      name: "Henrique",
      role: "game_presenter",
    });
  });

  it("cai no viewer se o snapshot efetivo estiver vazio", () => {
    const out = resolverIdentidadeEfetiva({
      user: admin,
      dadosUsuarioEfetivo: { id: "", name: "", email: "" },
      effectiveRole: "game_presenter",
    });
    expect(out.email).toBe("admin@spin.example");
    expect(out.userId).toBe("admin-id");
    expect(out.role).toBe("game_presenter");
  });
});
