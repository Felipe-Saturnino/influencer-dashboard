import { describe, expect, it } from "vitest";

/** Rotas lazy centrais — carregamento inicial e dashboards. */
const ROTAS_CORE = [
  "../../src/pages/geral/Home",
  "../../src/pages/dashboards/OverviewSpin",
  "../../src/pages/aquisicao/Financeiro",
  "../../src/pages/lives/Agenda",
  "../../src/pages/plataforma/GestaoUsuarios",
] as const;

/** Páginas decompostas recentemente — regressão de split/modularização. */
const ROTAS_DECOMPOSTAS = [
  "../../src/pages/aquisicao/BancaJogo",
  "../../src/pages/dashboards/SocialMediaDashboard",
  "../../src/pages/lives/Influencers",
  "../../src/pages/estudio/Figurinos",
  "../../src/pages/plataforma/GestaoMesas",
  "../../src/pages/plataforma/GestaoOperadoras",
  "../../src/pages/geral/Ajuda",
  "../../src/pages/plataforma/StatusTecnico",
] as const;

async function expectLazyDefaults(paths: readonly string[]) {
  const mods = await Promise.all(paths.map((p) => import(p)));
  for (const m of mods) {
    expect(m).toHaveProperty("default");
    expect(typeof m.default).toBe("function");
  }
}

/**
 * Smoke: garante que entrypoints lazy do `App.tsx` continuam resolvíveis
 * (rotas quebradas costumam falhar aqui antes de qualquer teste de UI).
 */
describe("lazy page modules (smoke)", () => {
  it("importa rotas core", async () => {
    await expectLazyDefaults(ROTAS_CORE);
  }, 120_000);

  it("importa páginas decompostas (shell + blocos)", async () => {
    await expectLazyDefaults(ROTAS_DECOMPOSTAS);
  }, 180_000);
});
