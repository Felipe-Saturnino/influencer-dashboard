export const RH_VAGA_TAG_MAX_LEN = 40;
export const RH_VAGA_TAGS_MAX = 20;

export function normalizarTagVaga(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function tagVagaJaExiste(tags: readonly string[], candidata: string): boolean {
  const n = normalizarTagVaga(candidata).toLocaleLowerCase("pt-BR");
  if (!n) return false;
  return tags.some((t) => t.toLocaleLowerCase("pt-BR") === n);
}

export type AdicionarTagVagaResult =
  | { ok: true; tags: string[] }
  | { ok: false; reason: "vazio" | "duplicada" | "longa" | "limite" };

export function adicionarTagVaga(tags: readonly string[], raw: string): AdicionarTagVagaResult {
  const tag = normalizarTagVaga(raw);
  if (!tag) return { ok: false, reason: "vazio" };
  if (tag.length > RH_VAGA_TAG_MAX_LEN) return { ok: false, reason: "longa" };
  if (tags.length >= RH_VAGA_TAGS_MAX) return { ok: false, reason: "limite" };
  if (tagVagaJaExiste(tags, tag)) return { ok: false, reason: "duplicada" };
  return { ok: true, tags: [...tags, tag] };
}

export function removerTagVaga(tags: readonly string[], index: number): string[] {
  return tags.filter((_, i) => i !== index);
}

export function formatTagsVagaLabel(tags: string[] | null | undefined): string {
  const list = (tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (!list.length) return "—";
  return list.join(", ");
}

export function mensagemErroAdicionarTagVaga(reason: Exclude<AdicionarTagVagaResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "duplicada":
      return "Esta tag já foi adicionada.";
    case "longa":
      return `Cada tag pode ter no máximo ${RH_VAGA_TAG_MAX_LEN} caracteres.`;
    case "limite":
      return `Limite de ${RH_VAGA_TAGS_MAX} tags por vaga.`;
    default:
      return "";
  }
}
