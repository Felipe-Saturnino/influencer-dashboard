import { describe, expect, it } from "vitest";
import {
  GAME_IDENTITY_HEX,
  GAME_IDENTITY_LABEL,
  gameIdentityTextColor,
  getGameMesaTituloMix,
  getGameTagChipStyle,
  JOGOS_IDENTIDADE_LISTA,
} from "@/lib/gameIdentityColors";

describe("GAME_IDENTITY_HEX", () => {
  it("mantém paleta canónica por jogo", () => {
    expect(GAME_IDENTITY_HEX.blackjack).toBe("#22c55e");
    expect(GAME_IDENTITY_HEX.roleta).toBe("#e84025");
    expect(GAME_IDENTITY_HEX.baccarat).toBe("#1e36f8");
    expect(GAME_IDENTITY_HEX.futebol_brasileiro).toBe("#f59e0b");
  });
});

describe("JOGOS_IDENTIDADE_LISTA", () => {
  it("lista os quatro jogos com label e cor", () => {
    expect(JOGOS_IDENTIDADE_LISTA).toHaveLength(4);
    expect(JOGOS_IDENTIDADE_LISTA.map((j) => j.key)).toEqual([
      "blackjack",
      "roleta",
      "baccarat",
      "futebol_brasileiro",
    ]);
    for (const j of JOGOS_IDENTIDADE_LISTA) {
      expect(j.label).toBe(GAME_IDENTITY_LABEL[j.key]);
      expect(j.cor).toBe(GAME_IDENTITY_HEX[j.key]);
    }
  });
});

describe("getGameTagChipStyle", () => {
  it("retorna hex, bg, border e cor de texto distintas por tema", () => {
    const light = getGameTagChipStyle("baccarat", false);
    const dark = getGameTagChipStyle("baccarat", true);
    expect(light.hex).toBe("#1e36f8");
    expect(light.bg).toContain("color-mix");
    expect(light.color).not.toBe(dark.color);
  });
});

describe("gameIdentityTextColor", () => {
  it("varia entre light e dark", () => {
    expect(gameIdentityTextColor("roleta", false)).not.toBe(gameIdentityTextColor("roleta", true));
  });
});

describe("getGameMesaTituloMix", () => {
  it("gera accent e borda a partir do hex", () => {
    const mix = getGameMesaTituloMix(GAME_IDENTITY_HEX.blackjack);
    expect(mix.accent).toBe("#22c55e");
    expect(mix.border).toContain("1px solid");
  });
});
