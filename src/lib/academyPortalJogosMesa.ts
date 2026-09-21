import { fetchAllPages } from "./supabasePaginate";
import { supabase } from "./supabase";

/** Valor automático de `jogo_mesa` em Manuais cujo tipo não é Jogos. */
export const ACADEMY_MANUAL_JOGO_TODOS = "Todos os Jogos";

/**
 * Persistência de jogos em Manuais:
 * - Tipo Jogos → seleção do modal (ou null se vazio)
 * - Demais tipos → `["Todos os Jogos"]` (campo oculto no modal)
 */
export function jogoMesaParaPersistirManual(
  tipoManual: string,
  jogosSelecionados: string[],
): string[] | null {
  if (tipoManual === "Jogos") {
    return jogosSelecionados.length > 0 ? jogosSelecionados : null;
  }
  return [ACADEMY_MANUAL_JOGO_TODOS];
}

/** Jogos distintos da coluna tipo_jogo em mesas_spin_cadastro (Gestão de Estúdios). */
export async function carregarJogosMesasEstudio(): Promise<string[]> {
  const data = await fetchAllPages<{ tipo_jogo: string | null; id: string }>(async (from, to) => {
    const res = await supabase
      .from("mesas_spin_cadastro")
      .select("id, tipo_jogo")
      .not("tipo_jogo", "is", null)
      .order("tipo_jogo", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    return { data: res.data as { tipo_jogo: string | null; id: string }[] | null, error: res.error };
  });

  const set = new Set<string>();
  for (const row of data) {
    const j = row.tipo_jogo?.trim();
    if (j) set.add(j);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

/** Normaliza coluna legada (text) ou array do Postgres para lista de jogos. */
export function normalizarJogosMesa(valor: string | string[] | null | undefined): string[] {
  if (valor == null) return [];
  if (Array.isArray(valor)) {
    return [...new Set(valor.map((j) => j.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );
  }
  const t = valor.trim();
  return t ? [t] : [];
}
