import { supabase } from "./supabase";

export const MARKETING_FOTOS_GERAIS_BUCKET = "marketing-fotos-gerais";
export const MARKETING_FOTOS_PRESTADORES_BUCKET = "marketing-fotos-prestadores";

export const MARKETING_FOTO_MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;
export const MARKETING_FOTO_TAMANHO_MAX_BYTES = 25 * 1024 * 1024;

export function marketingFotoTamanhoMaxMb(): number {
  return MARKETING_FOTO_TAMANHO_MAX_BYTES / (1024 * 1024);
}

export type MarketingFotoTipo = "geral" | "prestador";

export interface MarketingEvento {
  id: string;
  nome: string;
  data_evento: string;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MarketingFoto {
  id: string;
  evento_id: string | null;
  tipo: MarketingFotoTipo;
  rh_funcionario_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  legenda: string | null;
  visivel_prestador: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export type MarketingEventoEmbed = Pick<MarketingEvento, "id" | "nome" | "data_evento" | "descricao" | "ativo">;
export type MarketingPrestadorEmbed = { id: string; nome: string };

export interface MarketingFotoComEvento extends MarketingFoto {
  /** Join Supabase — objeto ou array conforme a relação embutida. */
  marketing_eventos?: MarketingEventoEmbed | MarketingEventoEmbed[] | null;
  rh_funcionarios?: MarketingPrestadorEmbed | MarketingPrestadorEmbed[] | null;
}

function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function fotoEventoEmbed(f: MarketingFotoComEvento): MarketingEventoEmbed | null {
  return unwrapEmbed(f.marketing_eventos);
}

export function fotoPrestadorEmbed(f: MarketingFotoComEvento): MarketingPrestadorEmbed | null {
  return unwrapEmbed(f.rh_funcionarios);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extrai rh_funcionario_id do path `prestadores/{uuid}/…` (fallback para registros legados). */
export function rhFuncionarioIdFromStoragePath(storagePath: string): string | null {
  const parts = storagePath.split("/");
  if (parts[0] !== "prestadores" || !parts[1]) return null;
  const id = parts[1].trim();
  return UUID_RE.test(id) ? id : null;
}

/** ID efetivo do colaborador — coluna ou path de storage. */
export function effectiveRhFuncionarioId(f: MarketingFotoComEvento): string | null {
  return f.rh_funcionario_id ?? rhFuncionarioIdFromStoragePath(f.storage_path);
}

export const MARKETING_FOTOS_GALERIA_SELECT =
  "id, evento_id, tipo, rh_funcionario_id, storage_path, file_name, mime_type, legenda, visivel_prestador, uploaded_by, created_at, marketing_eventos(id, nome, data_evento, descricao, ativo), rh_funcionarios!rh_funcionario_id(id, nome)";

/** Select leve — carregamento por evento/colaborador (sem embed). */
export const MARKETING_FOTOS_LISTAGEM_SELECT =
  "id, evento_id, tipo, rh_funcionario_id, storage_path, file_name, mime_type, legenda, visivel_prestador, uploaded_by, created_at";

const GALERIA_FOTOS_PAGE_SIZE = 1000;

export type GaleriaEventoResumo = MarketingEvento & { qtd_fotos: number };
export type GaleriaPrestadorResumo = { id: string; nome: string; qtd_fotos: number };

export function chaveCacheGrupoGaleria(kind: "evento" | "prestador", id: string): string {
  return kind === "evento" ? `geral:${id}` : `prestador:${id}`;
}

async function listarMarketingFotosPaginado(
  fetchPage: (
    offset: number,
    pageSize: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<MarketingFotoComEvento[]> {
  const all: MarketingFotoComEvento[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, GALERIA_FOTOS_PAGE_SIZE);
    if (error) throw error;

    const batch = (data ?? []) as MarketingFotoComEvento[];
    all.push(...batch);

    if (batch.length < GALERIA_FOTOS_PAGE_SIZE) break;
    offset += GALERIA_FOTOS_PAGE_SIZE;
  }

  return all;
}

/** Resumo de todos os eventos com fotos gerais (contagem no servidor). */
export async function listarResumoEventosGaleria(): Promise<GaleriaEventoResumo[]> {
  const { data, error } = await supabase.rpc("galeria_fotos_resumo_eventos");
  if (error) throw error;
  return ((data ?? []) as GaleriaEventoResumo[]).map((row) => ({
    ...row,
    qtd_fotos: Number(row.qtd_fotos) || 0,
  }));
}

/** Resumo de colaboradores com fotos individuais (exclui encerrados no servidor). */
export async function listarResumoPrestadoresGaleria(): Promise<GaleriaPrestadorResumo[]> {
  const { data, error } = await supabase.rpc("galeria_fotos_resumo_prestadores");
  if (error) throw error;
  return ((data ?? []) as GaleriaPrestadorResumo[]).map((row) => ({
    id: row.id,
    nome: row.nome,
    qtd_fotos: Number(row.qtd_fotos) || 0,
  }));
}

/** Todas as fotos gerais de um evento (paginação interna). */
export async function listarMarketingFotosPorEvento(eventoId: string): Promise<MarketingFotoComEvento[]> {
  return listarMarketingFotosPaginado(async (offset, pageSize) =>
    supabase
      .from("marketing_fotos")
      .select(MARKETING_FOTOS_LISTAGEM_SELECT)
      .eq("tipo", "geral")
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1),
  );
}

/** Todas as fotos individuais de um colaborador (paginação interna). */
export async function listarMarketingFotosPorPrestador(rhFuncionarioId: string): Promise<MarketingFotoComEvento[]> {
  return listarMarketingFotosPaginado(async (offset, pageSize) =>
    supabase
      .from("marketing_fotos")
      .select(MARKETING_FOTOS_LISTAGEM_SELECT)
      .eq("tipo", "prestador")
      .eq("rh_funcionario_id", rhFuncionarioId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1),
  );
}

/** Busca server-side (complementar ao filtro insensível a acentos no cliente). */
export async function buscarMarketingFotosGaleria(termo: string): Promise<MarketingFotoComEvento[]> {
  const q = termo.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc("galeria_fotos_buscar", { p_termo: q });
  if (error) throw error;
  return (data ?? []) as MarketingFotoComEvento[];
}

/** @deprecated Preferir resumo + carregamento por grupo. Mantido para compatibilidade pontual. */
export async function listarMarketingFotosGaleria(): Promise<MarketingFotoComEvento[]> {
  return listarMarketingFotosPaginado(async (offset, pageSize) =>
    supabase
      .from("marketing_fotos")
      .select(MARKETING_FOTOS_GALERIA_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1),
  );
}

const METADADOS_IN_CHUNK = 80;

/** Busca eventos/colaboradores em lotes (evita falha silenciosa com `.in()` muito grande). */
async function fetchInChunks<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (!ids.length) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += METADADOS_IN_CHUNK) {
    const chunk = ids.slice(i, i + METADADOS_IN_CHUNK);
    out.push(...(await fetchChunk(chunk)));
  }
  return out;
}

export type GaleriaEventoResolvido = {
  id: string;
  nome: string;
  data_evento: string;
  descricao: string | null;
};

export type GaleriaPrestadorResolvido = {
  id: string;
  nome: string;
};

export type GaleriaMetadadosContexto = {
  eventosPorId?: ReadonlyMap<string, Pick<MarketingEvento, "id" | "nome" | "data_evento" | "descricao">>;
  prestadoresPorId?: ReadonlyMap<string, GaleriaPrestadorResolvido>;
};

/** Evento da foto — embed PostgREST ou mapa local (evita descartar foto quando RLS bloqueia o join). */
export function resolverEventoGaleria(
  f: MarketingFotoComEvento,
  ctx?: GaleriaMetadadosContexto,
): GaleriaEventoResolvido | null {
  if (f.tipo !== "geral" || !f.evento_id) return null;
  const embed = fotoEventoEmbed(f);
  if (embed) {
    return {
      id: embed.id,
      nome: embed.nome,
      data_evento: embed.data_evento,
      descricao: embed.descricao?.trim() || null,
    };
  }
  const fromList = ctx?.eventosPorId?.get(f.evento_id);
  if (fromList) {
    return {
      id: fromList.id,
      nome: fromList.nome,
      data_evento: fromList.data_evento,
      descricao: fromList.descricao?.trim() || null,
    };
  }
  return {
    id: f.evento_id,
    nome: "Evento",
    data_evento: "",
    descricao: null,
  };
}

/** Colaborador da foto — embed ou mapa local. */
export function resolverPrestadorGaleria(
  f: MarketingFotoComEvento,
  ctx?: GaleriaMetadadosContexto,
): GaleriaPrestadorResolvido | null {
  if (f.tipo !== "prestador") return null;
  const rhId = effectiveRhFuncionarioId(f);
  if (!rhId) return null;
  const embed = fotoPrestadorEmbed(f);
  if (embed) return embed;
  const fromList = ctx?.prestadoresPorId?.get(rhId);
  if (fromList) return fromList;
  return { id: rhId, nome: "Colaborador" };
}

function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
}

