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
): boolean {
  if (filtro === FILTRO_STAFF_ESTUDIO_TODOS) return true;
  const slug = dealerEstudioSlugEfetivo(row, opParaEstudio);
  if (filtro === FILTRO_STAFF_ESTUDIO_NENHUM) return !slug;
  return slug === filtro;
}
