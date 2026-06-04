/** Limpeza de HTML/boilerplate RSS para título e detalhe do painel TV. */

const MEDIA_TAG =
  /(?:img|figure|picture|iframe|video|audio|embed|source|object|svg|noscript|script|style)/i;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function normalizeEspacos(s: string): string {
  return s
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limparLinhaEditorial(line: string): string {
  return line
    .replace(/^['"']?\s*>\s*/, "")
    .replace(/\s*\([^)]*\bfoto\s*:[^)]*\)/gi, "")
    .replace(/\s*\(\s*reprodução\s*\/?\s*foto\s*:[^)]*\)/gi, "")
    .trim();
}

/** Linhas de galeria, crédito ou HTML quebrado — não são texto editorial. */
export function linhaIrrelevantePainelNoticia(line: string): boolean {
  const raw = line.trim();
  if (!raw) return false;
  if (/^['"']?\s*>\s/.test(raw)) return true;
  if (/\(foto\s*:/i.test(raw)) return true;
  if (/\(reprodução\s*\/?\s*foto\s*:/i.test(raw)) return true;

  const cleaned = limparLinhaEditorial(raw);
  if (!cleaned) return true;
  const lower = cleaned.toLowerCase();
  if (/^crédito\s*:/.test(lower)) return true;
  if (/^fonte\s*:/.test(lower)) return true;
  if (/^imagem\s*:/.test(lower)) return true;
  if (/^veja\s+(também|mais)\b/.test(lower)) return true;
  if (/^leia\s+também\b/.test(lower)) return true;

  if (cleaned.length < 95 && /^[\wÀ-ú''.\s-]+,\s*do\s+/i.test(cleaned)) return true;

  return false;
}

export function filtrarLinhasPainelNoticia(text: string): string {
  const lines = text.split("\n").map(limparLinhaEditorial);
  return normalizeEspacos(
    lines
      .filter((line) => {
        if (!line.trim()) return true;
        return !linhaIrrelevantePainelNoticia(line);
      })
      .join("\n"),
  );
}

/** HTML RSS → texto legível (remove mídia, listas/galeria, atributos soltos). */
export function sanitizePainelNoticiaHtml(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  let s = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<ul\b[\s\S]*?<\/ul>/gi, "\n")
    .replace(/<ol\b[\s\S]*?<\/ol>/gi, "\n")
    .replace(/<\/?(?:ul|ol|figure|figcaption)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  s = s.replace(new RegExp(`<${MEDIA_TAG.source}[^>]*\\/?>`, "gi"), " ");
  s = s.replace(new RegExp(`<${MEDIA_TAG.source}\\b[^>\\n]*`, "gi"), " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+|alt|title|class|width|height)\s*=\s*['"][^'"]*['"]/gi, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+)\s*=\s*[^\s'"]+/gi, " ");
  s = s.replace(/https?:\/\/[^\s]+\.(?:webp|jpe?g|png|gif|svg|bmp)(?:\?[^\s]*)?/gi, " ");
  s = s.replace(/\bdata-[\w-]+(?:\.\.\.)?/gi, " ");

  s = decodeHtmlEntities(s);
  s = s.replace(/['"']\s*>\s*/g, " ");
  s = s.replace(/(?:^|\n)\s*>\s*/g, "\n");

  return filtrarLinhasPainelNoticia(normalizeEspacos(s));
}

export function normalizePainelNoticiaTexto(s: string): string {
  return normalizeEspacos(s).toLowerCase();
}

/** Rodapés WordPress / agregadores que não são conteúdo editorial. */
export function removePainelNoticiaBoilerplate(text: string, titulo?: string): string {
  let t = text;

  t = t.replace(/O post [\s\S]+? apareceu primeiro em [^\n.]+\.?\s*/gi, "");
  t = t.replace(/The post [\s\S]+? appeared first on [^\n.]+\.?\s*/gi, "");
  t = t.replace(/^Continue lendo[^\n]*\n?/gim, "");
  t = t.replace(/^Leia mais[^\n]*\n?/gim, "");
  t = t.replace(/^Clique aqui[^\n]*\n?/gim, "");
  t = t.replace(/^Saiba mais[^\n]*\n?/gim, "");

  t = normalizeEspacos(t);

  if (titulo) {
    const nt = normalizePainelNoticiaTexto(titulo);
    const lines = t.split("\n").filter((line) => {
      const nl = normalizePainelNoticiaTexto(line);
      if (!nl) return true;
      if (nl === nt) return false;
      if (nl.startsWith("o post ") && nl.includes("apareceu primeiro em")) return false;
      return true;
    });
    t = normalizeEspacos(lines.join("\n"));
  }

  return filtrarLinhasPainelNoticia(t);
}

function pareceUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** ESPN e outros feeds enviam literalmente "null" no &lt;description&gt;. */
export function normalizarResumoRssBruto(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^(null|undefined|n\/a|none|-)$/i.test(t)) return null;
  return raw;
}

