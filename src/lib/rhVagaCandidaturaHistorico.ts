import type { SupabaseClient } from "@supabase/supabase-js";
import { labelEtapaCandidatura } from "./rhVagasFormat";
import type { RhVagaCandidaturaEtapa } from "../types/rhVagaCandidatura";

export type RhVagaCandidaturaHistoricoTipo = "etapa" | "anotacao" | "anexo" | "campos_etapa";

export type RhVagaCandidaturaHistoricoRow = {
  id: string;
  candidatura_id: string;
  tipo: RhVagaCandidaturaHistoricoTipo;
  resumo: string;
  detalhes: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  autor?: { name: string | null } | null;
};

export async function inserirHistoricoCandidatura(
  supabase: SupabaseClient,
  params: {
    candidaturaId: string;
    tipo: RhVagaCandidaturaHistoricoTipo;
    resumo: string;
    detalhes?: Record<string, unknown>;
    createdBy: string;
  },
): Promise<string | null> {
  const { error } = await supabase.from("rh_vaga_candidatura_historico").insert({
    candidatura_id: params.candidaturaId,
    tipo: params.tipo,
    resumo: params.resumo,
    detalhes: params.detalhes ?? {},
    created_by: params.createdBy,
  });
  return error?.message ?? null;
}

export function resumoMudancaEtapa(de: RhVagaCandidaturaEtapa, para: RhVagaCandidaturaEtapa): string {
  return `Etapa alterada de «${labelEtapaCandidatura(de)}» para «${labelEtapaCandidatura(para)}».`;
}
