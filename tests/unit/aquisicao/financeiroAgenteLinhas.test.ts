import { describe, expect, it } from "vitest";
import {
  filtrarAgentesDoCiclo,
  mapAgentesParaPagamentoRows,
  rotuloAgenteFinanceiro,
} from "@/pages/aquisicao/Financeiro/financeiroAgenteLinhas";

describe("filtrarAgentesDoCiclo", () => {
  const base = [
    { id: "1", total: 100, status: "em_analise", operadora_slug: "blaze" },
    { id: "2", total: 200, status: "em_analise", operadora_slug: "casa_apostas" },
  ];

  it("filtra por operadora única na barra", () => {
    const out = filtrarAgentesDoCiclo(base, { filterOperadora: "blaze", filtroOp: undefined });
    expect(out).toHaveLength(1);
    expect(out[0]?.operadora_slug).toBe("blaze");
  });

  it("mantém todos com Todas Operadoras", () => {
    expect(filtrarAgentesDoCiclo(base, { filterOperadora: "todas", filtroOp: undefined })).toHaveLength(2);
  });
});

describe("mapAgentesParaPagamentoRows", () => {
  it("usa descricao como nome na tabela", () => {
    const rows = mapAgentesParaPagamentoRows([
      { id: "x", total: 50, status: "em_analise", descricao: "João Silva", operadora_slug: "blaze" },
    ]);
    expect(rows[0]?.is_agente).toBe(true);
    expect(rows[0]?.influencer_name).toBe("João Silva");
  });

  it("fallback quando descricao vazia", () => {
    expect(rotuloAgenteFinanceiro("  ")).toBe("Agente");
  });
});
