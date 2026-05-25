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

/** Conta na plataforma (`profiles.ativo`); `null`/`undefined` tratados como ativo (legado). */
export function influencerExisteNaPlataforma(profileAtivo?: boolean | null): boolean {
  return profileAtivo !== false;
}

/** Cadastro em `influencer_perfil` e status operacional não encerrado (regra Playbook). */
export function influencerElegivelAuditoriaPerfil(perfil: { status?: string | null } | null): boolean {
  if (!perfil) return false;
  const s = (perfil.status ?? "ativo").toLowerCase();
  return s !== "inativo" && s !== "cancelado";
}

/** Quadro “Perfil incompleto”: existe na plataforma, tem `influencer_perfil` e status operacional ativo. */
export function influencerElegivelQuadroPerfilIncompleto(
  perfil: { status?: string | null } | null,
  profileAtivo?: boolean | null,
): boolean {
  if (!influencerExisteNaPlataforma(profileAtivo)) return false;
  if (!perfil) return false;
  const s = (perfil.status ?? "ativo").toLowerCase();
  return s === "ativo";
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
