import { BRAND } from "./dashboardConstants";

/** Chaves de jogo com identidade visual fixa na plataforma (paleta de mercado). */
export type GameIdentityKey = "blackjack" | "roleta" | "baccarat" | "futebol_brasileiro";

/**
 * Hex canónico por jogo — Global § Identidade visual por jogo.
 * Não confundir com semântica de KPI (verde=bom, vermelho=ruim) nem whitelabel.
 */
export const GAME_IDENTITY_HEX: Record<GameIdentityKey, string> = {
  blackjack: "#22c55e",
  roleta: BRAND.vermelho,
  baccarat: BRAND.azul,
  futebol_brasileiro: BRAND.amarelo,
};

export const GAME_IDENTITY_LABEL: Record<GameIdentityKey, string> = {
  blackjack: "Blackjack",
  roleta: "Roleta",
  baccarat: "Baccarat",
  futebol_brasileiro: "Futebol Brasileiro",
};

const GAME_IDENTITY_TEXT: Record<GameIdentityKey, { light: string; dark: string }> = {
  blackjack: { light: "#15803d", dark: "#86efac" },
  roleta: { light: "#b02a14", dark: "#ff8570" },
  baccarat: { light: "#1631c4", dark: "#7b95ff" },
  futebol_brasileiro: { light: "#b45309", dark: "#fcd34d" },
};

/** Cor de texto em chips/tags (Roteiro de Mesa, filtros semânticos). */
export function gameIdentityTextColor(key: GameIdentityKey, isDark: boolean): string {
  return isDark ? GAME_IDENTITY_TEXT[key].dark : GAME_IDENTITY_TEXT[key].light;
}

/** Estilo de chip/tag ativo por jogo (bg, borda, texto). */
export function getGameTagChipStyle(key: GameIdentityKey, isDark: boolean) {
  const hex = GAME_IDENTITY_HEX[key];
  return {
    hex,
    bg: `color-mix(in srgb, ${hex} 12%, transparent)`,
    border: `color-mix(in srgb, ${hex} 28%, transparent)`,
    color: gameIdentityTextColor(key, isDark),
  };
}

/** Lista para Comparativo de Jogo (Overview Spin) e KPIs por jogo (Gestão de Mesas). */
export const JOGOS_IDENTIDADE_LISTA = (
  ["blackjack", "roleta", "baccarat", "futebol_brasileiro"] as const
).map((key) => ({
  key,
  label: GAME_IDENTITY_LABEL[key],
  cor: GAME_IDENTITY_HEX[key],
}));
