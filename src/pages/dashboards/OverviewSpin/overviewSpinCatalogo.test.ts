import { describe, expect, it } from "vitest";
import { buildCatalogoCanaisMesas, podeVerAbaCanalCatalogo, podeVerAbaOverviewCatalogo } from "./overviewSpinCatalogo";

describe("buildCatalogoCanaisMesas", () => {
  it("classifica operadoras por tipo de estúdio com mesas", () => {
    const cat = buildCatalogoCanaisMesas(
      [
        {
          slug: "blaze",
          tipo: "dedicado",
          ativo: true,
          estudios_spin_operadoras: [{ operadora_slug: "blaze" }],
        },
        {
          slug: "sports_club",
          tipo: "network",
          ativo: true,
          estudios_spin_operadoras: [
            { operadora_slug: "blaze" },
            { operadora_slug: "esportiva_bet" },
          ],
        },
      ],
      [
        { estudio_slug: "blaze", operadora_slug: "blaze" },
        { estudio_slug: "sports_club", operadora_slug: null },
        { estudio_slug: "sports_club", operadora_slug: null },
      ],
    );
    expect(cat.slugsComMesaDedicada).toEqual(["blaze"]);
    expect(cat.slugsComMesaNetwork).toEqual(["blaze", "esportiva_bet"]);
  });
});

describe("podeVerAbaOverviewCatalogo", () => {
  it("só mostra Overview quando Dedicado e Network estão visíveis", () => {
    expect(podeVerAbaOverviewCatalogo(true, true)).toBe(true);
    expect(podeVerAbaOverviewCatalogo(false, true)).toBe(false);
    expect(podeVerAbaOverviewCatalogo(true, false)).toBe(false);
    expect(podeVerAbaOverviewCatalogo(false, false)).toBe(false);
  });
});

describe("podeVerAbaCanalCatalogo", () => {
  const catalogo = {
    slugsComMesaDedicada: ["blaze"],
    slugsComMesaNetwork: ["esportiva_bet"],
  };

  it("proprios só vê aba se escopo tiver mesa do tipo", () => {
    expect(
      podeVerAbaCanalCatalogo({
        canal: "network",
        isAdmin: false,
        canView: "proprios",
        operadorasVisiveis: ["esportiva_bet"],
        catalogo,
      }),
    ).toBe(true);
    expect(
      podeVerAbaCanalCatalogo({
        canal: "dedicado",
        isAdmin: false,
        canView: "proprios",
        operadorasVisiveis: ["esportiva_bet"],
        catalogo,
      }),
    ).toBe(false);
  });

  it("sim vê aba se houver catálogo global do tipo", () => {
    expect(
      podeVerAbaCanalCatalogo({
        canal: "dedicado",
        isAdmin: false,
        canView: "sim",
        operadorasVisiveis: [],
        catalogo,
      }),
    ).toBe(true);
  });
});
