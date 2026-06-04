/** Decodifica corpo RSS respeitando charset do header ou da declaração XML. */

export function parseCharsetFromContentType(contentType: string | null | undefined): string | null {
  if (!contentType?.trim()) return null;
  const m = contentType.match(/charset\s*=\s*["']?([\w.-]+)/i);
  return m ? m[1].trim().toLowerCase() : null;
}

export function parseCharsetFromXmlDeclaration(head: string): string | null {
  const m = head.match(/<\?xml[^>]+encoding\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim().toLowerCase() : null;
}

export function normalizeRssCharset(label: string): string {
  const c = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (c === "utf8") return "utf-8";
  if (c === "iso88591" || c === "latin1") return "iso-8859-1";
  if (c === "windows1252" || c === "cp1252") return "windows-1252";
  return label.toLowerCase();
}

export function resolveRssFeedCharset(
  bytes: Uint8Array,
  contentType: string | null | undefined,
): string {
  const fromHeader = parseCharsetFromContentType(contentType);
  if (fromHeader) return normalizeRssCharset(fromHeader);

  const head = new TextDecoder("iso-8859-1").decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  const fromXml = parseCharsetFromXmlDeclaration(head);
  if (fromXml) return normalizeRssCharset(fromXml);

  return "utf-8";
}

export function decodeRssFeedBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    try {
      return new TextDecoder("iso-8859-1").decode(bytes);
    } catch {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  }
}

export async function decodeRssFeedResponse(
  body: ArrayBuffer,
  contentType: string | null | undefined,
): Promise<string> {
  const bytes = new Uint8Array(body);
  if (bytes.length === 0) return "";
  const charset = resolveRssFeedCharset(bytes, contentType);
  return decodeRssFeedBytes(bytes, charset);
}
