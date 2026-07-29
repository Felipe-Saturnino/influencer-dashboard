import { describe, expect, it } from "vitest";
import { parseRhCalendarioGradeMesPayload } from "../../../src/lib/rhCalendarioGradeMes";

describe("parseRhCalendarioGradeMesPayload", () => {
  const row = {
    funcionario_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    dia_iso: "2026-08-01",
    valor: "MRN",
    area_key: "game_presenter",
  };

  it("aceita array jsonb direto", () => {
    expect(parseRhCalendarioGradeMesPayload([row])).toEqual([
      {
        funcionario_id: row.funcionario_id,
        dia_iso: "2026-08-01",
        valor: "MRN",
        area_key: "game_presenter",
      },
    ]);
  });

  it("aceita string JSON", () => {
    expect(parseRhCalendarioGradeMesPayload(JSON.stringify([row]))).toHaveLength(1);
  });

  it("aceita envelope data / nome da RPC", () => {
    expect(parseRhCalendarioGradeMesPayload({ data: [row] })).toHaveLength(1);
    expect(parseRhCalendarioGradeMesPayload({ rh_calendario_grade_mes: [row] })).toHaveLength(1);
  });

  it("ignora payload inválido", () => {
    expect(parseRhCalendarioGradeMesPayload(null)).toEqual([]);
    expect(parseRhCalendarioGradeMesPayload({ foo: 1 })).toEqual([]);
    expect(parseRhCalendarioGradeMesPayload([{ funcionario_id: "", dia_iso: "2026-08-01" }])).toEqual([]);
  });
});
