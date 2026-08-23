import { describe, expect, it } from "vitest";
import { buildPerformanceHubAgenda } from "../../../src/lib/academyPerformanceHubAgenda";
import type { PerformanceHubAvaliacao } from "../../../src/lib/academyPerformanceHubTypes";

const staff = {
  id: "staff-1",
  nome: "Ana Silva",
  turno: "Manhã",
  goLive: "01/08/2026",
  goLiveIso: "2026-08-01",
  dataInicioIso: "2026-08-01",
  time: "game_presenter" as const,
};

function avaliacao(partial: Partial<PerformanceHubAvaliacao>): PerformanceHubAvaliacao {
  return {
    id: "1",
    data: "15/08/2026",
    time: "game_presenter",
    avaliadoNome: "Ana Silva",
    avaliadoStaffId: "staff-1",
    avaliadorNome: "Coach",
    status: "aguardando",
    notaTotal: 9,
    notaImagem: 9,
    notaComunicacao: 9,
    notaMesa: 9,
    notaProcedimentos: null,
    ...partial,
  };
}

describe("buildPerformanceHubAgenda — realizadas", () => {
  const mes = { ano: 2026, mes: 7 };

  it("conta Aguardando, Feedback e Aprovado como realizadas", () => {
    const rows = [
      avaliacao({ id: "a", status: "aguardando" }),
      avaliacao({ id: "b", status: "feedback" }),
      avaliacao({ id: "c", status: "aprovado" }),
    ];
    const agenda = buildPerformanceHubAgenda([staff], rows, mes, "game_presenter");
    expect(agenda[0]?.realizadas).toBe(3);
    expect(agenda[0]?.pendentes).toBe(0);
  });

  it("não conta rascunho", () => {
    const rows = [avaliacao({ status: "rascunho" })];
    const agenda = buildPerformanceHubAgenda([staff], rows, mes, "game_presenter");
    expect(agenda[0]?.realizadas).toBe(0);
    expect(agenda[0]?.pendentes).toBe(3);
  });
});
