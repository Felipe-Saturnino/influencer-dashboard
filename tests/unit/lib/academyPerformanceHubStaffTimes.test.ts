import { describe, expect, it } from "vitest";
import {
  agruparTimeIdsPorSlugPerformanceHub,
  slugTimePerformanceHubDeId,
  slugTimePerformanceHubDeNome,
} from "../../../src/lib/academyPerformanceHubStaffTimes";

describe("academyPerformanceHubStaffTimes", () => {
  it("reconhece singular, plural, acentos e sufixos no nome do time", () => {
    expect(slugTimePerformanceHubDeNome("Game Presenter")).toBe("game_presenter");
    expect(slugTimePerformanceHubDeNome("Game Presenters")).toBe("game_presenter");
    expect(slugTimePerformanceHubDeNome("  GAME  PRESENTER  ")).toBe("game_presenter");
    expect(slugTimePerformanceHubDeNome("Game Presenter - CDA")).toBe("game_presenter");
    expect(slugTimePerformanceHubDeNome("Shuffler")).toBe("shuffler");
    expect(slugTimePerformanceHubDeNome("Shufflers")).toBe("shuffler");
    expect(slugTimePerformanceHubDeNome("Shift Leader")).toBeNull();
    expect(slugTimePerformanceHubDeNome("")).toBeNull();
  });

  it("agrupa todos os times GP/Shuffler, não só o primeiro nome exacto", () => {
    const grouped = agruparTimeIdsPorSlugPerformanceHub([
      { id: "gp-1", nome: "Game Presenter" },
      { id: "gp-2", nome: "Game Presenters" },
      { id: "sh-1", nome: "Shuffler" },
      { id: "sl-1", nome: "Shift Leader" },
      { id: "gp-1", nome: "Game Presenter" },
    ]);
    expect(grouped.game_presenter).toEqual(["gp-1", "gp-2"]);
    expect(grouped.shuffler).toEqual(["sh-1"]);
  });

  it("resolve o slug a partir do org_time_id", () => {
    const ids = agruparTimeIdsPorSlugPerformanceHub([
      { id: "gp-1", nome: "Game Presenter" },
      { id: "sh-1", nome: "Shufflers" },
    ]);
    expect(slugTimePerformanceHubDeId("gp-1", ids)).toBe("game_presenter");
    expect(slugTimePerformanceHubDeId("sh-1", ids)).toBe("shuffler");
    expect(slugTimePerformanceHubDeId("outro", ids)).toBeNull();
  });
});
