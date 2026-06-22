/**
 * Enriquecimento cadastral CNPJ (cidade/UF) — Pipeline B2B.
 * Espelhado em supabase/functions/enrich-comercial-cnpj/index.ts — manter sincronizado.
 */

export interface CnpjLocalidadeEnriquecida {
  cidade: string;
  /** UF — 2 letras maiúsculas */
  estado: string;
}

export function cnpjSomenteDigitos(cnpj: string): string | null {
  const d = cnpj.replace(/\D/g, "");
  return d.length === 14 ? d : null;
}

/** Resposta típica Brasil API GET /api/cnpj/v1/{cnpj} */
export function parseBrasilApiCnpjLocalidade(payload: unknown): CnpjLocalidadeEnriquecida | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const cidade = String(o.municipio ?? "").trim();
  const estado = String(o.uf ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!cidade || estado.length !== 2) return null;
  return { cidade, estado };
}
