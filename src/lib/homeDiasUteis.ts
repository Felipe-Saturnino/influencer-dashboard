import { ehFeriadoSaoPauloCapital } from "./feriadosSaoPauloCapital";

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysLocal(base: Date, delta: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + delta);
  return d;
}

/** Seg–sex, excluindo feriados nacionais + SP capital. */
export function ehDiaUtilSp(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  if (dow === 0 || dow === 6) return false;
  return !ehFeriadoSaoPauloCapital(iso);
}

/** Último dia útil do mês civil de `ref` (inclusivo). */
export function ultimoDiaUtilDoMes(ref: Date = new Date()): Date {
  const ultimo = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  let cur = ultimo;
  while (!ehDiaUtilSp(isoLocal(cur))) {
    cur = addDaysLocal(cur, -1);
  }
  return cur;
}

/**
 * Quantidade de dias úteis restantes até o último dia útil do mês,
 * contando a partir de amanhã (hoje não entra).
 */
export function diasUteisRestantesAteFimMes(ref: Date = new Date()): number {
  const fim = ultimoDiaUtilDoMes(ref);
  const hoje = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (isoLocal(hoje) >= isoLocal(fim)) return 0;
  let count = 0;
  let cur = addDaysLocal(hoje, 1);
  while (isoLocal(cur) <= isoLocal(fim)) {
    if (ehDiaUtilSp(isoLocal(cur))) count += 1;
    cur = addDaysLocal(cur, 1);
  }
  return count;
}
