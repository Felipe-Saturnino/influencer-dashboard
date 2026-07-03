import { supabase } from "./supabase";

/** Jogos distintos da coluna tipo_jogo em mesas_spin_cadastro (Gestão de Estúdios). */
export async function carregarJogosMesasEstudio(): Promise<string[]> {
  const { data, error } = await supabase
    .from("mesas_spin_cadastro")
    .select("tipo_jogo")
    .not("tipo_jogo", "is", null)
    .order("tipo_jogo");

  if (error) {
    console.error("[carregarJogosMesasEstudio]", error);
    return [];
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const j = (row as { tipo_jogo: string | null }).tipo_jogo?.trim();
    if (j) set.add(j);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}
