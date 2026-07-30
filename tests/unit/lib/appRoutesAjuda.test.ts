import { describe, expect, it } from "vitest";
import {
  buildAppPath,
  buildParsedAppTarget,
  parseAppPathname,
} from "../../../src/lib/appRoutes";

describe("deep links contextuais da Ajuda", () => {
  it("monta URLs de Conheça e Troubleshooting para uma página", () => {
    expect(buildAppPath("ajuda", "ConhecaAPlataforma", "Calendario")).toBe(
      "/Ajuda/ConhecaAPlataforma/Calendario",
    );
    expect(buildAppPath("ajuda", "Troubleshooting", "Calendario")).toBe(
      "/Ajuda/Troubleshooting/Calendario",
    );
  });

  it("interpreta os detalhes de Conheça, Troubleshooting e Tutoriais", () => {
    expect(parseAppPathname("/Ajuda/ConhecaAPlataforma/Calendario")).toMatchObject({
      kind: "app",
      pageKey: "ajuda",
      tabId: "conheca",
      detailSlug: "Calendario",
    });
    expect(parseAppPathname("/Ajuda/Troubleshooting/Calendario")).toMatchObject({
      kind: "app",
      pageKey: "ajuda",
      tabId: "troubleshooting",
      detailSlug: "Calendario",
    });
    expect(parseAppPathname("/Ajuda/Tutoriais/ControledePresenca")).toMatchObject({
      kind: "app",
      pageKey: "ajuda",
      tabId: "tutoriais",
      detailSlug: "ControledePresenca",
    });
  });

  it("não aceita detalhe em abas da Ajuda que não o utilizam", () => {
    expect(parseAppPathname("/Ajuda/Glossario/Calendario")).toEqual({ kind: "not_found" });
  });

  it("preserva o detalhe ao montar um alvo interno da Ajuda", () => {
    expect(
      buildParsedAppTarget("ajuda", "ConhecaAPlataforma", "Calendario"),
    ).toMatchObject({
      kind: "app",
      pageKey: "ajuda",
      tabId: "conheca",
      detailSlug: "Calendario",
    });
  });
});
