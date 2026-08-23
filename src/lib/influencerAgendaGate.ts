import { supabase } from "./supabase";
import { isPerfilIncompleto, type InfluencerPerfilCadastro } from "./influencerPerfilCompleto";
import { PLAYBOOK_ITENS_OBRIGATORIOS } from "../constants/playbookGuia";

export interface AgendaLiveGateCheck {
  perfilIncompleto: boolean;
  faltaPlaybook: boolean;
  /** Consulta falhou — bloqueio conservador até nova verificação. */
  erroVerificacao: boolean;
}

/**
 * Regras alinhadas ao quadro de incompletos (Influencers) e à Home do influencer:
 * perfil incompleto só exige cadastro quando status = ativo; Playbook exige os três itens obrigatórios.
 */
export async function verificarElegibilidadeAgendaLive(influencerId: string): Promise<AgendaLiveGateCheck> {
  if (!influencerId.trim()) {
    return { perfilIncompleto: true, faltaPlaybook: true, erroVerificacao: false };
  }

  const [perfilRes, profileRes, confRes] = await Promise.all([
    supabase
      .from("influencer_perfil")
      .select(
        "nome_completo, telefone, cpf, cache_hora, chave_pix, banco, agencia, conta, status, nome_artistico"
      )
      .eq("id", influencerId)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", influencerId).maybeSingle(),
    supabase.from("guia_confirmacoes").select("item_key").eq("influencer_id", influencerId),
  ]);

  if (perfilRes.error || profileRes.error || confRes.error) {
    console.error("verificarElegibilidadeAgendaLive:", {
      perfil: perfilRes.error,
      profile: profileRes.error,
      conf: confRes.error,
    });
    return { perfilIncompleto: false, faltaPlaybook: false, erroVerificacao: true };
  }

  const perfil = perfilRes.data as InfluencerPerfilCadastro & {
    status?: string | null;
    nome_artistico?: string | null;
  } | null;

  const status = (perfil?.status ?? "ativo") as string;
  const nomeParaRegra = (perfil?.nome_artistico ?? profileRes.data?.name ?? "").trim();

  const perfilIncompleto = status === "ativo" && isPerfilIncompleto(perfil ?? null, nomeParaRegra);

  const keysOk = new Set((confRes.data ?? []).map((r: { item_key: string }) => r.item_key));
  const faltaPlaybook = PLAYBOOK_ITENS_OBRIGATORIOS.some((k) => !keysOk.has(k));

  return { perfilIncompleto, faltaPlaybook, erroVerificacao: false };
}
