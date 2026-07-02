import type { GameIdentityKey } from "./gameIdentityColors";
import { GAME_IDENTITY_LABEL } from "./gameIdentityColors";
import type {
  PerformanceHubJogoKey,
  PerformanceHubMesaTipo,
  PerformanceHubTurno,
} from "./academyPerformanceHubTypes";

export interface PerformanceHubEstudioOption {
  id: string;
  nome: string;
}

export interface PerformanceHubJogoMeta {
  label: string;
  mesaTipo: PerformanceHubMesaTipo;
  gameKey: GameIdentityKey;
}

export const PERFORMANCE_HUB_ESTUDIOS_ATIVOS: PerformanceHubEstudioOption[] = [
  { id: "sports_club", nome: "Sports Club" },
  { id: "blaze_dedicado", nome: "Blaze Dedicado" },
];

export const PERFORMANCE_HUB_JOGOS_POR_ESTUDIO: Record<string, PerformanceHubJogoKey[]> = {
  sports_club: ["baccarat", "roleta", "blackjack"],
  blaze_dedicado: ["baccarat", "blackjack", "futebol_brasileiro"],
};

export const PERFORMANCE_HUB_MESAS_POR_ESTUDIO_JOGO: Record<string, Record<string, number[]>> = {
  sports_club: {
    baccarat: [101, 102, 103],
    roleta: [201, 202],
    blackjack: [301, 302, 303],
  },
  blaze_dedicado: {
    baccarat: [110, 111],
    blackjack: [310],
    futebol_brasileiro: [401],
  },
};

export const PERFORMANCE_HUB_JOGOS_META: Record<PerformanceHubJogoKey, PerformanceHubJogoMeta> = {
  baccarat: { label: GAME_IDENTITY_LABEL.baccarat, mesaTipo: "cartas", gameKey: "baccarat" },
  roleta: { label: GAME_IDENTITY_LABEL.roleta, mesaTipo: "roleta", gameKey: "roleta" },
  blackjack: { label: GAME_IDENTITY_LABEL.blackjack, mesaTipo: "cartas", gameKey: "blackjack" },
  futebol_brasileiro: {
    label: GAME_IDENTITY_LABEL.futebol_brasileiro,
    mesaTipo: "cartas",
    gameKey: "futebol_brasileiro",
  },
};

export const PERFORMANCE_HUB_TURNOS: PerformanceHubTurno[] = ["Manhã", "Tarde", "Noite"];

/** Defaults por nome do prestador (mock — em produção: cadastro RH/Staff). */
export const PERFORMANCE_HUB_PRESTADOR_DEFAULTS: Record<
  string,
  { turno: PerformanceHubTurno; estudioId: string }
> = {
  "Ana Beatriz Silva": { turno: "Manhã", estudioId: "sports_club" },
  "Rafael Costa": { turno: "Tarde", estudioId: "sports_club" },
  "Juliana Ferreira": { turno: "Noite", estudioId: "blaze_dedicado" },
  "Fernando Rocha": { turno: "Manhã", estudioId: "blaze_dedicado" },
  "Diego Santana": { turno: "Tarde", estudioId: "sports_club" },
  "Marcos Vieira": { turno: "Noite", estudioId: "sports_club" },
};

export function mesasDoEstudioJogo(estudioId: string, jogo: PerformanceHubJogoKey | ""): number[] {
  if (!jogo) return [];
  return PERFORMANCE_HUB_MESAS_POR_ESTUDIO_JOGO[estudioId]?.[jogo] ?? [];
}

export function jogosDoEstudio(estudioId: string): PerformanceHubJogoKey[] {
  return PERFORMANCE_HUB_JOGOS_POR_ESTUDIO[estudioId] ?? [];
}
