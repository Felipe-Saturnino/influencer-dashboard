import { describe, expect, it } from "vitest";
import { buildCatalogoCanaisMesas, podeVerAbaCanalCatalogo, podeVerAbaOverviewCatalogo, type EstudioCatalogoRow } from "./overviewSpinCatalogo";

const estudiosBlazeSports: EstudioCatalogoRow[] = [
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
];

describe("buildCatalogoCanaisMesas", () => {
  it("classifica operadoras pelo vínculo com estúdio (junction), sem exigir mesas", () => {
    const cat = buildCatalogoCanaisMesas(estudiosBlazeSports, []);
    expect(cat.slugsComMesaDedicada).toEqual(["blaze"]);
    expect(cat.slugsComMesaNetwork).toEqual(["blaze", "esportiva_bet"]);
  });

  it("enriquece com operadora_slug legado nas mesas", () => {
    const cat = buildCatalogoCanaisMesas(
      [
        {
          slug: "blaze",
          tipo: "dedicado",
          ativo: true,
          estudios_spin_operadoras: [],
        },
      ],
      [{ estudio_slug: "blaze", operadora_slug: "blaze" }],
    );
    expect(cat.slugsComMesaDedicada).toEqual(["blaze"]);
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

  it("proprios só vê aba se escopo tiver canal do tipo", () => {
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

  it("Blaze com Dedicado+Network no catálogo vê as duas abas", () => {
    const cat = buildCatalogoCanaisMesas(estudiosBlazeSports, []);
    expect(
      podeVerAbaCanalCatalogo({
        canal: "dedicado",
        isAdmin: false,
        canView: "proprios",
        operadorasVisiveis: ["blaze"],
        catalogo: cat,
      }),
    ).toBe(true);
    expect(
      podeVerAbaCanalCatalogo({
        canal: "network",
        isAdmin: false,
        canView: "proprios",
        operadorasVisiveis: ["blaze"],
        catalogo: cat,
      }),
    ).toBe(true);
    expect(podeVerAbaOverviewCatalogo(true, true)).toBe(true);
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
