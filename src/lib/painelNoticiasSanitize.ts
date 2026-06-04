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

/** HTML RSS → texto legível (remove mídia, atributos soltos e URLs de imagem). */
export function sanitizePainelNoticiaHtml(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  let s = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  s = s.replace(new RegExp(`<${MEDIA_TAG.source}[^>]*\\/?>`, "gi"), " ");
  s = s.replace(new RegExp(`<${MEDIA_TAG.source}\\b[^>\\n]*`, "gi"), " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+)\s*=\s*['"][^'"]*['"]/gi, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+)\s*=\s*[^\s'"]+/gi, " ");
  s = s.replace(/https?:\/\/[^\s]+\.(?:webp|jpe?g|png|gif|svg|bmp)(?:\?[^\s]*)?/gi, " ");
  s = s.replace(/\bdata-[\w-]+(?:\.\.\.)?/gi, " ");

  return normalizeEspacos(decodeHtmlEntities(s));
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

  return t;
}

function pareceUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function tituloUtil(s: string | null | undefined): boolean {
  if (!s?.trim()) return false;
  const t = s.trim();
  if (pareceUrl(t)) return false;
  if (t.length < 8) return false;
  if (/^o post .+ apareceu primeiro em/i.test(t)) return false;
  return true;
}

/** Primeira frase ou linha utilizável como manchete. */
export function extrairTituloDoConteudo(texto: string): { titulo: string; resto: string } {
  const t = texto.trim();
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
  let titulo = sanitizePainelNoticiaHtml(tituloRaw);
  titulo = removePainelNoticiaBoilerplate(titulo);

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
  let titulo = formatTituloPainelNoticia(tituloRaw, resumoRaw);
  let corpo = removePainelNoticiaBoilerplate(
    sanitizePainelNoticiaHtml(resumoRaw),
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

  if (!tituloUtil(titulo)) titulo = "Notícia";

  return { titulo, corpo };
}
