import { supabase } from "./supabase";
import { buildGruposOrganogramaPrestador, flattenTimesAtivosParaSelect, montarArvoreOrganograma } from "./rhOrganogramaTree";
import type {
  RhOrgDiretoria,
  RhOrgGerencia,
  RhOrgOrganogramaGrupoPrestador,
  RhOrgTime,
  RhOrgTimeOpcao,
} from "../types/rhOrganograma";

export async function carregarOpcoesTimesOrganograma(): Promise<{
  opcoes: RhOrgTimeOpcao[];
  grupos: RhOrgOrganogramaGrupoPrestador[];
  error: string | null;
}> {
  const [dr, gr, tr, fr] = await Promise.all([
    supabase.from("rh_org_diretorias").select("*").order("nome"),
    supabase.from("rh_org_gerencias").select("*").order("nome"),
    supabase.from("rh_org_times").select("*").order("nome"),
    supabase.from("rh_funcionarios").select("id, nome").in("status", ["ativo", "indisponivel"]).order("nome"),
  ]);
  const err = dr.error?.message ?? gr.error?.message ?? tr.error?.message ?? fr.error?.message ?? null;
  if (err) return { opcoes: [], grupos: [], error: err };
  const diretorias = (dr.data ?? []) as RhOrgDiretoria[];
  const gerencias = (gr.data ?? []) as RhOrgGerencia[];
  const times = (tr.data ?? []) as RhOrgTime[];
  const mapNome = new Map<string, string>();
  (fr.data ?? []).forEach((r: { id: string; nome: string }) => mapNome.set(r.id, r.nome));
  const arvore = montarArvoreOrganograma(diretorias, gerencias, times);
  const grupos = buildGruposOrganogramaPrestador(arvore, mapNome);
  const opcoes = flattenTimesAtivosParaSelect(arvore, mapNome);
  return { opcoes, grupos, error: null };
}