export function tituloPareceTruncadoRss(titulo: string): boolean {
  const t = titulo.trim();
  if (!t) return true;
  return t.endsWith("...") || t.endsWith("…");
}

/** Item apto para TV: tem resumo ou título completo (não truncado no RSS). */
export function itemElegivelPainelNoticia(
  titulo: string,
  resumo: string | null | undefined,
): boolean {
  const t = titulo.trim();
  if (t.length < 12 || pareceUrl(t)) return false;
  if (normalizarResumoRssBruto(resumo)) return true;
  return !tituloPareceTruncadoRss(t);
}

function tituloUtil(s: string | null | undefined): boolean {
  if (!s?.trim()) return false;
  const t = s.trim();
  if (pareceUrl(t)) return false;
  if (t.length < 8) return false;
  if (/^o post .+ apareceu primeiro em/i.test(t)) return false;
  if (linhaIrrelevantePainelNoticia(t)) return false;
  return true;
}

/** Primeira frase ou linha utilizável como manchete. */
export function extrairTituloDoConteudo(texto: string): { titulo: string; resto: string } {
  const t = filtrarLinhasPainelNoticia(texto).trim();
  if (!t) return { titulo: "", resto: "" };

  const frase = t.match(/^(.{24,220}?[.!?])(?:\s|\n|$)/s);
  if (frase && frase[1].length <= 200) {
    return { titulo: frase[1].trim(), resto: t.slice(frase[1].length).trim() };
  }

  const quebra = t.indexOf("\n\n");
  if (quebra >= 40 && quebra <= 200) {
    return { titulo: t.slice(0, quebra).trim(), resto: t.slice(quebra).trim() };
  }

  const linha = t.indexOf("\n");
  if (linha >= 40 && linha <= 200) {
    return { titulo: t.slice(0, linha).trim(), resto: t.slice(linha).trim() };
  }

  if (t.length > 120) {
    const cut = t.slice(0, 120);
    const lastSpace = cut.lastIndexOf(" ");
    const titulo = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + "…";
    const resto = t.slice(lastSpace > 60 ? lastSpace : 120).trim();
    return { titulo, resto };
  }

  return { titulo: t, resto: "" };
}

export function formatTituloPainelNoticia(
  tituloRaw: string | null | undefined,
  resumoRaw: string | null | undefined,
): string {
  const titulo = removePainelNoticiaBoilerplate(sanitizePainelNoticiaHtml(tituloRaw));

  if (tituloUtil(titulo)) return titulo;

  const conteudo = removePainelNoticiaBoilerplate(
    sanitizePainelNoticiaHtml(resumoRaw),
    titulo || undefined,
  );
  if (conteudo) {
    const { titulo: derivado } = extrairTituloDoConteudo(conteudo);
    if (tituloUtil(derivado)) return derivado;
  }

  if (titulo && !pareceUrl(titulo)) return titulo;
  return tituloUtil(titulo) ? titulo : "";
}

export function prepararTextoPainelNoticia(
  tituloRaw: string | null | undefined,
  resumoRaw: string | null | undefined,
): { titulo: string; corpo: string } {
  const resumoNorm = normalizarResumoRssBruto(resumoRaw);
  let titulo = formatTituloPainelNoticia(tituloRaw, resumoNorm);
  let corpo = removePainelNoticiaBoilerplate(
    sanitizePainelNoticiaHtml(resumoNorm),
    titulo || sanitizePainelNoticiaHtml(tituloRaw) || undefined,
  );

  if (!tituloUtil(titulo) && corpo) {
    const split = extrairTituloDoConteudo(corpo);
    if (tituloUtil(split.titulo)) {
      titulo = split.titulo;
      corpo = split.resto;
    }
  }

  if (titulo && corpo) {
    const nt = normalizePainelNoticiaTexto(titulo);
    const nc = normalizePainelNoticiaTexto(corpo);
    if (nc === nt) {
      corpo = "";
    } else if (nc.startsWith(nt)) {
      const esc = titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      corpo = corpo.replace(new RegExp(`^${esc}\\s*`, "i"), "").trim();
    }
  }

  corpo = filtrarLinhasPainelNoticia(corpo);

  if (!tituloUtil(titulo)) titulo = "Notícia";

  return { titulo, corpo };
}
