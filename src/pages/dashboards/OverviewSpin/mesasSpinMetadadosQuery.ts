import { queryClient } from "../../../lib/queryClient";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";

/** QueryKey estável — compartilhada pelos 9 hooks de Posicionamento (e futuros leitores). */
export const MESAS_SPIN_METADADOS_QUERY_KEY = ["overview-spin", "mesas-spin-metadados"] as const;

export const MESAS_SPIN_METADADOS_STALE_MS = 10 * 60 * 1000;

export type MetadadosMesaSpinMaps = {
  nomeEstudioPorMesa: Map<string, string>;
  canalPorMesa: Map<string, "dedicado" | "network">;
  nomeMesaPorId: Map<string, string>;
  tipoJogoPorId: Map<string, string>;
};

export const METADADOS_MESAS_SPIN_VAZIO: MetadadosMesaSpinMaps = {
  nomeEstudioPorMesa: new Map(),
  canalPorMesa: new Map(),
  nomeMesaPorId: new Map(),
  tipoJogoPorId: new Map(),
};

export function mapsMetadadosMesasSpin(
  mesasCad: { mesa_identificacao?: unknown; nome_mesa?: unknown; tipo_jogo?: unknown; estudio_slug?: unknown }[],
  estudiosCad: { slug?: unknown; nome?: unknown; tipo?: unknown }[],
): MetadadosMesaSpinMaps {
  const nomeEstudioPorSlug = new Map<string, string>();
  const tipoPorEstudio = new Map<string, "dedicado" | "network">();
  for (const e of estudiosCad) {
    const slug = typeof e.slug === "string" ? e.slug.trim() : "";
    const nome = typeof e.nome === "string" ? e.nome.trim() : "";
    if (slug && nome) nomeEstudioPorSlug.set(slug, nome);
    if (slug && (e.tipo === "dedicado" || e.tipo === "network")) {
      tipoPorEstudio.set(slug, e.tipo);
    }
  }

  const nomeEstudioPorMesa = new Map<string, string>();
  const canalPorMesa = new Map<string, "dedicado" | "network">();
  const nomeMesaPorId = new Map<string, string>();
  const tipoJogoPorId = new Map<string, string>();

  for (const m of mesasCad) {
    const mid = typeof m.mesa_identificacao === "string" ? m.mesa_identificacao.trim() : "";
    if (!mid) continue;
    const nomeMesa = typeof m.nome_mesa === "string" ? m.nome_mesa.trim() : "";
    const tipoJogo = typeof m.tipo_jogo === "string" ? m.tipo_jogo.trim() : "";
    if (nomeMesa) nomeMesaPorId.set(mid, nomeMesa);
    if (tipoJogo) tipoJogoPorId.set(mid, tipoJogo);
    const estSlug = typeof m.estudio_slug === "string" ? m.estudio_slug.trim() : "";
    if (!estSlug) continue;
    const nomeEst = nomeEstudioPorSlug.get(estSlug);
    if (nomeEst) nomeEstudioPorMesa.set(mid, nomeEst);
    const canal = tipoPorEstudio.get(estSlug);
    if (canal) canalPorMesa.set(mid, canal);
  }

  return { nomeEstudioPorMesa, canalPorMesa, nomeMesaPorId, tipoJogoPorId };
}

async function fetchMesasSpinMetadadosMaps(): Promise<MetadadosMesaSpinMaps> {
  const [mesasCad, estudiosCad] = await Promise.all([
    fetchAllPages(async (from, to) =>
      supabase
        .from("mesas_spin_cadastro")
        .select("mesa_identificacao, nome_mesa, tipo_jogo, estudio_slug")
        .range(from, to),
    ),
    fetchAllPages(async (from, to) =>
      supabase.from("estudios_spin").select("slug, nome, tipo").range(from, to),
    ),
  ]);
  return mapsMetadadosMesasSpin(mesasCad, estudiosCad);
}

/**
 * Catálogo mesas/estúdios via TanStack Query — um fetch compartilhado entre os hooks
 * de Posicionamento (evita 9× fetchAllPages do mesmo cadastro).
 * Falha não propaga: retorna maps vazios (rótulos caem em mesa_identificacao).
 */
export async function fetchMesasSpinMetadadosCached(): Promise<MetadadosMesaSpinMaps> {
  try {
    return await queryClient.fetchQuery({
      queryKey: MESAS_SPIN_METADADOS_QUERY_KEY,
      queryFn: fetchMesasSpinMetadadosMaps,
      staleTime: MESAS_SPIN_METADADOS_STALE_MS,
    });
  } catch (err) {
    console.error("[mesasSpinMetadadosQuery]", err);
    return METADADOS_MESAS_SPIN_VAZIO;
  }
}
