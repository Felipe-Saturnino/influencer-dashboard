/** Labels e tipos do histórico de acesso (Gestão de Usuários → Histórico). */

export const PROFILES_HISTORICO_TIPOS = [
  "ativacao",
  "desativacao",
  "reset_senha",
  "alteracao_nome",
  "alteracao_perfil",
  "alteracao_escopo",
] as const;

export type ProfilesHistoricoTipo = (typeof PROFILES_HISTORICO_TIPOS)[number];

export const PROFILES_HISTORICO_ORIGENS = [
  "manual",
  "automacao_inatividade",
  "automacao_convite",
  "destrato",
  "contrato_ativado",
  "ativacao_influencer_afiliado",
  "usuario",
] as const;

export type ProfilesHistoricoOrigem = (typeof PROFILES_HISTORICO_ORIGENS)[number];

export type ProfilesHistoricoRow = {
  id: string;
  profile_id: string;
  tipo: ProfilesHistoricoTipo;
  origem: ProfilesHistoricoOrigem;
  realizado_por: string | null;
  resumo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  autor_nome?: string | null;
};

export function fmtDataHoraHistoricoUsuario(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/** Realizado por — bloco Ativação. */
export function labelRealizadoPorAtivacao(
  origem: string | null | undefined,
  nomeAutor: string | null | undefined,
): string {
  if (origem === "ativacao_influencer_afiliado") return "Ativação de Influencer/Afiliado";
  if (origem === "contrato_ativado") return "Contrato Ativado";
  const nome = nomeAutor?.trim();
  return nome || "—";
}

/** Realizado por — bloco Desativação. */
export function labelRealizadoPorDesativacao(
  origem: string | null | undefined,
  nomeAutor: string | null | undefined,
): string {
  if (origem === "automacao_inatividade") return "Automação de Inatividade";
  if (origem === "automacao_convite") return "Automação de Convite";
  if (origem === "destrato") return "Destrato";
  const nome = nomeAutor?.trim();
  return nome || "—";
}

/** Realizado por — bloco Reset de Senha. */
export function labelRealizadoPorResetSenha(
  origem: string | null | undefined,
  nomeAutor: string | null | undefined,
): string {
  if (origem === "usuario") return "Realizado pelo Usuário";
  const nome = nomeAutor?.trim();
  return nome || "—";
}

export function tituloAlteracaoHistorico(tipo: ProfilesHistoricoTipo): string {
  switch (tipo) {
    case "alteracao_nome":
      return "Nome";
    case "alteracao_perfil":
      return "Perfil";
    case "alteracao_escopo":
      return "Escopo";
    default:
      return "Alteração";
  }
}

export function textoCardAlteracao(row: ProfilesHistoricoRow): string {
  if (row.resumo?.trim()) return row.resumo.trim();
  const ant = row.valor_anterior?.trim() || "—";
  const novo = row.valor_novo?.trim() || "—";
  return `${ant} → ${novo}`;
}

export function origemAtivacaoPorRole(role: string): ProfilesHistoricoOrigem {
  if (role === "influencer" || role === "afiliado") return "ativacao_influencer_afiliado";
  return "manual";
}
