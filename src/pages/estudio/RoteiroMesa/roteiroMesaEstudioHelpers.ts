import {
  buildOperadoraParaEstudioMap,
  buildOperadorasPorEstudioMap,
  primeiraOperadoraDoEstudio,
} from "../../rh/GestaoStaff/gestaoStaffEstudioHelpers";

export { buildOperadoraParaEstudioMap, buildOperadorasPorEstudioMap };

export type RoteiroEstudioVinculo = {
  estudio_slug?: string | null;
  operadora_slug: string;
};

export function roteiroEstudioSlugEfetivo(
  row: RoteiroEstudioVinculo,
  opParaEstudio: Record<string, string>,
): string {
  const direct = (row.estudio_slug ?? "").trim();
  if (direct) return direct;
  const op = (row.operadora_slug ?? "").trim();
  return op && opParaEstudio[op] ? opParaEstudio[op]! : "";
}

export function roteiroEstudioLabelFromRow(
  row: RoteiroEstudioVinculo,
  estudiosNome: Record<string, string>,
  opParaEstudio: Record<string, string>,
): string {
  const slug = roteiroEstudioSlugEfetivo(row, opParaEstudio);
  if (!slug) return "—";
  return estudiosNome[slug] ?? slug;
}

/** operadora_slug para solicitações / RLS legado ao gravar por estúdio. */
export function operadoraSlugParaRoteiroInsert(
  estudioSlug: string,
  operadoraSlugsForcado: string[] | null,
  opParaEstudio: Record<string, string>,
  operadorasPorEstudio: Record<string, readonly string[]>,
): string | null {
  const est = estudioSlug.trim();
  if (!est) return null;
  if (operadoraSlugsForcado?.length) {
    const op = operadoraSlugsForcado.find((o) => opParaEstudio[o.trim()] === est);
    if (op) return op.trim();
  }
  return primeiraOperadoraDoEstudio(est, operadorasPorEstudio);
}

/** Compara mapas string→string sem nova referência quando o conteúdo é igual. */
export function roteiroRecordShallowEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

export function roteiroEstudiosListEqual(
  a: { slug: string; nome: string }[],
  b: { slug: string; nome: string }[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => row.slug === b[i]?.slug && row.nome === b[i]?.nome);
}

export function roteiroOperadorasPorEstEqual(
  a: Record<string, readonly string[]>,
  b: Record<string, readonly string[]>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => {
    const va = a[k] ?? [];
    const vb = b[k] ?? [];
    if (va.length !== vb.length) return false;
    return va.every((v, i) => v === vb[i]);
  });
}
