import type { RhFuncionario } from "../../../types/rhFuncionario";

export const FILTRO_STAFF_ESTUDIO_TODOS = "todos";
export const FILTRO_STAFF_ESTUDIO_NENHUM = "nenhum";

export type EstudioStaffRow = { slug: string; nome: string; tipo: string };

type JunctionRow = { operadora_slug: string; estudio_slug: string; tipo: string };

/** Mapa operadora → estúdio (preferência dedicado). */
export function buildOperadoraParaEstudioMap(junction: readonly JunctionRow[]): Record<string, string> {
  const m: Record<string, string> = {};
  const sorted = [...junction].sort((a, b) => {
    const pa = a.tipo === "dedicado" ? 0 : 1;
    const pb = b.tipo === "dedicado" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.estudio_slug.localeCompare(b.estudio_slug, "pt-BR");
  });
  for (const row of sorted) {
    const op = row.operadora_slug.trim();
    if (!op || m[op]) continue;
    m[op] = row.estudio_slug;
  }
  return m;
}

/** Mapa estúdio → operadoras vinculadas (ordem estável). */
export function buildOperadorasPorEstudioMap(junction: readonly { operadora_slug: string; estudio_slug: string }[]): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const row of junction) {
    const est = row.estudio_slug.trim();
    const op = row.operadora_slug.trim();
    if (!est || !op) continue;
    if (!m[est]) m[est] = [];
    if (!m[est]!.includes(op)) m[est]!.push(op);
  }
  for (const k of Object.keys(m)) {
    m[k]!.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  return m;
}

export function staffEstudioSlugEfetivo(
  row: Pick<RhFuncionario, "staff_estudio_slug" | "staff_operadora_slug">,
  opParaEstudio: Record<string, string>,
): string {
  const direct = (row.staff_estudio_slug ?? "").trim();
  if (direct) return direct;
  const op = (row.staff_operadora_slug ?? "").trim();
  return op && opParaEstudio[op] ? opParaEstudio[op]! : "";
}

export function staffRowPassaFiltroEstudio(
  row: RhFuncionario,
  filtro: string,
  opParaEstudio: Record<string, string>,
): boolean {
  if (filtro === FILTRO_STAFF_ESTUDIO_TODOS) return true;
  const slug = staffEstudioSlugEfetivo(row, opParaEstudio);
  if (filtro === FILTRO_STAFF_ESTUDIO_NENHUM) return !slug;
  return slug === filtro;
}

export function primeiraOperadoraDoEstudio(
  estudioSlug: string,
  operadorasPorEstudio: Record<string, readonly string[]>,
): string | null {
  const list = operadorasPorEstudio[estudioSlug.trim()] ?? [];
  const first = list[0]?.trim();
  return first || null;
}
