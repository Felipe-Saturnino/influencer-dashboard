/** Campos usados na regra de “perfil incompleto” (cadastro Influencers). */
export interface InfluencerPerfilCadastro {
  nome_completo?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cache_hora?: number | null;
  chave_pix?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
}

export function isPerfilIncompleto(
  perfil: InfluencerPerfilCadastro | null,
  name: string
): boolean {
  if (!perfil) return true;
  if (!name?.trim()) return true;
  if (!(perfil.nome_completo ?? "").trim()) return true;
  if (!(perfil.telefone ?? "").trim()) return true;
  if (!(perfil.cpf ?? "").trim()) return true;
  if (!perfil.cache_hora || perfil.cache_hora <= 0) return true;
  if (!(perfil.chave_pix ?? "").trim()) return true;
  if (!(perfil.banco ?? "").trim()) return true;
  if (!(perfil.agencia ?? "").trim()) return true;
  if (!(perfil.conta ?? "").trim()) return true;
  return false;
}
