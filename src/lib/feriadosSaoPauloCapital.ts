/**
 * Calendário de feriados para destaque na UI (cidade de São Paulo / SP capital).
 * Inclui feriados nacionais fixos, municipais/estaduais usuais da capital e Sexta-feira Santa (móvel).
 * **Não** entram pontos facultativos (ex.: Carnaval, Corpus Christi) — não são tratados como feriado na escala.
 */

function addDays(base: Date, delta: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + delta);
  return d;
}

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Domingo de Páscoa (calendário gregoriano). */
function domingoPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, month - 1, day);
}

function buildMapaFeriadosAno(ano: number): Map<string, string> {
  const map = new Map<string, string>();

  const add = (d: Date, label: string) => {
    map.set(isoLocal(d), label);
  };

  const addMd = (mes0: number, dia: number, label: string) => {
    add(new Date(ano, mes0, dia), label);
  };

  // Fixos nacionais (amplamente observados)
  addMd(0, 1, "Confraternização universal");
  addMd(3, 21, "Tiradentes");
  addMd(4, 1, "Dia do trabalhador");
  addMd(8, 7, "Independência do Brasil");
  addMd(9, 12, "Nossa Senhora Aparecida");
  addMd(10, 2, "Finados");
  addMd(10, 15, "Proclamação da República");
  addMd(11, 25, "Natal");

  // Municipal SP (capital)
  addMd(0, 25, "Aniversário de São Paulo");

  // Estadual SP — capital segue feriado da Consciência Negra (Lei estadual)
  addMd(10, 20, "Dia da Consciência Negra");

  const pascoa = domingoPascoa(ano);
  const sextaSanta = addDays(pascoa, -2);
  add(sextaSanta, "Sexta-feira Santa");

  return map;
}

const cacheAno = new Map<number, Map<string, string>>();

function mapaAno(ano: number): Map<string, string> {
  let m = cacheAno.get(ano);
  if (!m) {
    m = buildMapaFeriadosAno(ano);
    cacheAno.set(ano, m);
  }
  return m;
}

/** Rótulo do feriado em SP capital, se a data for feriado; senão `undefined`. */
export function feriadoLabelSaoPauloCapital(iso: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const ano = Number(iso.slice(0, 4));
  if (!Number.isFinite(ano)) return undefined;
  return mapaAno(ano).get(iso);
}

export function ehFeriadoSaoPauloCapital(iso: string): boolean {
  return feriadoLabelSaoPauloCapital(iso) !== undefined;
}
