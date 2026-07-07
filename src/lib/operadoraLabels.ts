import type { Operadora } from "../types";

export type OperadoraLabelRow = Pick<Operadora, "slug" | "nome" | "brand_action">;

/** Mapa slug → cadastro (mesma fonte que Gestão de Operadoras). */
export function buildOperadoraBySlugMap(list: readonly OperadoraLabelRow[]): Record<string, OperadoraLabelRow> {
  const m: Record<string, OperadoraLabelRow> = {};
  for (const o of list) m[o.slug] = o;
  return m;
}

/** Rótulo visível: `operadoras.nome` ou fallback no slug bruto. */
export function labelOperadoraFromSlug(
  slug: string | null | undefined,
  bySlug: Record<string, OperadoraLabelRow>,
): string {
  const s = (slug ?? "").trim();
  if (!s) return "—";
  return bySlug[s]?.nome?.trim() || s;
}
