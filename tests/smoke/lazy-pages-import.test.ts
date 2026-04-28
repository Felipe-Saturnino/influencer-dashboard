import { describe, expect, it } from "vitest";

/**
 * Smoke: garante que entrypoints lazy do `App.tsx` continuam resolvíveis
 * (rotas quebradas costumam falhar aqui antes de qualquer teste de UI).
 */
describe("lazy page modules (smoke)", () => {
  it("importa default de um conjunto representativo de páginas lazy", async () => {
    const mods = await Promise.all([
      import("../../src/pages/geral/Home"),
      import("../../src/pages/dashboards/OverviewSpin"),
      import("../../src/pages/aquisicao/Financeiro"),
      import("../../src/pages/lives/Agenda"),
      import("../../src/pages/plataforma/GestaoUsuarios"),
    ]);
    for (const m of mods) {
      expect(m).toHaveProperty("default");
      expect(typeof m.default).toBe("function");
    }
  }, 120_000);
});
