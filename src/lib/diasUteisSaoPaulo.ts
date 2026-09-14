import { ehFeriadoSaoPauloCapital } from "./feriadosSaoPauloCapital";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + delta);
  return d;
}

/** Seg–sex e não feriado nacional/SP capital. */
export function ehDiaUtilSaoPaulo(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !ehFeriadoSaoPauloCapital(isoLocal(d));
}

/** Último dia útil do mês civil de `ref` (inclusive). */
export function ultimoDiaUtilDoMes(ref: Date = new Date()): Date {
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  let cur = fim;
  while (!ehDiaUtilSaoPaulo(cur)) {
    cur = addDays(cur, -1);
  }
  return cur;
}

/**
 * Quantidade de dias úteis restantes até o último dia útil do mês,
 * contando o dia de `ref` se for útil e o último dia útil.
 * Ex.: se hoje é o último dia útil → 1.
 */
export function diasUteisRestantesAteFimDoMes(ref: Date = new Date()): number {
  const hoje = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const ultimo = ultimoDiaUtilDoMes(hoje);
  if (hoje.getTime() > ultimo.getTime()) return 0;

  let n = 0;
  let cur = hoje;
  while (cur.getTime() <= ultimo.getTime()) {
    if (ehDiaUtilSaoPaulo(cur)) n += 1;
    cur = addDays(cur, 1);
  }
  return n;
}

/** Home Gestor de Operações: alerta de escala só com ≤ 5 dias úteis até o fim do mês. */
export const HOME_ESCALA_ALERTA_DIAS_UTEIS_MAX = 5;

export function homeEscalaNaJanelaAlerta(ref: Date = new Date()): boolean {
  const restantes = diasUteisRestantesAteFimDoMes(ref);
  return restantes > 0 && restantes <= HOME_ESCALA_ALERTA_DIAS_UTEIS_MAX;
}
