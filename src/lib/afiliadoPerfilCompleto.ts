import type { InfluencerPerfilCadastro } from "./influencerPerfilCompleto";

/** Regra de perfil completo para afiliados (sem cachê/hora; alinhado ao cadastro da página Afiliados). */
export function isAfiliadoPerfilIncompleto(
  perfil: InfluencerPerfilCadastro | null,
  nomeExibicao: string,
  email?: string | null,
): boolean {
  if (!perfil) return true;
  if (!nomeExibicao?.trim()) return true;
  if (!(email ?? "").trim()) return true;
  if (!(perfil.nome_completo ?? "").trim()) return true;
  if (!(perfil.telefone ?? "").trim()) return true;
  if (!(perfil.cpf ?? "").trim()) return true;
  if (!(perfil.chave_pix ?? "").trim()) return true;
  if (!(perfil.banco ?? "").trim()) return true;
  if (!(perfil.agencia ?? "").trim()) return true;
  if (!(perfil.conta ?? "").trim()) return true;
  return false;
}
