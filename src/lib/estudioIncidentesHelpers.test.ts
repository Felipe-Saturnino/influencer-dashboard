import { describe, expect, it } from "vitest";
import {
  incidenteProtocoloFamilia,
  incidenteProtocoloPrecisaRegenerar,
} from "./estudioIncidentesHelpers";

describe("incidenteProtocoloFamilia", () => {
  it("mapeia Caso / Oculto / família Erro", () => {
    expect(incidenteProtocoloFamilia("caso")).toBe("CASO");
    expect(incidenteProtocoloFamilia("oculto")).toBe("OCULTO");
    expect(incidenteProtocoloFamilia("erro")).toBe("ERRO");
    expect(incidenteProtocoloFamilia("nao_avisado")).toBe("ERRO");
    expect(incidenteProtocoloFamilia("avisado_resolvido")).toBe("ERRO");
    expect(incidenteProtocoloFamilia("avisado_nao_resolvido")).toBe("ERRO");
  });
});

describe("incidenteProtocoloPrecisaRegenerar", () => {
  it("regenera só quando a família muda", () => {
    expect(incidenteProtocoloPrecisaRegenerar("caso", "erro")).toBe(true);
    expect(incidenteProtocoloPrecisaRegenerar("erro", "oculto")).toBe(true);
    expect(incidenteProtocoloPrecisaRegenerar("caso", "oculto")).toBe(true);
    expect(incidenteProtocoloPrecisaRegenerar("erro", "nao_avisado")).toBe(false);
    expect(incidenteProtocoloPrecisaRegenerar("caso", "caso")).toBe(false);
  });
});
