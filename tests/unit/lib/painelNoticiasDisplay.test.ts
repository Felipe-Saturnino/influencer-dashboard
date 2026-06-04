import { describe, expect, it } from "vitest";
import {
  calcularPainelNoticiasExibicao,
  idsPainelNoticiasParaPurga,
  type PainelNoticiaRow,
} from "@/lib/painelNoticiasDisplay";

function row(id: string, visivel_desde: string, visivel_ate: string): PainelNoticiaRow {
  return { id, titulo: id, resumo: null, visivel_desde, visivel_ate };
}

describe("calcularPainelNoticiasExibicao", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("retorna todas frescas quando >= 5", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row(
        String(i),
        `2026-06-03T${10 + i}:00:00.000Z`,
        "2026-06-03T20:00:00.000Z",
      ),
    );
    expect(calcularPainelNoticiasExibicao(rows, now)).toHaveLength(6);
  });

  it("completa com vencidas até 5", () => {
    const fresca = row("f1", "2026-06-03T11:00:00.000Z", "2026-06-03T20:00:00.000Z");
    const v1 = row("v1", "2026-06-02T10:00:00.000Z", "2026-06-03T08:00:00.000Z");
    const v2 = row("v2", "2026-06-02T09:00:00.000Z", "2026-06-03T07:00:00.000Z");
    const v3 = row("v3", "2026-06-02T08:00:00.000Z", "2026-06-03T06:00:00.000Z");
    const v4 = row("v4", "2026-06-02T07:00:00.000Z", "2026-06-03T05:00:00.000Z");
    const exibir = calcularPainelNoticiasExibicao([v4, v3, v2, v1, fresca], now);
    expect(exibir.map((r) => r.id)).toEqual(["f1", "v1", "v2", "v3", "v4"]);
  });
});

describe("idsPainelNoticiasParaPurga", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("mantém vencidas usadas no completar e apaga excesso", () => {
    const fresca = row("f1", "2026-06-03T11:00:00.000Z", "2026-06-03T20:00:00.000Z");
    const keep = row("v1", "2026-06-02T10:00:00.000Z", "2026-06-03T08:00:00.000Z");
    const v2 = row("v2", "2026-06-02T09:00:00.000Z", "2026-06-03T07:00:00.000Z");
    const v3 = row("v3", "2026-06-02T08:00:00.000Z", "2026-06-03T06:00:00.000Z");
    const v4 = row("v4", "2026-06-02T07:00:00.000Z", "2026-06-03T05:00:00.000Z");
    const drop = row("v5", "2026-06-02T06:00:00.000Z", "2026-06-03T04:00:00.000Z");
    const ids = idsPainelNoticiasParaPurga([drop, v4, v3, v2, keep, fresca], now);
    expect(ids).toEqual(["v5"]);
  });
});
