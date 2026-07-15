import { compareLocaleTexto, type SortDir } from "./classificacaoSort";

/** Limites do carrossel de dia (alinhados ao carrossel de mês do Calendário RH). */
export function diaMinimoCarrosselRelatorioPresenca(anoMin: number, mes0Min: number): Date {
  return new Date(anoMin, mes0Min, 1);
}

/** Último dia do mês máximo do carrossel (mês civil seguinte ao atual). */
export function diaMaximoCarrosselRelatorioPresenca(mesMaxPrimeiroDia: Date): Date {
  return new Date(mesMaxPrimeiroDia.getFullYear(), mesMaxPrimeiroDia.getMonth() + 1, 0);
}

export function clamarDiaCarrosselRelatorioPresenca(
  dia: Date,
  minDia: Date,
  maxDia: Date,
): Date {
  const t = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  if (t.getTime() < minDia.getTime()) return new Date(minDia);
  if (t.getTime() > maxDia.getTime()) return new Date(maxDia);
  return t;
}

/** Rótulo do carrossel de dia — ex.: «Terça, 14 de Julho». */
export function labelCarrosselDiaRelatorioPresenca(d: Date): string {
  const s = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ordenarLinhasRelatorioPresencaPorNome<T extends { nome: string }>(
  linhas: T[],
  dir: SortDir,
): T[] {
  const copy = [...linhas];
  copy.sort((a, b) => compareLocaleTexto(a.nome, b.nome, dir));
  return copy;
}
