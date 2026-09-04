/**
 * Busca textual insensível a acentos e maiúsculas (barra de pesquisa e filtros em painel).
 * Ex.: «Flavia» encontra «Flávia»; «jose» encontra «José».
 * Várias palavras: cada token deve aparecer (AND) — «Alexandre Zanchetta» encontra
 * «Alexandre Galvão Zanchetta».
 */
export function normalizarTextoBusca(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Tokens normalizados da busca (espaços); vazio se não houver termo. */
export function tokensBusca(buscaRaw: string): string[] {
  const q = normalizarTextoBusca(buscaRaw);
  if (!q) return [];
  return q.split(/\s+/).filter(Boolean);
}

/** `true` se `buscaRaw` estiver vazia ou todos os tokens aparecerem em `haystack`. */
export function textoContemBusca(haystack: string | null | undefined, buscaRaw: string): boolean {
  const tokens = tokensBusca(buscaRaw);
  if (tokens.length === 0) return true;
  const hay = normalizarTextoBusca(haystack);
  return tokens.every((t) => hay.includes(t));
}

/**
 * `true` se `buscaRaw` estiver vazia ou cada token coincidir em algum dos campos
 * (permite «Alexandre Zanchetta» no nome e «Filipe» no nickname misturados).
 */
export function textoContemBuscaEmAlgum(buscaRaw: string, ...partes: (string | null | undefined)[]): boolean {
  const tokens = tokensBusca(buscaRaw);
  if (tokens.length === 0) return true;
  const haystacks = partes.map((p) => normalizarTextoBusca(p));
  return tokens.every((t) => haystacks.some((h) => h.includes(t)));
}
