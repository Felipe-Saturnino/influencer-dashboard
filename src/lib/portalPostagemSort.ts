/**
 * Ordenação das abas de leitura do Portal RH / Portal Academy (não Gerenciamento).
 * 1) Ciência pendente no topo
 * 2) Dentro de cada grupo: mais nova → mais antiga (`published_at`)
 */
export function comparePostagensLeituraPortal(
  a: { published_at?: string | null; id?: string },
  b: { published_at?: string | null; id?: string },
  opts: { cienciaPendenteA?: boolean; cienciaPendenteB?: boolean } = {},
): number {
  const pendA = opts.cienciaPendenteA === true;
  const pendB = opts.cienciaPendenteB === true;
  if (pendA !== pendB) return pendA ? -1 : 1;
  const tb = new Date(b.published_at ?? 0).getTime();
  const ta = new Date(a.published_at ?? 0).getTime();
  if (tb !== ta) return tb - ta;
  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

/** Só data de publicação (mais nova → mais antiga), sem ciência. */
export function comparePublishedAtDesc(
  a: { published_at?: string | null; id?: string },
  b: { published_at?: string | null; id?: string },
): number {
  return comparePostagensLeituraPortal(a, b);
}
