import { FONT } from "../../../constants/theme";
import { shiftDiaIso } from "../../../lib/escalaRotacao";
import type { ControleTurnoTurno } from "./types";

/** Botão de retry em alertas de carga (Escala / Relatório / Notificações / Rotação). */
export const BTN_RETRY_CT_STYLE = {
  fontFamily: FONT.body,
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(232,64,37,0.35)",
  background: "transparent",
  color: "#e84025",
  cursor: "pointer",
} as const;

export function labelTurnoCurto(turno: ControleTurnoTurno): string {
  if (turno === "manha") return "Manhã";
  if (turno === "tarde") return "Tarde";
  return "Noite";
}

export function formatDiaBr(iso: string): string {
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function formatDiaCurto(iso: string): string {
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}`;
}

function minutosHhmm(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return -1;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

/**
 * Saída após meia-noite (turno Noite): exibe o dia civil seguinte para não parecer
 * que a linha é do outro dia do carrossel (ex.: 07:09 · 07/09 com carrossel em 06/09).
 */
export function formatSaidaPresencaCt(diaIso: string, entrada: string, saida: string): string {
  const s = saida.trim();
  if (!s) return "—";
  const eMin = minutosHhmm(entrada);
  const sMin = minutosHhmm(s);
  if (eMin >= 0 && sMin >= 0 && sMin < eMin) {
    return `${s} · ${formatDiaCurto(shiftDiaIso(diaIso, 1))}`;
  }
  return s;
}
