import { describe, expect, it } from "vitest";
import {
  mapaCelulasFromGradeCarregarPayload,
  parseRhGestaoEscalaGradeCarregarPayload,
} from "@/pages/rh/GestaoEscala/gestaoEscalaHelpers";

describe("parseRhGestaoEscalaGradeCarregarPayload", () => {
  it("aceita array jsonb (formato novo)", () => {
    const rows = parseRhGestaoEscalaGradeCarregarPayload([
      { funcionario_id: "a1", dia_iso: "2026-08-01", valor: "MRN" },
      { funcionario_id: "a1", dia_iso: "2026-08-02", valor: "Folga" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.valor).toBe("MRN");
  });

  it("aceita string JSON", () => {
    const rows = parseRhGestaoEscalaGradeCarregarPayload(
      JSON.stringify([{ funcionario_id: "b2", dia_iso: "2026-08-03T00:00:00", valor: "AFT" }]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dia_iso).toBe("2026-08-03");
  });

  it("mapaCelulas monta chaves funcionario|dia", () => {
    const m = mapaCelulasFromGradeCarregarPayload([
      { funcionario_id: "u1", dia_iso: "2026-08-01", valor: "NGT" },
    ]);
    expect(m["u1|2026-08-01"]).toBe("NGT");
  });
});
