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
 * Mapeia Área de atuação + nome do time (organograma) → slug de `user_scopes` (prestador_tipo).
 * A criação automática de usuário a partir da Gestão de Prestadores usa a Edge `sync-rh-prestador-auth-user`
 * (gerências, times, `area_atuacao` escritório/estúdio) — fonte de verdade lá.
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
  /** Presente em algumas respostas de erro (corpo JSON). */
  error?: string;
};

/**
 * Mensagem para o operador quando a Edge devolve 200 mas não criou usuário por regra de negócio.
 */
export function mensagemFeedbackSyncPrestador(res: SyncRhPrestadorAuthUserResponse | null | undefined): string | null {
  if (!res || typeof res !== "object") return null;
  if (typeof res.error === "string" && res.error.trim()) {
    return `Sincronização com Gestão de Usuários: ${res.error.trim()}`;
  }
  if (res.created === true) return null;
  if (!res.skipped) return null;
  if (res.reason === "usuario_email_ja_existe" || res.reason === "usuario_email_ja_existe_auth") {
    return "Prestador salvo, mas não foi criado novo usuário na plataforma: já existe conta com o e-mail usado para login (E-mail Spin ou e-mail pessoal). Ajuste em Gestão de Usuários, se necessário.";
  }
  if (res.reason === "sem_email" || res.reason === "sem_email_spin") {
    return "Prestador salvo, mas não há e-mail válido para criar o login (preencha E-mail Spin ou e-mail pessoal no cadastro e guarde de novo).";
  }
  return `Prestador salvo, mas o utilizador não foi criado automaticamente (${String(res.reason ?? "motivo não indicado")}).`;
}

/**
 * Chama a Edge Function após gravar prestador.
 * Login na plataforma: E-mail Spin se preenchido; senão e-mail pessoal. Envie os dois no body quando possível (reforço pós-save).
 */
export async function syncUsuarioPrestadorAposSalvarRh(
  rhFuncionarioId: string,
  opts?: { emailSpin?: string | null; emailPessoal?: string | null },
): Promise<SyncRhPrestadorAuthUserResponse> {
  const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
  const emailSpin = opts?.emailSpin?.trim();
  const emailPessoal = opts?.emailPessoal?.trim();
  return await callSupabaseEdgeFunction<SyncRhPrestadorAuthUserResponse>("sync-rh-prestador-auth-user", {
    rhFuncionarioId,
    loginUrl,
    ...(emailSpin ? { emailSpin } : {}),
    ...(emailPessoal ? { emailPessoal } : {}),
  });
}
