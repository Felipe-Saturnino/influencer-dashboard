import { supabase } from "../../../lib/supabase";
import type { MesaCadastroResumo } from "./gestaoOperadorasUi";

type MesaOperadoraRow = {
  id: string;
  tipo_jogo: string;
  nome_mesa: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
  operadora_slug: string;
  estudio_slug: string | null;
};

/** Mesas vinculadas à operadora (legado + estúdios) com ID operadora só desta parceira. */
export async function fetchMesasOperadoraResumo(operadoraSlug: string): Promise<MesaCadastroResumo[]> {
  const slug = operadoraSlug.trim();
  if (!slug) return [];

  const { data: junctionRows, error: junctionErr } = await supabase
    .from("estudios_spin_operadoras")
    .select("estudio_slug")
    .eq("operadora_slug", slug);

  if (junctionErr) {
    console.error("estudios_spin_operadoras:", junctionErr);
  }

  const estudioSlugs = [...new Set((junctionRows ?? []).map((r) => r.estudio_slug).filter(Boolean))];

  let mesasQuery = supabase
    .from("mesas_spin_cadastro")
    .select(
      "id, tipo_jogo, nome_mesa, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, operadora_slug, estudio_slug",
    )
    .order("nome_mesa", { ascending: true });

  if (estudioSlugs.length > 0) {
    mesasQuery = mesasQuery.or(`operadora_slug.eq.${slug},estudio_slug.in.(${estudioSlugs.join(",")})`);
  } else {
    mesasQuery = mesasQuery.eq("operadora_slug", slug);
  }

  const { data: mesasRaw, error: mesasErr } = await mesasQuery;
  if (mesasErr || !mesasRaw) {
    console.error("mesas_spin_cadastro:", mesasErr);
    return [];
  }

  const mesas = (mesasRaw as MesaOperadoraRow[]).filter(
    (m) => m.operadora_slug === slug || (m.estudio_slug != null && estudioSlugs.includes(m.estudio_slug)),
  );

  if (mesas.length === 0) return [];

  const mesaIds = mesas.map((m) => m.id);
  const identMap = new Map<string, string | null>();

  const { data: idents, error: identErr } = await supabase
    .from("mesas_spin_operadora_identificacao")
    .select("mesa_id, mesa_identificacao_operadora")
    .eq("operadora_slug", slug)
    .in("mesa_id", mesaIds);

  if (identErr) {
    console.error("mesas_spin_operadora_identificacao:", identErr);
  } else {
    for (const row of idents ?? []) {
      identMap.set(row.mesa_id, row.mesa_identificacao_operadora);
    }
  }

  return mesas.map((m) => {
    const idJunction = identMap.get(m.id);
    const idOperadora =
      idJunction !== undefined
        ? idJunction?.trim() || null
        : m.operadora_slug === slug
          ? m.mesa_identificacao_operadora?.trim() || null
          : null;

    return {
      tipo_jogo: m.tipo_jogo,
      nome_mesa: m.nome_mesa,
      numero_mesa: m.numero_mesa,
      mesa_identificacao: m.mesa_identificacao,
      mesa_identificacao_operadora: idOperadora,
    };
  });
}
