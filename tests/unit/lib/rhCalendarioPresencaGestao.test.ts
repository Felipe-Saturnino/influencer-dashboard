import { describe, expect, it } from "vitest";
import {
  computePresencaKpisConsolidados,
  resolverAcoesPresencaLinha,
} from "@/lib/rhCalendarioPresencaGestao";

const base = {
  situacao: "Folga",
  diaIso: "2026-07-18",
  entEsc: "—",
  saiEsc: "—",
  statusBase: "Folga",
};

describe("resolverAcoesPresencaLinha em Folga", () => {
  it("permite aprovar quando houve Check-in e Check-out", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
      }).acaoPrimaria,
    ).toBe("aprovar");
  });

  it("mantém sem aprovação quando o ponto está incompleto", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: false,
      }).acaoPrimaria,
    ).toBeNull();
  });

  it("não oferece nova aprovação depois de aprovado", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
        gestao: {
          statusGestao: "aprovado",
          historico: [],
        },
      }).acaoPrimaria,
    ).toBeNull();
  });
});

describe("computePresencaKpisConsolidados — Troca, Venda e Compra", () => {
  const dia = (over: Partial<Parameters<typeof computePresencaKpisConsolidados>[0][number]>) => ({
    situacao: "Folga",
    status: "Folga",
    temCheckIn: false,
    ...over,
  });

  it("conta como Troca os dias de Venda e Compra - Turno vindos de Oferta de Troca", () => {
    const kpis = computePresencaKpisConsolidados([
      dia({ situacao: "Venda", origemTrocaMarketplace: true }),
      dia({ situacao: "Compra - Manhã", origemTrocaMarketplace: true }),
    ]);
    expect(kpis.trocas).toBe(2);
    expect(kpis.venda).toBe(0);
    expect(kpis.compra).toBe(0);
  });

  it("mantém Venda e Compra quando a origem não é troca", () => {
    const kpis = computePresencaKpisConsolidados([
      dia({ situacao: "Venda" }),
      dia({ situacao: "Compra - Noite" }),
      dia({ situacao: "Compra" }),
    ]);
    expect(kpis.trocas).toBe(0);
    expect(kpis.venda).toBe(1);
    expect(kpis.compra).toBe(2);
  });

  it("conta a célula Troca gravada manualmente na Escala", () => {
    const kpis = computePresencaKpisConsolidados([dia({ situacao: "Troca" })]);
    expect(kpis.trocas).toBe(1);
  });
});
