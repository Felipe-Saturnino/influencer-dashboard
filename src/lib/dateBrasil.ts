/** Datas civis e instantes no fuso America/Sao_Paulo (paridade com edge functions). */
export const TIMEZONE_BRASIL = "America/Sao_Paulo";

/** Hoje como YYYY-MM-DD em São Paulo. */
export function hojeIsoBrasil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE_BRASIL });
}

/** Partes do dia civil atual em São Paulo (mês 1–12). */
export function hojePartesBrasil(agora = new Date()): { y: number; m: number; day: number } {
  const iso = agora.toLocaleDateString("en-CA", { timeZone: TIMEZONE_BRASIL });
  const [y, m, day] = iso.split("-").map(Number);
  return { y, m, day };
}

/**
 * `Date` local com ano/mês/dia iguais ao civil de Brasília (para carrosséis e mês fechado).
 * Não usar `.toISOString()` deste valor para chave de dia — preferir `hojeIsoBrasil` / `toISO` local.
 */
export function dateCivilBrasilHoje(agora = new Date()): Date {
  const { y, m, day } = hojePartesBrasil(agora);
  return new Date(y, m - 1, day);
}

/** Primeiro dia do mês civil atual em Brasília (Date local dia 1). */
export function primeiroDiaMesCivilBrasil(agora = new Date()): Date {
  const { y, m } = hojePartesBrasil(agora);
  return new Date(y, m - 1, 1);
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

/** Fim do dia civil em SP (23:59:59.999) como ISO UTC. */
export function fimDiaBrasilUtcIso(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 2, 59, 59, 999)).toISOString();
}

/** Intervalo do dia civil BR para filtros em `executado_em` (ISO UTC). */
export function periodoDiaBrasil(isoDate: string): {
  inicio: string;
  fim: string;
  fimExclusive: string;
} {
  return {
    inicio: inicioDiaBrasilUtcIso(isoDate),
    fim: fimDiaBrasilUtcIso(isoDate),
    fimExclusive: subDiasIso(isoDate, -1),
  };
}

/** Hora (0–23) em America/Sao_Paulo a partir de instante ISO. */
export function horaBrasilFromInstant(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE_BRASIL,
    hour: "numeric",
    hour12: false,
  }).format(d);
  return parseInt(h, 10);
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
