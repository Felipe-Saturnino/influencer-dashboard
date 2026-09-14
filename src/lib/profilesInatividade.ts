/** Dias sem login após já ter acessado pelo menos uma vez. */
export const DIAS_SEM_LOGIN_DESATIVAR = 60;

/** Dias após o convite/âncora sem nenhum acesso (last_sign_in_at nulo). */
export const DIAS_CONVITE_SEM_ACESSO_DESATIVAR = 30;

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Decide se um perfil ativo deve ser desativado por inatividade.
 * Espelha `profiles_desativar_inativos` (SQL).
 *
 * - Sem login: âncora (`acesso_referencia_em`) ≥ 30 dias.
 * - Com login: GREATEST(último login, âncora) ≥ 60 dias.
 * Reativar na plataforma redefine `acesso_referencia_em` → zera o relógio.
 */
export function deveDesativarPorInatividade(opts: {
  ativo: boolean;
  lastSignInAt: string | Date | null | undefined;
  acessoReferenciaEm: string | Date;
  agora?: Date;
}): boolean {
  if (!opts.ativo) return false;

  const agora = opts.agora ?? new Date();
  const refMs = toMs(opts.acessoReferenciaEm);
  if (refMs == null) return false;

  const lastMs = opts.lastSignInAt != null && opts.lastSignInAt !== "" ? toMs(opts.lastSignInAt) : null;

  if (lastMs == null) {
    return agora.getTime() - refMs >= DIAS_CONVITE_SEM_ACESSO_DESATIVAR * MS_DIA;
  }

  const ancoraMs = Math.max(lastMs, refMs);
  return agora.getTime() - ancoraMs >= DIAS_SEM_LOGIN_DESATIVAR * MS_DIA;
}

function toMs(v: string | Date): number | null {
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}
