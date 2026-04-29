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

/** Corpo JSON típico da Edge `sync-rh-prestador-auth-user`. */
export type SyncRhPrestadorAuthUserResponse = {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  created?: boolean;
  userId?: string;
  error?: string;
};

/**
 * Mensagem para o operador quando a Edge devolve 200 mas não criou usuário por regra de negócio.
 */
export function mensagemFeedbackSyncPrestador(res: SyncRhPrestadorAuthUserResponse | null | undefined): string | null {
  if (!res || typeof res !== "object") return null;
  if (!res.skipped) return null;
  if (res.reason === "usuario_email_ja_existe" || res.reason === "usuario_email_ja_existe_auth") {
    return "Prestador salvo, mas não foi criado novo usuário na plataforma: já existe conta com este E-mail Spin. Ajuste em Gestão de Usuários, se necessário.";
  }
  return null;
}

/**
 * Chama a Edge Function após criar/atualizar prestador com E-mail Spin.
 * Erros HTTP/rede propagam para o chamador tratar feedback; `skipped` + `reason` vêm em 200.
 */
export async function syncUsuarioPrestadorAposSalvarRh(
  rhFuncionarioId: string,
): Promise<SyncRhPrestadorAuthUserResponse> {
  const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
  return await callSupabaseEdgeFunction<SyncRhPrestadorAuthUserResponse>("sync-rh-prestador-auth-user", {
    rhFuncionarioId,
    loginUrl,
  });
}
