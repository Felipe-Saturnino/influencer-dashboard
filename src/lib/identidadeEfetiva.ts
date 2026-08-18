/**
 * Identidade da sessão **visível** (Simulador de Login vs conta real).
 *
 * O JWT / `auth.uid()` continua da conta viewer (ex.: admin). Páginas que resolvem
 * «eu» (cadastro RH, Minhas Fotos, recibos, Ver = Próprios) devem usar e-mail/id/nome
 * daqui — nunca só `user.email` / `user.id` da conta real.
 */
export type IdentidadeEfetivaInput = {
  user: { id: string; name: string; email: string; role?: string | null } | null | undefined;
  dadosUsuarioEfetivo: { id: string; name: string; email: string } | null | undefined;
  effectiveRole?: string | null;
};

export type IdentidadeEfetivaResolvida = {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
};

export function resolverIdentidadeEfetiva(input: IdentidadeEfetivaInput): IdentidadeEfetivaResolvida {
  const email = (input.dadosUsuarioEfetivo?.email || input.user?.email || "").trim() || null;
  const userId = input.dadosUsuarioEfetivo?.id || input.user?.id || null;
  const name = (input.dadosUsuarioEfetivo?.name || input.user?.name || "").trim() || null;
  const role = (input.effectiveRole || input.user?.role || null) as string | null;
  return { userId, email, name, role };
}
