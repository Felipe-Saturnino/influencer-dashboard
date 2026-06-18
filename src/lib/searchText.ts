/**
 * Busca textual insensível a acentos e maiúsculas (barra de pesquisa e filtros em painel).
 * Ex.: «Flavia» encontra «Flávia»; «jose» encontra «José».
 */
export function normalizarTextoBusca(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** `true` se `buscaRaw` estiver vazia ou aparecer em `haystack` (após normalização). */
export function textoContemBusca(haystack: string | null | undefined, buscaRaw: string): boolean {
  const q = normalizarTextoBusca(buscaRaw);
  if (!q) return true;
  return normalizarTextoBusca(haystack).includes(q);
}

/** `true` se `buscaRaw` estiver vazia ou coincidir com qualquer parte. */
export function textoContemBuscaEmAlgum(buscaRaw: string, ...partes: (string | null | undefined)[]): boolean {
  const q = normalizarTextoBusca(buscaRaw);
  if (!q) return true;
  return partes.some((p) => normalizarTextoBusca(p).includes(q));
}
