/** GS1-128 (UCC/EAN-128) — payload e dimensões físicas dos cartões de ID do staff. */

/** Caractere FNC1 (Function Code 1) — início obrigatório em GS1-128. */
export const GS1_FNC1 = "\u00cf";

/** AI 21 — número de série (comprimento variável). */
export const GS1_AI_SERIAL = "21";

/** Cartão inteiro: 5 cm × 3,6 cm. */
export const STAFF_ID_CARD_W_MM = 50;
export const STAFF_ID_CARD_H_MM = 36;

/** Área do código de barras: 1,4 cm × 1,6 cm. */
export const STAFF_ID_BARCODE_W_MM = 14;
export const STAFF_ID_BARCODE_H_MM = 16;

/**
 * Converte o valor cadastrado em `staff_barcode` para payload Code 128 com FNC1 (GS1-128).
 * Valores em notação GS1 com parênteses são normalizados; demais usam AI 21 (número de série).
 */
export function staffBarcodeParaGs128Payload(barcode: string): string {
  const raw = barcode.trim();
  if (!raw) return "";

  if (raw.includes("(")) {
    return gs1ElementStringParaPayload(raw);
  }

  const serial = raw.replace(/\s/g, "");
  return `${GS1_FNC1}${GS1_AI_SERIAL}${serial}`;
}

function gs1ElementStringParaPayload(elementString: string): string {
  let payload = "";
  const re = /\(\s*(\d{2,4})\s*\)\s*([^()]*)/g;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = re.exec(elementString)) !== null) {
    found = true;
    payload += `${GS1_FNC1}${match[1]}${match[2]!.trim()}`;
  }

  if (found) return payload;

  return `${GS1_FNC1}${GS1_AI_SERIAL}${elementString.replace(/\s/g, "")}`;
}
