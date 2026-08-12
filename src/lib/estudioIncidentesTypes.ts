/** Tipos e catálogos do domínio Estúdio → Incidentes. */

export type IncidenteTimeAlvo = "gp" | "shuf";

export type IncidenteCategoria =
  | "caso"
  | "erro"
  | "oculto"
  | "nao_avisado"
  | "avisado_resolvido"
  | "avisado_nao_resolvido";

export type IncidenteLocalMesa = "em_mesa" | "fora_mesa";

export type IncidenteResolucao =
  | "Resolvido"
  | "Jogo Cancelado"
  | "Jogo Encerrado Incorretamente"
  | "Não afetado";

export type EstudioIncidenteRow = {
  id: string;
  protocolo: string;
  ocorrido_em: string;
  time_alvo: IncidenteTimeAlvo;
  prestador_id: string;
  prestador_nome: string;
  mesa_id: string | null;
  mesa_label: string;
  estudio_slug: string | null;
  jogo: string;
  incidente: IncidenteCategoria;
  tipo: string;
  id_rodada: string;
  data_rodada: string;
  hora_rodada: string;
  local_mesa: IncidenteLocalMesa | null;
  resolucao: IncidenteResolucao;
  payout_necessario: boolean;
  descricao: string;
  relator_user_id: string | null;
  relator_nome: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EstudioIncidenteAnexoRow = {
  id: string;
  incidente_id: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
};

export type EstudioIncidenteInsert = {
  ocorrido_em?: string;
  time_alvo: IncidenteTimeAlvo;
  prestador_id: string;
  prestador_nome: string;
  mesa_id: string | null;
  mesa_label: string;
  estudio_slug: string | null;
  jogo: string;
  incidente: IncidenteCategoria;
  tipo: string;
  id_rodada: string;
  data_rodada: string;
  hora_rodada: string;
  local_mesa: IncidenteLocalMesa | null;
  resolucao: IncidenteResolucao;
  payout_necessario: boolean;
  descricao: string;
  relator_user_id: string | null;
  relator_nome: string;
  created_by: string | null;
};

/** Campos editáveis — relator / created_at não entram no patch.
 * Protocolo é gerado/regenerado no banco se a família da categoria (CASO/OCULTO/ERRO) mudar. */
export type EstudioIncidenteUpdate = {
  time_alvo: IncidenteTimeAlvo;
  prestador_id: string;
  prestador_nome: string;
  mesa_id: string | null;
  mesa_label: string;
  estudio_slug: string | null;
  jogo: string;
  incidente: IncidenteCategoria;
  tipo: string;
  id_rodada: string;
  data_rodada: string;
  hora_rodada: string;
  local_mesa: IncidenteLocalMesa | null;
  resolucao: IncidenteResolucao;
  payout_necessario: boolean;
  descricao: string;
};

export type IncidenteStaffOption = {
  id: string;
  nome: string;
  /** Nickname de staff (Gestão de Staff) — busca no formulário. */
  nickname: string | null;
  timeKey: IncidenteTimeAlvo;
  papel: string;
  orgTimeNome: string;
};

/** Valor persistido em `id_rodada` quando o usuário marca «Não tem ID». */
export const INCIDENTE_ID_RODADA_SEM_ID = "—";

export const INCIDENTE_CATEGORIA_META: Record<
  IncidenteCategoria,
  { label: string; prefix: "CASO" | "OCULTO" | "ERRO"; color: string }
> = {
  caso: { label: "Caso", prefix: "CASO", color: "#a78bfa" },
  erro: { label: "Erro", prefix: "ERRO", color: "#e84025" },
  oculto: { label: "Oculto", prefix: "OCULTO", color: "#6b7280" },
  nao_avisado: { label: "Não Avisado", prefix: "ERRO", color: "#f59e0b" },
  avisado_resolvido: { label: "Avisado/Resolvido", prefix: "ERRO", color: "#22c55e" },
  avisado_nao_resolvido: { label: "Avisado/Não Resolvido", prefix: "ERRO", color: "#e84025" },
};

export const INCIDENTE_CATEGORIA_OPTIONS: { value: IncidenteCategoria; label: string }[] = [
  { value: "caso", label: "Caso" },
  { value: "erro", label: "Erro" },
  { value: "oculto", label: "Oculto" },
  { value: "nao_avisado", label: "Não Avisado" },
  { value: "avisado_resolvido", label: "Avisado/Resolvido" },
  { value: "avisado_nao_resolvido", label: "Avisado/Não Resolvido" },
];

export const INCIDENTE_RESOLUCAO_OPTIONS: IncidenteResolucao[] = [
  "Resolvido",
  "Jogo Cancelado",
  "Jogo Encerrado Incorretamente",
  "Não afetado",
];

/** Tipos de erro — Blackjack (Game Presenter). */
export const TIPOS_INCIDENTE_BLACKJACK: string[] = [
  "Card not scanned",
  "Card scanned too early",
  "Cards Scattered or Dropped",
  "Card(s) on the floor",
  "Cards were dealt with unshuffled shoe",
  "Extra card not needed",
  "Faced up card in the shoe",
  "Game before time",
  "Game(s) instead of the shoe change",
  "Hidden card opened before time",
  "ID card not scanned",
  "Incorrect card position",
  "Less/ More boxes",
  "Misscan",
  "Next card scanned instead of the hidden card",
  "Removed cards before the end of the game",
  "Scan Hidden Card before time",
  "Two (or more) cards out",
  "Two (or more) cards out (with cutting card)",
  "Two (or more) cards out (before cutting card)",
  "Wrong Action",
];

/** Baccarat e Futebol Brasileiro (Game Presenter). */
export const TIPOS_INCIDENTE_BACCARAT_FB: string[] = [
  "Cards scattered or dropped",
  "Card(s) on the floor",
  "Cards were dealt with un-shuffled shoe",
  "Extra card not needed",
  "Faced up card in the shoe",
  "Game before time",
  "Game(s) instead of the shoe change",
  "Incorrect burn procedure",
  "ID card not scanned",
  "Incorrect card position",
  "Misscan",
  "Removed cards before the end of the game",
  "Two (or more) cards out",
  "Two (or more) cards out (with cutting card)",
  "Two (or more) cards out (before cutting card)",
  "Wrong Action",
];

export const TIPOS_INCIDENTE_ROLETA: string[] = [
  "Ball out",
  "Ball dropped",
  "Ball spun twice instead of confirming the result",
  "Game before time / Early spin",
  "ID card not scanned",
  "No spin",
  "Same direction",
  "Two balls in the wheel",
  "Two balls out",
  "Wheel stopped",
  "Wrong action",
  "Wrong direction",
];

export const TIPOS_INCIDENTE_SHUFFLER: string[] = [
  "Bad Shuffle",
  "Card(s) on the floor",
  "Cards Scattered",
  "CC placed incorrectly",
  "Face up card",
  "Game delay",
  "Shuffle chack",
  "Wrong action",
  "Wrong procedure",
];

export const ESTUDIO_INCIDENTES_ANEXO_MAX_BYTES = 50 * 1024 * 1024;
export const ESTUDIO_INCIDENTES_STORAGE_BUCKET = "estudio-incidentes";

/** Carrossel começa em julho/2026 (produto). */
export const INCIDENTES_MES_INICIO = { ano: 2026, mes: 6 as const };

export const INCIDENTES_PAGE_SUBTITLE =
  "Registre e acompanhe erros de mesa por Game Presenter e Shuffler no período.";
