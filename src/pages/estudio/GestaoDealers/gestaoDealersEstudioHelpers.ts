import type { Dealer } from "../../../types";
import {
  FILTRO_STAFF_ESTUDIO_NENHUM,
  FILTRO_STAFF_ESTUDIO_TODOS,
} from "../../rh/GestaoStaff/gestaoStaffEstudioHelpers";

export type DealerEstudioVinculo = Pick<Dealer, "estudio_slug" | "operadora_slug">;

export function dealerEstudioSlugEfetivo(
  row: DealerEstudioVinculo,
  opParaEstudio: Record<string, string>,
): string {
  const direct = (row.estudio_slug ?? "").trim();
  if (direct) return direct;
  const op = (row.operadora_slug ?? "").trim();
  return op && opParaEstudio[op] ? opParaEstudio[op]! : "";
}

export function dealerEstudioLabelFromRow(
  row: DealerEstudioVinculo,
  estudiosNome: Record<string, string>,
  opParaEstudio: Record<string, string>,
): string {
  const slug = dealerEstudioSlugEfetivo(row, opParaEstudio);
  if (!slug) return "—";
  return estudiosNome[slug] ?? slug;
}

export function dealerRowPassaFiltroEstudio(
  row: DealerEstudioVinculo,
  filtro: string,
  opParaEstudio: Record<string, string>,
  /** Quando definido (Operador), «Todos» e qualquer filtro ficam limitados a estes estúdios. */
  estudioSlugsPermitidos?: readonly string[] | null,
): boolean {
  const slug = dealerEstudioSlugEfetivo(row, opParaEstudio);
  if (estudioSlugsPermitidos?.length) {
    if (!slug || !estudioSlugsPermitidos.includes(slug)) return false;
  }
  if (filtro === FILTRO_STAFF_ESTUDIO_TODOS) return true;
  if (filtro === FILTRO_STAFF_ESTUDIO_NENHUM) return !slug;
  return slug === filtro;
}

/** Dealer pertence a algum estúdio do escopo do Operador (slug direto ou legado via operadora). */
export function dealerNoEscopoEstudio(
  row: DealerEstudioVinculo,
  estudioSlugsPermitidos: readonly string[],
  opParaEstudio: Record<string, string>,
): boolean {
  if (estudioSlugsPermitidos.length === 0) return false;
  const slug = dealerEstudioSlugEfetivo(row, opParaEstudio);
  return !!slug && estudioSlugsPermitidos.includes(slug);
}
