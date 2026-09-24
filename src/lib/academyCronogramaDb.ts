import { ACADEMY_CRONOGRAMA_BUCKET, ACADEMY_CRONOGRAMA_ERRO_CARGA } from "./academyCronogramaConstants";
import type {
  AcademyCatalogoStatus,
  AcademyCronograma,
  AcademyCronogramaCatalogo,
  AcademyCronogramaEntidade,
  AcademyCronogramaHistorico,
  AcademyCronogramaItem,
  AcademyMaterial,
  AcademyMaterialTipo,
  AcademyProvaQuestao,
  AcademyTrilha,
  AcademyTrilhaTipo,
} from "./academyCronogramaTypes";
import { fetchAllPages } from "./supabasePaginate";
import { supabase } from "./supabase";

const ERRO_GRAVAR = "Não foi possível gravar. Se o problema persistir, entre em contato com o suporte.";

function asQuestoes(value: unknown): AcademyProvaQuestao[] {
  if (!Array.isArray(value)) return [];
  const out: AcademyProvaQuestao[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { t?: unknown; opts?: unknown; ok?: unknown };
    const opts = Array.isArray(row.opts) ? row.opts.map((o) => String(o ?? "")) : ["", "", "", ""];
    const filled: [string, string, string, string] = [
      opts[0] ?? "",
      opts[1] ?? "",
      opts[2] ?? "",
      opts[3] ?? "",
    ];
    const ok = row.ok === 1 || row.ok === 2 || row.ok === 3 ? row.ok : 0;
    out.push({ t: String(row.t ?? ""), opts: filled, ok });
  }
  return out;
}

async function nomesPorId(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from("profiles").select("id, name").in("id", unique);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const id = String((row as { id: string }).id);
    const name = String((row as { name?: string | null }).name ?? "").trim();
    if (id) map.set(id, name || "—");
  }
  return map;
}

export async function fetchAcademyCronogramaCatalogo(): Promise<AcademyCronogramaCatalogo> {
  try {
    const [cronogramas, trilhas, itens, materiais, provas, trilhaMateriais, trilhaProvas] = await Promise.all([
      fetchAllPages<AcademyCronograma>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma")
          .select("id, nome, descricao, duracao_dias, status, created_by, created_at, updated_at")
          .order("nome", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: res.data as AcademyCronograma[] | null, error: res.error };
      }),
      fetchAllPages<AcademyTrilha>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_trilha")
          .select("id, nome, tipo, jogo, descricao, status, created_by, created_at, updated_at")
          .order("nome", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: res.data as AcademyTrilha[] | null, error: res.error };
      }),
      fetchAllPages<AcademyCronogramaItem>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_item")
          .select("id, cronograma_id, trilha_id, ordem")
          .order("ordem", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: res.data as AcademyCronogramaItem[] | null, error: res.error };
      }),
      fetchAllPages<AcademyMaterial>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_material")
          .select(
            "id, titulo, tipo, introducao, status, arquivo_storage_path, arquivo_nome, versao, created_by, created_at, updated_at",
          )
          .order("titulo", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: res.data as AcademyMaterial[] | null, error: res.error };
      }),
      fetchAllPages<{
        id: string;
        nome: string;
        nota_minima: number;
        status: AcademyCatalogoStatus;
        questoes: unknown;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_prova")
          .select("id, nome, nota_minima, status, questoes, created_by, created_at, updated_at")
          .order("nome", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: res.data, error: res.error };
      }),
      fetchAllPages<{ trilha_id: string; material_id: string }>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_trilha_material")
          .select("trilha_id, material_id")
          .order("trilha_id", { ascending: true })
          .order("material_id", { ascending: true })
          .range(from, to);
        return { data: res.data, error: res.error };
      }),
      fetchAllPages<{ trilha_id: string; prova_id: string }>(async (from, to) => {
        const res = await supabase
          .from("academy_cronograma_trilha_prova")
          .select("trilha_id, prova_id")
          .order("trilha_id", { ascending: true })
          .order("prova_id", { ascending: true })
          .range(from, to);
        return { data: res.data, error: res.error };
      }),
    ]);

    return {
      cronogramas,
      trilhas,
      itens,
      materiais,
      provas: provas.map((p) => ({ ...p, questoes: asQuestoes(p.questoes) })),
      trilhaMateriais,
      trilhaProvas,
    };
  } catch (e) {
    console.error("[fetchAcademyCronogramaCatalogo]", e);
    throw new Error(ACADEMY_CRONOGRAMA_ERRO_CARGA);
  }
}

