import { describe, expect, it } from "vitest";
import type { PermissoesMapa } from "../../../src/context/AppContext";
import type { PageKey } from "../../../src/types";
import { buildAppPath, parseAppPathname } from "../../../src/lib/appRoutes";
import {
  chipPaginaVersionamento,
  haystackItem,
  itemPassaFiltroVersionamento,
  podeVerItemVersionamento,
  releaseMaisRecente,
  releasesHistorico,
  secaoDoItemVersionamento,
  tituloHistoricoRelease,
  type VersionamentoRelease,
} from "../../../src/lib/versionamento";

function perms(overrides: Partial<Record<PageKey, "sim" | "proprios" | "nao" | null>>): PermissoesMapa {
  return overrides as PermissoesMapa;
}

const catalogo: VersionamentoRelease[] = [
  {
    numero: 1,
    data: "06/09/2026",
    titulo: "Primeira semana",
    resumo: "Lançamento inicial.",
    itens: [
      {
        tipo: "novo",
        paginas: ["agenda"],
        titulo: "Agenda com filtro",
        descricao: "Filtre lives por status.",
        linkPagina: true,
      },
    ],
  },
  {
    numero: 2,
    data: "13/09/2026",
    titulo: "Busca e correções",
    resumo: "Busca nos filtros e correção no Calendário.",
    itens: [
      {
        tipo: "melhoria",
        paginas: "*",
        titulo: "Busca sem acento",
        descricao: "A busca ignora acentos em toda a plataforma.",
        palavrasChave: "filtro pesquisa",
      },
      {
        tipo: "correcao",
        paginas: ["rh_calendario"],
        titulo: "Presença duplicada",
        descricao: "Justificativa não duplica no mesmo dia.",
      },
    ],
  },
];

describe("versionamento", () => {
  it("rota /Versionamento aponta para a página", () => {
    expect(buildAppPath("versionamento")).toBe("/Versionamento");
    expect(parseAppPathname("/Versionamento")).toMatchObject({
      kind: "app",
      pageKey: "versionamento",
    });
  });
  it("releaseMaisRecente escolhe o maior número", () => {
    const recente = releaseMaisRecente(catalogo);
    expect(recente?.numero).toBe(2);
    expect(releasesHistorico(catalogo, recente).map((r) => r.numero)).toEqual([1]);
  });

  it("catálogo vazio não inventa recente", () => {
    expect(releaseMaisRecente([])).toBeNull();
    expect(releasesHistorico([], null)).toEqual([]);
  });

  it("título do histórico segue Release #N - título - data", () => {
    expect(tituloHistoricoRelease(catalogo[0])).toBe("Release #1 - Primeira semana - 06/09/2026");
  });

  it("transversal é Toda Plataforma e visível para quem acessa Versionamento", () => {
    const item = catalogo[1].itens[0];
    expect(podeVerItemVersionamento(item, perms({}))).toBe(true);
    expect(secaoDoItemVersionamento(item)).toBe("Toda Plataforma");
    expect(chipPaginaVersionamento(item)).toBe("Toda Plataforma");
  });

  it("esconde card sem Ver/Próprios na página da feature", () => {
    const item = catalogo[0].itens[0];
    expect(podeVerItemVersionamento(item, perms({ agenda: "nao" }))).toBe(false);
    expect(podeVerItemVersionamento(item, perms({ agenda: "sim" }))).toBe(true);
    expect(podeVerItemVersionamento(item, perms({ agenda: "proprios" }))).toBe(true);
  });

  it("filtro de tipo e busca AND sem acento", () => {
    const release = catalogo[1];
    const melhoria = release.itens[0];
    const correcao = release.itens[1];
    const vis = perms({ rh_calendario: "sim" });

    expect(
      itemPassaFiltroVersionamento(melhoria, release, { tipo: "melhoria", secao: "", busca: "" }, vis),
    ).toBe(true);
    expect(
      itemPassaFiltroVersionamento(correcao, release, { tipo: "melhoria", secao: "", busca: "" }, vis),
    ).toBe(false);

    expect(
      itemPassaFiltroVersionamento(melhoria, release, { tipo: "todos", secao: "", busca: "acento filtro" }, vis),
    ).toBe(true);
    expect(
      itemPassaFiltroVersionamento(melhoria, release, { tipo: "todos", secao: "", busca: "acento xyz" }, vis),
    ).toBe(false);
  });

  it("busca pelo número e data da release abre todos os cards do bloco", () => {
    const release = catalogo[1];
    const vis = perms({ rh_calendario: "sim" });
    expect(
      itemPassaFiltroVersionamento(release.itens[1], release, { tipo: "todos", secao: "", busca: "13/09/2026" }, vis),
    ).toBe(true);
    expect(
      itemPassaFiltroVersionamento(release.itens[1], release, { tipo: "todos", secao: "", busca: "13092026" }, vis),
    ).toBe(true);
    expect(haystackItem(release.itens[0], release)).toMatch(/Release #2/);
  });
});
