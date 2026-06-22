import { supabase } from "./supabase";

/** Formata data/hora de registro do prospecto (created_at). */
export function fmtProspectoDataRegistro(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

/** Resolve nomes em profiles para uma lista de UUIDs de created_by. */
export async function fetchProspectoCriadorNomes(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("id, name").in("id", unique);
  if (error) {
    console.error("[prospectoRegistroMeta] Erro ao carregar nomes:", error);
    return {};
  }
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: { id: string; name: string | null }) => {
    map[p.id] = (p.name ?? "").trim() || "—";
  });
  return map;
}

export type ProspectoComCriador = {
  created_by?: string | null;
  criador_nome?: string | null;
};

/** Enriquece linhas de prospecto com criador_nome a partir de created_by. */
export async function enrichProspectosComCriadorNome<T extends ProspectoComCriador>(
  items: T[],
): Promise<T[]> {
  if (items.length === 0) return items;
  const map = await fetchProspectoCriadorNomes(items.map((i) => i.created_by ?? "").filter(Boolean));
  return items.map((item) => ({
    ...item,
    criador_nome: item.created_by ? map[item.created_by] ?? null : null,
  }));
}

/** Nome exibível do registrador (flag / modal). */
export function prospectoRegistradoPorLabel(criadorNome: string | null | undefined): string | null {
  const n = (criadorNome ?? "").trim();
  return n && n !== "—" ? n : null;
}
