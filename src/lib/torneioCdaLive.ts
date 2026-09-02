/** Torneio Live Cassino CDA — rota pública /TorneioCDA (sem login). */

export const TORNEIO_CDA_SLUG = "cda-vip-setembro-2026";

/** Polling durante o evento ao vivo (ms). */
export const TORNEIO_CDA_POLL_MS = 30_000;

/** Máximo de itens em Atividades Recentes. */
export const TORNEIO_CDA_ATIVIDADE_LIMITE = 15;

export const TORNEIO_CDA_BG = "#001724";

export function torneioCdaPublicPath(): string {
  const b = import.meta.env.BASE_URL || "/";
  return b.endsWith("/") ? `${b}TorneioCDA` : `${b}/TorneioCDA`;
}

export function isTorneioCdaPublicPath(): boolean {
  const path = (typeof window !== "undefined" ? window.location.pathname : "/").replace(/\/+$/, "") || "/";
  const want = torneioCdaPublicPath().replace(/\/+$/, "") || "/";
  return path.toLowerCase() === want.toLowerCase();
}

export type TorneioCdaRow = {
  id: string;
  slug: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  ativo: boolean;
};

export type TorneioCdaRankingRow = {
  user_name: string;
  /** Nome travado do participante — exibido como nome do jogador na página. */
  apelido: string;
  posicao: number;
  rodadas_jogadas: number;
  rodadas_ganhas: number;
  valor_apostado: number;
  pontos: number;
  sincronizado_em: string;
};

export type TorneioCdaConsolidadoRow = {
  rodadas_jogadas: number;
  rodadas_ganhas: number;
  valor_apostado: number;
  sincronizado_em: string;
};

export type TorneioCdaAtividadeRow = {
  id: string;
  user_name: string;
  apelido: string;
  game_id: string;
  game_type: string;
  table_name: string;
  valor_net: number;
  mensagem: string;
  ocorrido_em: string;
};

const GAME_TYPE_LABEL: Record<string, string> = {
  Roulette: "Roleta",
  Blackjack: "Blackjack",
  StandardBaccarat: "Baccarat",
  LotusSpeedBaccarat: "Baccarat",
};

/** Classe CSS do chip de jogo (identidade canónica). */
export function torneioCdaGameTagClass(gameType: string): "roleta" | "blackjack" | "baccarat" | "outro" {
  const label = torneioCdaGameTypeLabel(gameType).toLowerCase();
  if (label === "roleta") return "roleta";
  if (label === "blackjack") return "blackjack";
  if (label === "baccarat") return "baccarat";
  return "outro";
}

export function torneioCdaGameTypeLabel(gameType: string): string {
  return GAME_TYPE_LABEL[gameType] ?? gameType ?? "Live Cassino";
}

export function fmtTorneioPontos(v: number): string {
  return `${v.toLocaleString("pt-BR")} pts`;
}

export function fmtTorneioSyncRelativo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Aguardando sync…";
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `Atualizado há ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Atualizado há ${min} min`;
  const h = Math.floor(min / 60);
  return `Atualizado há ${h} h`;
}
