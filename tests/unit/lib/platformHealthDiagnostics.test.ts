import { describe, expect, it } from "vitest";
import {
  buildPlatformHealthTechLogs,
  countDiagnosticSummary,
  labelTipoTechLog,
  TIPO_DIAGNOSTICO_RESUMO,
} from "../../../src/lib/platformHealthDiagnostics";
import type { PlatformHealthSnapshot } from "../../../src/lib/platformHealthDiagnostics";

const baseSnapshot = (): PlatformHealthSnapshot => ({
  hojeIso: "2026-06-02",
  passouHorarioCda: true,
  passouHorarioSocial: true,
  secrets: {
    cdaConfigurado: true,
    githubSocialConfigurado: true,
    resendConfigurado: true,
  },
  integracoes: [
    {
      slug: "casa_apostas",
      nome: "Casa de Apostas (CDA)",
      integracaoSlugFk: "casa_apostas",
      ultimoStatus: "ok",
      ultimoEm: "2026-06-02T08:00:00.000Z",
      okHoje: true,
      teveHistorico: true,
      erros24h: 0,
    },
  ],
});

describe("buildPlatformHealthTechLogs", () => {
  it("inclui resumo e entradas por integração", () => {
    const rows = buildPlatformHealthTechLogs(baseSnapshot());
    expect(rows[0].tipo).toBe(TIPO_DIAGNOSTICO_RESUMO);
    expect(rows.some((r) => r.integracao_slug === "casa_apostas")).toBe(true);
  });

  it("marca falha quando último sync falhou", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      integracoes: [
        {
          slug: "casa_apostas",
          nome: "CDA",
          integracaoSlugFk: "casa_apostas",
          ultimoStatus: "falha",
          ultimoEm: "2026-06-02T08:00:00.000Z",
          okHoje: false,
          teveHistorico: true,
          erros24h: 1,
        },
      ],
    });
    const counts = countDiagnosticSummary(rows);
    expect(counts.erro).toBeGreaterThan(0);
    expect(rows.some((r) => r.descricao.includes("falha"))).toBe(true);
  });

  it("detecta secret CDA ausente", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      secrets: { ...baseSnapshot().secrets, cdaConfigurado: false },
    });
    expect(rows.some((r) => r.descricao.includes("CDA") && r.descricao.includes("Credencial"))).toBe(true);
  });
});

describe("labelTipoTechLog", () => {
  it("traduz tipos de diagnóstico", () => {
    expect(labelTipoTechLog("diagnostico_plataforma")).toBe("Diagnóstico (resumo)");
  });
});