export function validarArquivoMarketingFoto(file: File): string | null {
  if (!MARKETING_FOTO_MIME_PERMITIDOS.includes(file.type as (typeof MARKETING_FOTO_MIME_PERMITIDOS)[number])) {
    return "Formato não suportado. Use JPG, PNG ou WebP.";
  }
  if (file.size > MARKETING_FOTO_TAMANHO_MAX_BYTES) {
    return `Arquivo muito grande. O limite é ${marketingFotoTamanhoMaxMb()} MB por foto.`;
  }
  return null;
}

export function urlPublicaFotoGeral(storagePath: string): string {
  const { data } = supabase.storage.from(MARKETING_FOTOS_GERAIS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function urlAssinadaFotoPrestador(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MARKETING_FOTOS_PRESTADORES_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadMarketingFotoArquivo(
  file: File,
  tipo: MarketingFotoTipo,
  eventoId: string | null,
  prestadorId?: string | null,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const validacao = validarArquivoMarketingFoto(file);
  if (validacao) return { ok: false, message: validacao };

  if (tipo === "geral" && !eventoId) {
    return { ok: false, message: "Selecione um evento." };
  }
  if (tipo === "prestador" && !prestadorId) {
    return { ok: false, message: "Selecione o colaborador." };
  }

  const safe = sanitizeStorageFileName(file.name);
  const path =
    tipo === "geral"
      ? `gerais/${eventoId}/${crypto.randomUUID()}_${safe}`
      : `prestadores/${prestadorId}/${crypto.randomUUID()}_${safe}`;

  const bucket = tipo === "geral" ? MARKETING_FOTOS_GERAIS_BUCKET : MARKETING_FOTOS_PRESTADORES_BUCKET;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, path };
}

export async function removerMarketingFotoStorage(
  tipo: MarketingFotoTipo,
  storagePath: string,
): Promise<void> {
  const bucket = tipo === "geral" ? MARKETING_FOTOS_GERAIS_BUCKET : MARKETING_FOTOS_PRESTADORES_BUCKET;
  await supabase.storage.from(bucket).remove([storagePath]);
}

/** Fotos gerais vinculadas ao evento (para contagem e exclusão em cascata manual no storage). */
export function fotosGeraisDoEvento(
  fotos: MarketingFotoComEvento[],
  eventoId: string,
): MarketingFotoComEvento[] {
  return fotos.filter((f) => f.tipo === "geral" && f.evento_id === eventoId);
}

/** Chave de agrupamento para numeração sequencial (evento ou colaborador). */
export function chaveGrupoFotoGaleria(f: MarketingFotoComEvento): string | null {
  if (f.tipo === "geral" && f.evento_id) return `geral:${f.evento_id}`;
  if (f.tipo === "prestador") {
    const rhId = effectiveRhFuncionarioId(f);
    if (rhId) return `prestador:${rhId}`;
  }
  return null;
}

export function nomeBaseGrupoFotoGaleria(
  f: MarketingFotoComEvento,
  ctx?: GaleriaMetadadosContexto,
): string {
  if (f.tipo === "geral") return resolverEventoGaleria(f, ctx)?.nome.trim() || "Evento";
  return resolverPrestadorGaleria(f, ctx)?.nome.trim() || "Colaborador";
}

/**
 * Rótulos «Evento 1», «Colaborador 2»… por grupo, ordenados por data de upload (mais antigo = 1).
 */
export function buildRotulosFotoGaleria(
  fotos: MarketingFotoComEvento[],
  ctx?: GaleriaMetadadosContexto,
): Map<string, string> {
  const map = new Map<string, string>();
  const grupos = new Map<string, MarketingFotoComEvento[]>();
  for (const f of fotos) {
    const key = chaveGrupoFotoGaleria(f);
    if (!key) continue;
    const list = grupos.get(key) ?? [];
    list.push(f);
    grupos.set(key, list);
  }
  for (const list of grupos.values()) {
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    sorted.forEach((f, i) => {
      map.set(f.id, `${nomeBaseGrupoFotoGaleria(f, ctx)} ${i + 1}`);
    });
  }
  return map;
}

function extensaoArquivoFoto(f: MarketingFotoComEvento): string {
  const fromName = f.file_name.includes(".") ? f.file_name.slice(f.file_name.lastIndexOf(".")) : "";
  if (fromName) return fromName.toLowerCase();
  if (f.mime_type === "image/png") return ".png";
  if (f.mime_type === "image/webp") return ".webp";
  return ".jpg";
}

function sanitizeNomeArquivoDownload(nome: string): string {
  return nome.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

export function rotuloExibicaoFotoGaleria(
  f: MarketingFotoComEvento,
  rotulos: Map<string, string>,
): string {
  return rotulos.get(f.id) ?? nomeBaseGrupoFotoGaleria(f);
}

export function nomeArquivoDownloadFotoGaleria(
  f: MarketingFotoComEvento,
  rotulos: Map<string, string>,
): string {
  const rotulo = rotuloExibicaoFotoGaleria(f, rotulos);
  return `${sanitizeNomeArquivoDownload(rotulo)}${extensaoArquivoFoto(f)}`;
}

/** Remove arquivos no storage e exclui o evento (DB cascade em marketing_fotos). */
export async function excluirMarketingEventoGaleria(
  eventoId: string,
  fotosEvento: MarketingFotoComEvento[],
): Promise<{ ok: true } | { ok: false }> {
  for (const f of fotosEvento) {
    await removerMarketingFotoStorage("geral", f.storage_path);
  }
  const { error } = await supabase.from("marketing_eventos").delete().eq("id", eventoId);
  if (error) return { ok: false };
  return { ok: true };
}

/**
 * Remove fotos individuais da Galeria (Minhas Fotos) ao encerrar o prestador.
 * Storage via API (Supabase bloqueia DELETE direto em storage.objects); linhas via RPC.
 */
export async function excluirMarketingFotosDoPrestador(
  rhFuncionarioId: string,
): Promise<{ ok: true; removidas: number } | { ok: false }> {
  const id = rhFuncionarioId.trim();
  if (!id) return { ok: false };

  const { data: fotos, error: fetchError } = await supabase
    .from("marketing_fotos")
    .select("storage_path")
    .eq("tipo", "prestador")
    .eq("rh_funcionario_id", id);

  if (fetchError) {
    console.error("excluirMarketingFotosDoPrestador list:", fetchError);
    return { ok: false };
  }

  const paths = (fotos ?? []).map((f) => f.storage_path).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error: storageError } = await supabase.storage
      .from(MARKETING_FOTOS_PRESTADORES_BUCKET)
      .remove(batch);
    if (storageError) {
      console.error("excluirMarketingFotosDoPrestador storage:", storageError);
      return { ok: false };
    }
  }

  const { data, error } = await supabase.rpc("marketing_galeria_excluir_fotos_prestador", {
    p_rh_funcionario_id: id,
  });
  if (error) {
    console.error("marketing_galeria_excluir_fotos_prestador:", error);
    return { ok: false };
  }
  return { ok: true, removidas: typeof data === "number" ? data : paths.length };
}

export function fmtDataEvento(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export type GaleriaMeuColaborador = { id: string; nome: string };

/** Carrega metadados de eventos e colaboradores referenciados pelas fotos (inclui eventos inativos). */
export async function enrichMetadadosGaleriaFromFotos(
  fotosList: MarketingFotoComEvento[],
): Promise<{ eventos: MarketingEvento[]; prestadores: GaleriaPrestadorResolvido[] }> {
  const eventoIds = [
    ...new Set(
      fotosList.filter((f) => f.tipo === "geral" && f.evento_id).map((f) => f.evento_id as string),
    ),
  ];
  const prestadorIds = [
    ...new Set(
      fotosList
        .filter((f) => f.tipo === "prestador")
        .map((f) => effectiveRhFuncionarioId(f))
        .filter((id): id is string => !!id),
    ),
  ];

  const [eventosRows, prestadorRows] = await Promise.all([
    fetchInChunks(eventoIds, async (chunk) => {
      const { data, error } = await supabase
        .from("marketing_eventos")
        .select("id, nome, data_evento, descricao, ativo, created_at, updated_at")
        .in("id", chunk);
      if (error) throw error;
      return (data ?? []) as MarketingEvento[];
    }),
    fetchInChunks(prestadorIds, async (chunk) => {
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("id, nome")
        .in("id", chunk);
      if (error) throw error;
      return (data ?? [])
        .filter((r): r is { id: string; nome: string } => !!r.id && !!r.nome)
        .map((r) => ({ id: r.id, nome: r.nome }));
    }),
  ]);

  return {
    eventos: eventosRows.sort((a, b) => b.data_evento.localeCompare(a.data_evento)),
    prestadores: prestadorRows.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}

/** Colaborador vinculado ao login (RPC SECURITY DEFINER — mesmo critério do RLS Minhas Fotos). */
export async function buscarMeuColaboradorGaleria(): Promise<GaleriaMeuColaborador | null> {
  const { data, error } = await supabase.rpc("galeria_fotos_meu_colaborador");
  if (error || data == null) return null;
  const row = data as { id?: string; nome?: string };
  if (!row.id || !row.nome) return null;
  return { id: row.id, nome: row.nome };
}
