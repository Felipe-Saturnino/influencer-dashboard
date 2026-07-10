import type { PrestadorTipoSlug, Role } from "../types";
import type { RhAreaAtuacao } from "../types/rhFuncionario";
import { callSupabaseEdgeFunction } from "./supabaseEdgeFetch";

/** Espelha `normTimeNome` / `normRhOrgRotulo` da Edge `sync-rh-prestador-auth-user`. */
export function normRhOrgRotuloOrganograma(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function gerenciaOrganogramaIndicaTechOps(gerenciaNome: string | null | undefined): boolean {
  return normRhOrgRotuloOrganograma(gerenciaNome) === "tech ops";
}

export function gerenciaOrganogramaIndicaCustomerService(gerenciaNome: string | null | undefined): boolean {
  return normRhOrgRotuloOrganograma(gerenciaNome) === "customer service";
}

/** Time Game Presenter / Game Presenters (organograma). */
export function timeOrganogramaIndicaGamePresenter(timeNome: string | null | undefined): boolean {
  const t = normRhOrgRotuloOrganograma(timeNome);
  return t === "game presenter" || t === "game presenters";
}

/** Time Shuffler / Shufflers (organograma). */
export function timeOrganogramaIndicaShuffler(timeNome: string | null | undefined): boolean {
  const t = normRhOrgRotuloOrganograma(timeNome);
  return t === "shuffler" || t === "shufflers";
}

export type PerfilRhOrganogramaSync = Extract<
  Role,
  | "figurino"
  | "comunicacao"
  | "rh"
  | "performance_coach"
  | "shift_leader"
  | "service_manager"
  | "customer_service"
  | "game_presenter"
  | "shuffler"
  | "tech_ops"
  | "gestor"
  | "prestador"
>;

/**
 * Espelha `resolvePerfilEscopo` da Edge — perfil atribuído após salvar/revisar prestador.
 * `gerenciaNome` deve incluir a gerência pai quando o vínculo for por time (`rh_org_times.gerencia_id`).
 */
export function resolvePerfilRhDeOrganograma(
  gerenciaNome: string | null | undefined,
  timeNome: string | null | undefined,
  areaAtuacaoRh: RhAreaAtuacao | "" | null | undefined,
): {
  role: PerfilRhOrganogramaSync;
  prestadorTipo: PrestadorTipoSlug | null;
  gestorTipo: string | null;
} {
  const g = normRhOrgRotuloOrganograma(gerenciaNome);
  if (g === "figurino") return { role: "figurino", prestadorTipo: null, gestorTipo: null };
  if (g === "comunicacao") return { role: "comunicacao", prestadorTipo: null, gestorTipo: null };
  if (g === "rh" || g === "recursos humanos") return { role: "rh", prestadorTipo: null, gestorTipo: null };
  if (gerenciaOrganogramaIndicaTechOps(gerenciaNome)) {
    return { role: "tech_ops", prestadorTipo: null, gestorTipo: null };
  }
  if (gerenciaOrganogramaIndicaCustomerService(gerenciaNome)) {
    return { role: "customer_service", prestadorTipo: null, gestorTipo: null };
  }
  if (g === "facilities") return { role: "prestador", prestadorTipo: "facilities", gestorTipo: null };
  if (g === "financeiro") return { role: "prestador", prestadorTipo: "financeiro", gestorTipo: null };
  if (g === "ti") return { role: "prestador", prestadorTipo: "ti", gestorTipo: null };
  if (g === "treinamento") return { role: "gestor", prestadorTipo: null, gestorTipo: "treinamento" };

  const t = normRhOrgRotuloOrganograma(timeNome);
  if (t === "tech ops") return { role: "tech_ops", prestadorTipo: null, gestorTipo: null };
  if (t === "performance coach") return { role: "performance_coach", prestadorTipo: null, gestorTipo: null };
  if (t === "shift leader") return { role: "shift_leader", prestadorTipo: null, gestorTipo: null };
  if (t === "service manager") return { role: "service_manager", prestadorTipo: null, gestorTipo: null };
  if (t === "customer service") return { role: "customer_service", prestadorTipo: null, gestorTipo: null };
  if (timeOrganogramaIndicaGamePresenter(timeNome)) {
    return { role: "game_presenter", prestadorTipo: null, gestorTipo: null };
  }
  if (timeOrganogramaIndicaShuffler(timeNome)) {
    return { role: "shuffler", prestadorTipo: null, gestorTipo: null };
  }

  const a = normRhOrgRotuloOrganograma(areaAtuacaoRh);
  if (a === "escritorio") return { role: "prestador", prestadorTipo: "escritorio", gestorTipo: null };
  if (a === "estudio") return { role: "prestador", prestadorTipo: "estudio", gestorTipo: null };
  return { role: "prestador", prestadorTipo: "escritorio", gestorTipo: null };
}

/** Mesma normalização de nome de time usada em rhGamePresenterDealerSync (Game Presenter). */
export function normRhOrgTimeNomeParaUsuarioSync(nome: string | null | undefined): string {
  return normRhOrgRotuloOrganograma(nome);
}

/**
 * Mapeia Área de atuação + nome do time (organograma) → slug de `user_scopes` (prestador_tipo).
 * A criação automática de usuário a partir da Gestão de Prestadores usa a Edge `sync-rh-prestador-auth-user`
 * (gerências, times, `area_atuacao` escritório/estúdio) — fonte de verdade lá.
 */
export function prestadorTipoSlugDeAreaETimeRh(
  area: RhAreaAtuacao | "" | null | undefined,
  _nomeTimeOrganograma: string | null | undefined,
): PrestadorTipoSlug {
  const a = String(area ?? "").trim().toLowerCase();
  if (a !== "estudio") return "escritorio";
  return "escritorio";
}

/** Corpo JSON típico da Edge `sync-rh-prestador-auth-user`. */
export type SyncRhPrestadorAuthUserResponse = {
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  created?: boolean;
  /** Perfil/escopos atualizados conforme organograma (usuário já existia). */
  updated?: boolean;
  role?: string;
  roleChanged?: boolean;
  /** Usuário da plataforma desativado após encerramento do vínculo. */
  deactivated?: boolean;
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
  if (res.created === true || res.updated === true) return null;
  if (!res.skipped) return null;
  if (res.reason === "usuario_email_ja_existe_auth") {
    return "Prestador salvo, mas não foi possível sincronizar o login na plataforma: já existe conta Auth com o e-mail, sem perfil vinculado. Ajuste em Gestão de Usuários, se necessário.";
  }
  if (res.reason === "sem_email" || res.reason === "sem_email_spin") {
    return "Prestador salvo, mas não há e-mail válido para criar o login (preencha E-mail Spin ou e-mail pessoal no cadastro e salve de novo).";
  }
  if (res.reason === "prestador_encerrado" || res.reason === "prestador_encerrado_sem_usuario") {
    return null;
  }
  return `Prestador salvo, mas o usuário não foi criado automaticamente (${String(res.reason ?? "motivo não indicado")}).`;
}

/** Mensagem de sucesso quando o organograma alterou perfil/escopos de usuário existente. */
export function mensagemSucessoSyncPrestadorAtualizado(
  res: SyncRhPrestadorAuthUserResponse | null | undefined,
): string | null {
  if (!res?.updated) return null;
  if (res.roleChanged) {
    return "Perfil e permissões na plataforma atualizados conforme o organograma.";
  }
  return "Permissões na plataforma sincronizadas com o organograma.";
}

/** Mensagem de sucesso quando o encerramento desativou o login na plataforma. */
export function mensagemSucessoDesativacaoPrestadorEncerrado(
  res: SyncRhPrestadorAuthUserResponse | null | undefined,
): string | null {
  if (!res?.deactivated) return null;
  return "O acesso à plataforma do prestador foi desativado.";
}

/**
 * Chama a Edge Function após gravar prestador (Novo, Editar, Revisão de Contrato, Reativação).
 * Gerência ou time **Customer Service** → `customer_service`; time **Game Presenter(s)** → `game_presenter`; time **Shuffler(s)** → `shuffler`.
 * Gerência **Tech Ops** (vínculo direto ou time filho) → `profiles.role = tech_ops` via `resolvePerfilEscopo` na Edge.
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
