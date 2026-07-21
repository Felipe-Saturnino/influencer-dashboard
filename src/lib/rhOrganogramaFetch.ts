import { supabase } from "./supabase";
import { buildGruposOrganogramaPrestador, flattenTimesAtivosParaSelect, montarArvoreOrganograma } from "./rhOrganogramaTree";
import type {
  RhOrgDiretoria,
  RhOrgDiretoriaComFilhos,
  RhOrgGerencia,
  RhOrgOrganogramaGrupoPrestador,
  RhOrgTime,
  RhOrgTimeOpcao,
} from "../types/rhOrganograma";

/** Colunas mínimas para montar árvore / opções de vínculo (filtros, Headcount, cadastros). */
const ORG_DIRETORIA_SELECT =
  "id, nome, diretor_funcionario_id, diretor_nome_livre, status, centro_custos, sobre_diretoria, diretor_foto_url, created_at, updated_at";
const ORG_GERENCIA_SELECT =
  "id, diretoria_id, nome, gerente_funcionario_id, gerente_nome_livre, status, centro_custos, sobre_gerencia, created_at, updated_at";
const ORG_TIME_SELECT =
  "id, gerencia_id, nome, lider_funcionario_id, lider_nome_livre, status, centro_custos, created_at, updated_at";

export async function carregarArvoreOrganograma(): Promise<{
  arvore: RhOrgDiretoriaComFilhos[];
  nomePorFuncionarioId: Map<string, string>;
  error: string | null;
}> {
  const [dr, gr, tr, fr] = await Promise.all([
    supabase.from("rh_org_diretorias").select(ORG_DIRETORIA_SELECT).order("nome"),
    supabase.from("rh_org_gerencias").select(ORG_GERENCIA_SELECT).order("nome"),
    supabase.from("rh_org_times").select(ORG_TIME_SELECT).order("nome"),
    supabase.from("rh_funcionarios").select("id, nome").in("status", ["ativo", "indisponivel"]).order("nome"),
  ]);
  const err = dr.error?.message ?? gr.error?.message ?? tr.error?.message ?? fr.error?.message ?? null;
  if (err) return { arvore: [], nomePorFuncionarioId: new Map(), error: err };
  const diretorias = (dr.data ?? []) as RhOrgDiretoria[];
  const gerencias = (gr.data ?? []) as RhOrgGerencia[];
  const times = (tr.data ?? []) as RhOrgTime[];
  const mapNome = new Map<string, string>();
  (fr.data ?? []).forEach((r: { id: string; nome: string }) => mapNome.set(r.id, r.nome));
  const arvore = montarArvoreOrganograma(diretorias, gerencias, times);
  return { arvore, nomePorFuncionarioId: mapNome, error: null };
}

export async function carregarOpcoesTimesOrganograma(): Promise<{
  opcoes: RhOrgTimeOpcao[];
  grupos: RhOrgOrganogramaGrupoPrestador[];
  error: string | null;
}> {
  const [dr, gr, tr, fr] = await Promise.all([
    supabase.from("rh_org_diretorias").select(ORG_DIRETORIA_SELECT).order("nome"),
    supabase.from("rh_org_gerencias").select(ORG_GERENCIA_SELECT).order("nome"),
    supabase.from("rh_org_times").select(ORG_TIME_SELECT).order("nome"),
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
