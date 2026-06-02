import type { ReactNode } from "react";
import { CircleDot, Crown, Flag, Spade } from "lucide-react";
import type { GameIdentityKey } from "./gameIdentityColors";

export const GAME_IDENTITY_ICON_SIZE = 13;

/** Ícones Lucide por jogo — Gestão de Dealers, Roteiro de Mesa, tags de elenco. */
export const GAME_IDENTITY_ICONS: Record<GameIdentityKey, ReactNode> = {
  blackjack: <Spade size={GAME_IDENTITY_ICON_SIZE} aria-hidden />,
  roleta: <CircleDot size={GAME_IDENTITY_ICON_SIZE} aria-hidden />,
  baccarat: <Crown size={GAME_IDENTITY_ICON_SIZE} aria-hidden />,
  futebol_brasileiro: <Flag size={GAME_IDENTITY_ICON_SIZE} aria-hidden />,
};

export function isGameIdentityKey(key: string): key is GameIdentityKey {
  return key in GAME_IDENTITY_ICONS;
}
