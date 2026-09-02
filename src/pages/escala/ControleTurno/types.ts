export type ControleTurnoAba = "escala" | "rotacao" | "relatorio" | "notificacoes";

export type ControleTurnoTurno = "manha" | "tarde" | "noite";

export const CONTROLE_TURNO_ABAS: readonly ControleTurnoAba[] = [
  "escala",
  "rotacao",
  "relatorio",
  "notificacoes",
] as const;

export const CONTROLE_TURNO_TURNO_LABEL: Record<ControleTurnoTurno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const CONTROLE_TURNO_SUBTITULO =
  "Acompanhe rotação, escala/presença e notificações operacionais do turno.";
