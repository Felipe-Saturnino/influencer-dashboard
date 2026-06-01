/** Datas civis e instantes no fuso America/Sao_Paulo (paridade com edge functions). */
export const TIMEZONE_BRASIL = "America/Sao_Paulo";

/** Hoje como YYYY-MM-DD em São Paulo. */
export function hojeIsoBrasil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE_BRASIL });
}

/** Data civil YYYY-MM-DD em São Paulo a partir de instante ISO (UTC). */
export function isoDateBrasilFromInstant(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE_BRASIL });
}

/** Subtrai dias no calendário civil (entrada/saída YYYY-MM-DD). */
export function subDiasIso(isoDate: string, dias: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - dias);
  return dt.toISOString().slice(0, 10);
}

/** Meia-noite do dia civil em SP como ISO UTC (SP = UTC−3, sem horário de verão). */
export function inicioDiaBrasilUtcIso(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).toISOString();
}

/** Hora atual (0–23) em America/Sao_Paulo. */
export function horaAtualBrasil(): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE_BRASIL,
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return parseInt(h, 10);
}

/** Já passou do horário agendado no dia civil de Brasília (ex.: 4 = 4h). */
export function passouHorarioAgendadoBr(horaAgendada: number): boolean {
  return horaAtualBrasil() >= horaAgendada;
}

/** Rótulo curto pt-BR para data civil YYYY-MM-DD (sem deslocar o dia). */
export function fmtDataBrasilCurta(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}
