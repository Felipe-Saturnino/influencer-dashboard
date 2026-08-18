import { describe, expect, it } from "vitest";
import { staffSkillsParaJogosEVip } from "../../../src/lib/rhGamePresenterDealerSync";

describe("staffSkillsParaJogosEVip", () => {
  it("não inventa Roleta quando nenhuma skill de jogo está ativa", () => {
    expect(staffSkillsParaJogosEVip({})).toEqual({ jogos: [], vip: false });
    expect(
      staffSkillsParaJogosEVip({
        baccarat: "inativo",
        blackjack: "treinamento",
        roleta: "inativo",
        vip: "inativo",
      }),
    ).toEqual({ jogos: [], vip: false });
  });

  it("mapeia skills ativas e VIP sem default de Roleta", () => {
    expect(
      staffSkillsParaJogosEVip({
        baccarat: "ativo",
        vip: "ativo",
        roleta: "inativo",
      }),
    ).toEqual({ jogos: ["baccarat"], vip: true });
  });
});