export async function fetchAcademyCronogramaHistorico(
  entidadeTipo: AcademyCronogramaEntidade,
  entidadeId: string,
): Promise<AcademyCronogramaHistorico[]> {
  const rows = await fetchAllPages<{
    id: string;
    entidade_tipo: AcademyCronogramaEntidade;
    entidade_id: string;
    acao: string;
    created_by: string | null;
    created_at: string;
  }>(async (from, to) => {
    const res = await supabase
      .from("academy_cronograma_historico")
      .select("id, entidade_tipo, entidade_id, acao, created_by, created_at")
      .eq("entidade_tipo", entidadeTipo)
      .eq("entidade_id", entidadeId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    return { data: res.data, error: res.error };
  });
  const nomes = await nomesPorId(rows.map((r) => r.created_by ?? ""));
  return rows.map((r) => ({
    ...r,
    autor_nome: r.created_by ? (nomes.get(r.created_by) ?? "—") : "—",
  }));
}

async function registrarHistorico(
  entidadeTipo: AcademyCronogramaEntidade,
  entidadeId: string,
  acao: string,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("academy_cronograma_historico").insert({
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    acao,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function salvarCronograma(input: {
  id?: string;
  nome: string;
  descricao: string;
  duracaoDias: number;
  userId: string | null;
}): Promise<string> {
  const payload = {
    nome: input.nome.trim(),
    descricao: input.descricao.trim() || null,
    duracao_dias: input.duracaoDias,
  };
  if (input.id) {
    const { error } = await supabase.from("academy_cronograma").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message || ERRO_GRAVAR);
    await registrarHistorico("cronograma", input.id, "Cronograma atualizado", input.userId);
    return input.id;
  }
  const { data, error } = await supabase
    .from("academy_cronograma")
    .insert({ ...payload, created_by: input.userId, status: "publicado" })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(error?.message || ERRO_GRAVAR);
  await registrarHistorico("cronograma", data.id, "Cronograma criado", input.userId);
  return data.id as string;
}

export async function definirStatusCronograma(
  id: string,
  status: AcademyCatalogoStatus,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("academy_cronograma").update({ status }).eq("id", id);
  if (error) throw new Error(error.message || ERRO_GRAVAR);
  await registrarHistorico(
    "cronograma",
    id,
    status === "arquivado" ? "Cronograma arquivado" : "Cronograma publicado",
    userId,
  );
}

async function reindexItens(cronogramaId: string, trilhaIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from("academy_cronograma_item").delete().eq("cronograma_id", cronogramaId);
  if (delError) throw new Error(delError.message || ERRO_GRAVAR);
  if (trilhaIds.length === 0) return;
  const { error } = await supabase.from("academy_cronograma_item").insert(
    trilhaIds.map((trilha_id, i) => ({
      cronograma_id: cronogramaId,
      trilha_id,
      ordem: i + 1,
    })),
  );
  if (error) throw new Error(error.message || ERRO_GRAVAR);
}

export async function adicionarTrilhaAoCronograma(
  cronogramaId: string,
  trilhaId: string,
  ordemAtual: string[],
  userId: string | null,
): Promise<void> {
  if (ordemAtual.includes(trilhaId)) return;
  await reindexItens(cronogramaId, [...ordemAtual, trilhaId]);
  await registrarHistorico("cronograma", cronogramaId, "Trilha adicionada ao cronograma", userId);
}

export async function removerTrilhaDoCronograma(
  cronogramaId: string,
  trilhaId: string,
  ordemAtual: string[],
  userId: string | null,
): Promise<void> {
  await reindexItens(
    cronogramaId,
    ordemAtual.filter((id) => id !== trilhaId),
  );
  await registrarHistorico("cronograma", cronogramaId, "Trilha removida do cronograma", userId);
}

export async function reordenarTrilhasCronograma(
  cronogramaId: string,
  ordem: string[],
  userId: string | null,
): Promise<void> {
  await reindexItens(cronogramaId, ordem);
  await registrarHistorico("cronograma", cronogramaId, "Ordem das trilhas atualizada", userId);
}

export async function salvarTrilha(input: {
  id?: string;
  nome: string;
  tipo: AcademyTrilhaTipo;
  jogo: string | null;
  descricao: string;
  materialIds: string[];
  userId: string | null;
}): Promise<string> {
  const payload = {
    nome: input.nome.trim(),
    tipo: input.tipo,
    jogo: input.tipo === "jogo" ? (input.jogo ?? "").trim() || null : null,
    descricao: input.descricao.trim(),
  };
  let id = input.id;
  if (id) {
    const { error } = await supabase.from("academy_cronograma_trilha").update(payload).eq("id", id);
    if (error) throw new Error(error.message || ERRO_GRAVAR);
    await registrarHistorico("trilha", id, "Trilha atualizada", input.userId);
  } else {
    const { data, error } = await supabase
      .from("academy_cronograma_trilha")
      .insert({ ...payload, created_by: input.userId, status: "publicado" })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || ERRO_GRAVAR);
    id = data.id as string;
    await registrarHistorico("trilha", id, "Trilha criada", input.userId);
  }
  const { error: delError } = await supabase.from("academy_cronograma_trilha_material").delete().eq("trilha_id", id);
  if (delError) throw new Error(delError.message || ERRO_GRAVAR);
  if (input.materialIds.length > 0) {
    const { error } = await supabase.from("academy_cronograma_trilha_material").insert(
      input.materialIds.map((material_id) => ({ trilha_id: id, material_id })),
    );
    if (error) throw new Error(error.message || ERRO_GRAVAR);
  }
  return id;
}

export async function definirStatusTrilha(
  id: string,
  status: AcademyCatalogoStatus,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("academy_cronograma_trilha").update({ status }).eq("id", id);
  if (error) throw new Error(error.message || ERRO_GRAVAR);
  await registrarHistorico("trilha", id, status === "arquivado" ? "Trilha arquivada" : "Trilha publicada", userId);
}

function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "arquivo";
}

export async function uploadMaterialCronograma(materialId: string, file: File): Promise<{ path: string; nome: string }> {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `materiais/${materialId}/${crypto.randomUUID()}-${nomeArquivoSeguro(file.name)}${ext}`;
  const { error } = await supabase.storage.from(ACADEMY_CRONOGRAMA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message || "Não foi possível enviar o arquivo.");
  return { path, nome: file.name };
}

export async function urlAssinadaMaterialCronograma(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(ACADEMY_CRONOGRAMA_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function proximaVersaoMaterial(atual: string | null | undefined): string {
  const n = Number.parseInt((atual ?? "1.0").split(".")[0] ?? "1", 10);
  return `${Number.isFinite(n) ? n + 1 : 2}.0`;
}

export async function salvarMaterial(input: {
  id?: string;
  titulo: string;
  tipo: AcademyMaterialTipo;
  introducao: string;
  trilhaIds: string[];
  file: File | null;
  versaoAtual?: string;
  userId: string | null;
}): Promise<string> {
  const payload = {
    titulo: input.titulo.trim(),
    tipo: input.tipo,
    introducao: input.introducao.trim(),
  };
  let id = input.id;
  if (id) {
    const next: Record<string, unknown> = { ...payload };
    if (input.file) {
      const uploaded = await uploadMaterialCronograma(id, input.file);
      next.arquivo_storage_path = uploaded.path;
      next.arquivo_nome = uploaded.nome;
      next.versao = proximaVersaoMaterial(input.versaoAtual);
    }
    const { error } = await supabase.from("academy_cronograma_material").update(next).eq("id", id);
    if (error) throw new Error(error.message || ERRO_GRAVAR);
    await registrarHistorico(
      "material",
      id,
      input.file ? "Arquivo substituído" : "Material atualizado",
      input.userId,
    );
  } else {
    const { data, error } = await supabase
      .from("academy_cronograma_material")
      .insert({ ...payload, created_by: input.userId, status: "publicado", versao: "1.0" })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || ERRO_GRAVAR);
    id = data.id as string;
    if (input.file) {
      const uploaded = await uploadMaterialCronograma(id, input.file);
      const { error: upError } = await supabase
        .from("academy_cronograma_material")
        .update({ arquivo_storage_path: uploaded.path, arquivo_nome: uploaded.nome })
        .eq("id", id);
      if (upError) throw new Error(upError.message || ERRO_GRAVAR);
    }
    await registrarHistorico("material", id, "Material criado", input.userId);
  }
  const { error: delError } = await supabase.from("academy_cronograma_trilha_material").delete().eq("material_id", id);
  if (delError) throw new Error(delError.message || ERRO_GRAVAR);
  if (input.trilhaIds.length > 0) {
    const { error } = await supabase.from("academy_cronograma_trilha_material").insert(
      input.trilhaIds.map((trilha_id) => ({ trilha_id, material_id: id })),
    );
    if (error) throw new Error(error.message || ERRO_GRAVAR);
  }
  return id;
}

export async function definirStatusMaterial(
  id: string,
  status: AcademyCatalogoStatus,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("academy_cronograma_material").update({ status }).eq("id", id);
  if (error) throw new Error(error.message || ERRO_GRAVAR);
  await registrarHistorico(
    "material",
    id,
    status === "arquivado" ? "Material arquivado" : "Material publicado",
    userId,
  );
}

export async function salvarProva(input: {
  id?: string;
  nome: string;
  notaMinima: number;
  questoes: AcademyProvaQuestao[];
  trilhaIds: string[];
  userId: string | null;
}): Promise<string> {
  const payload = {
    nome: input.nome.trim(),
    nota_minima: input.notaMinima,
    questoes: input.questoes,
  };
  let id = input.id;
  if (id) {
    const { error } = await supabase.from("academy_cronograma_prova").update(payload).eq("id", id);
    if (error) throw new Error(error.message || ERRO_GRAVAR);
    await registrarHistorico("prova", id, "Prova atualizada", input.userId);
  } else {
    const { data, error } = await supabase
      .from("academy_cronograma_prova")
      .insert({ ...payload, created_by: input.userId, status: "publicado" })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message || ERRO_GRAVAR);
    id = data.id as string;
    await registrarHistorico("prova", id, "Prova criada", input.userId);
  }
  const { error: delError } = await supabase.from("academy_cronograma_trilha_prova").delete().eq("prova_id", id);
  if (delError) throw new Error(delError.message || ERRO_GRAVAR);
  if (input.trilhaIds.length > 0) {
    const { error } = await supabase.from("academy_cronograma_trilha_prova").insert(
      input.trilhaIds.map((trilha_id) => ({ trilha_id, prova_id: id })),
    );
    if (error) throw new Error(error.message || ERRO_GRAVAR);
  }
  return id;
}

export async function definirStatusProva(
  id: string,
  status: AcademyCatalogoStatus,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("academy_cronograma_prova").update({ status }).eq("id", id);
  if (error) throw new Error(error.message || ERRO_GRAVAR);
  await registrarHistorico("prova", id, status === "arquivado" ? "Prova arquivada" : "Prova publicada", userId);
}
