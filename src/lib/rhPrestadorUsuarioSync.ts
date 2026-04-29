import type { PrestadorTipoSlug } from "../types";
import type { RhAreaAtuacao } from "../types/rhFuncionario";
import { callSupabaseEdgeFunction } from "./supabaseEdgeFetch";

/** Mesma normalização de nome de time usada em rhGamePresenterDealerSync (Game Presenter). */
export function normRhOrgTimeNomeParaUsuarioSync(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Mapeia Área de atuação + nome do time (organograma) → slug de `user_scopes` (prestador_tipo),
 * alinhado à Gestão de Usuários / PRESTADOR_TIPOS.
 */
export function prestadorTipoSlugDeAreaETimeRh(
  area: RhAreaAtuacao | "" | null | undefined,
  nomeTimeOrganograma: string | null | undefined,
): PrestadorTipoSlug {
  const a = String(area ?? "").trim().toLowerCase();
  if (a !== "estudio") return "escritorio";
  const t = normRhOrgTimeNomeParaUsuarioSync(nomeTimeOrganograma);
  if (t === "game presenter") return "game_presenter";
  if (t === "shuffler") return "shuffler";
  if (t === "customer service") return "customer_service";
  return "escritorio";
}

/**
 * Chama a Edge Function após criar/atualizar prestador com E-mail Spin.
 * Falhas não interrompem o fluxo de salvamento do RH (logar no console).
 */
export async function syncUsuarioPrestadorAposSalvarRh(rhFuncionarioId: string): Promise<void> {
  const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
  await callSupabaseEdgeFunction("sync-rh-prestador-auth-user", { rhFuncionarioId, loginUrl });
}
