import type { RhFuncionario } from "../../../types/rhFuncionario";

export const FILTRO_STAFF_ESTUDIO_TODOS = "todos";
export const FILTRO_STAFF_ESTUDIO_NENHUM = "nenhum";

/** Valor no cadastro Staff: prestador atende todos os estúdios ativos. */
export const STAFF_ESTUDIO_CADASTRO_TODOS = "todos";

export type EstudioStaffRow = { slug: string; nome: string; tipo: string };

type JunctionRow = { operadora_slug: string; estudio_slug: string; tipo: string };

/** Mapa operadora → estúdio (preferência dedicado). Uso: fallback legado / insert — NÃO para escopo de listagem. */
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

/**
 * Todos os estúdios vinculados às operadoras do escopo (dedicado + network).
 * Usar no filtro de listagem do Operador — o mapa 1:1 esconde network.
 */
export function buildEstudiosSlugsParaOperadoras(
  junction: readonly { operadora_slug: string; estudio_slug: string }[],
  operadoraSlugs: readonly string[],
): string[] {
  const ops = new Set(operadoraSlugs.map((s) => s.trim()).filter(Boolean));
  if (ops.size === 0) return [];
  const set = new Set<string>();
  for (const row of junction) {
    const op = row.operadora_slug.trim();
    const est = row.estudio_slug.trim();
    if (op && est && ops.has(op)) set.add(est);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
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

export type StaffEstudioVinculo = Pick<RhFuncionario, "staff_estudio_slug" | "staff_estudio_slugs" | "staff_operadora_slug">;

export function parseStaffEstudioSlugs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

export function staffEstudioAtendeTodos(slugs: readonly string[]): boolean {
  return slugs.includes(STAFF_ESTUDIO_CADASTRO_TODOS);
}

function staffEstudioSlugLegado(row: StaffEstudioVinculo, opParaEstudio: Record<string, string>): string {
  const direct = (row.staff_estudio_slug ?? "").trim();
  if (direct) return direct;
  const op = (row.staff_operadora_slug ?? "").trim();
  return op && opParaEstudio[op] ? opParaEstudio[op]! : "";
}

/** Slugs efetivos do prestador (array novo ou legado de um slug). */
export function staffEstudioSlugsFromRow(row: StaffEstudioVinculo, opParaEstudio: Record<string, string>): string[] {
  const fromArray = parseStaffEstudioSlugs(row.staff_estudio_slugs);
  if (fromArray.length > 0) return fromArray;
  const legacy = staffEstudioSlugLegado(row, opParaEstudio);
  return legacy ? [legacy] : [];
}

/** Slug primário para horário de turno, sync legado e ordenação. */
export function staffEstudioSlugEfetivo(row: StaffEstudioVinculo, opParaEstudio: Record<string, string>): string {
  const slugs = staffEstudioSlugsFromRow(row, opParaEstudio);
  if (staffEstudioAtendeTodos(slugs)) return "";
  return slugs[0] ?? staffEstudioSlugLegado(row, opParaEstudio);
}

export function staffEstudioLabel(slugs: readonly string[], estudiosNome: Record<string, string>): string {
  if (slugs.length === 0) return "—";
  if (staffEstudioAtendeTodos(slugs)) return "Todos Estúdios";
  return slugs.map((s) => estudiosNome[s] ?? s).join(" · ");
}

export function staffEstudioLabelFromRow(
  row: StaffEstudioVinculo,
  estudiosNome: Record<string, string>,
  opParaEstudio: Record<string, string>,
): string {
  return staffEstudioLabel(staffEstudioSlugsFromRow(row, opParaEstudio), estudiosNome);
}

export function normalizeStaffEstudioSlugsForSave(slugs: readonly string[]): string[] {
  const trimmed = slugs.map((s) => s.trim()).filter(Boolean);
  if (trimmed.includes(STAFF_ESTUDIO_CADASTRO_TODOS)) return [STAFF_ESTUDIO_CADASTRO_TODOS];
  return [...new Set(trimmed)];
}

export function staffEstudioSlugPrimarioParaSync(slugs: readonly string[]): string | null {
  if (slugs.length === 0 || staffEstudioAtendeTodos(slugs)) return null;
  return slugs[0]?.trim() || null;
}

export function staffRowPassaFiltroEstudio(
  row: StaffEstudioVinculo,
  filtro: string,
  opParaEstudio: Record<string, string>,
): boolean {
  if (filtro === FILTRO_STAFF_ESTUDIO_TODOS) return true;
  const slugs = staffEstudioSlugsFromRow(row, opParaEstudio);
  if (filtro === FILTRO_STAFF_ESTUDIO_NENHUM) return slugs.length === 0;
  if (staffEstudioAtendeTodos(slugs)) return true;
  return slugs.includes(filtro);
}

export function primeiraOperadoraDoEstudio(
  estudioSlug: string,
  operadorasPorEstudio: Record<string, readonly string[]>,
): string | null {
  const list = operadorasPorEstudio[estudioSlug.trim()] ?? [];
  const first = list[0]?.trim();
  return first || null;
}
