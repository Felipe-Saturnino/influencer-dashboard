import type { ControleTurnoTurno } from "./types";

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
