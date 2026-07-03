import type { SupabaseClient } from "@supabase/supabase-js";

export type PresencaAprovacaoMes = {
  aprovadoEm: string;
  aprovadoPorNome: string;
};

function refMesPrimeiroDiaIso(refMes: Date | string): string {
  if (typeof refMes === "string") return refMes.slice(0, 7) + "-01";
  const y = refMes.getFullYear();
  const m = String(refMes.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function carregarAprovacaoPresencaMes(
  supabase: SupabaseClient,
  funcionarioId: string,
  refMes: Date | string,
): Promise<{ aprovacao: PresencaAprovacaoMes | null; error: boolean }> {
  const { data, error } = await supabase.rpc("rh_calendario_presenca_aprovacao_mes_obter", {
    p_funcionario_id: funcionarioId,
    p_ref_mes: refMesPrimeiroDiaIso(refMes),
  });
  if (error) return { aprovacao: null, error: true };
  const row = (data ?? [])[0] as
    | { aprovado_em: string; aprovado_por_nome: string }
    | undefined;
  if (!row?.aprovado_em) return { aprovacao: null, error: false };
  return {
    aprovacao: {
      aprovadoEm: row.aprovado_em,
      aprovadoPorNome: row.aprovado_por_nome,
    },
    error: false,
  };
}

export async function salvarAprovacaoPresencaMes(
  supabase: SupabaseClient,
  funcionarioId: string,
  refMes: Date | string,
  aprovadoPorNome: string,
): Promise<{ aprovacao: PresencaAprovacaoMes | null; ok: boolean }> {
  const { data, error } = await supabase.rpc("rh_calendario_presenca_aprovacao_mes_salvar", {
    p_funcionario_id: funcionarioId,
    p_ref_mes: refMesPrimeiroDiaIso(refMes),
    p_aprovado_por_nome: aprovadoPorNome,
  });
  if (error) return { aprovacao: null, ok: false };
  const row = (data ?? [])[0] as
    | { aprovado_em: string; aprovado_por_nome: string }
    | undefined;
  if (!row?.aprovado_em) return { aprovacao: null, ok: false };
  return {
    ok: true,
    aprovacao: {
      aprovadoEm: row.aprovado_em,
      aprovadoPorNome: row.aprovado_por_nome,
    },
  };
}
