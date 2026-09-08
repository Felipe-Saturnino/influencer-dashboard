import { supabase } from "./supabase";
import { getCurrentUserNome } from "./escalaControleTurno";
import type { RhSolicitacaoFeedbackRecomendacao } from "../types/rhSolicitacao";

export async function registrarFeedbackSolicitacoes(params: {
  prestadorId: string;
  recomendacao: RhSolicitacaoFeedbackRecomendacao;
  observacao: string;
  liderancaNome?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let nomeLideranca = getCurrentUserNome(params.liderancaNome);
  if (nomeLideranca === "—" && user?.id) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    nomeLideranca = getCurrentUserNome(profile?.name as string | null | undefined);
  }

  const { data, error } = await supabase
    .from("rh_solicitacoes")
    .insert({
      rh_funcionario_id: params.prestadorId,
      tipo: "feedback",
      status: "em_analise",
      descricao: params.observacao.trim(),
      feedback_recomendacao: params.recomendacao,
      feedback_origem: "solicitacoes",
      lideranca_nome: nomeLideranca === "—" ? "" : nomeLideranca,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[registrarFeedbackSolicitacoes]", error);
    return { ok: false };
  }
  return { ok: true, id: String(data.id) };
}
