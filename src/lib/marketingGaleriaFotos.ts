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
  if (f.tipo === "prestador" && f.rh_funcionario_id) return `prestador:${f.rh_funcionario_id}`;
  return null;
}

export function nomeBaseGrupoFotoGaleria(f: MarketingFotoComEvento): string {
  if (f.tipo === "geral") return fotoEventoEmbed(f)?.nome?.trim() || "Evento";
  return fotoPrestadorEmbed(f)?.nome?.trim() || "Colaborador";
}

/**
 * Rótulos «Evento 1», «Colaborador 2»… por grupo, ordenados por data de upload (mais antigo = 1).
 */
export function buildRotulosFotoGaleria(fotos: MarketingFotoComEvento[]): Map<string, string> {
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
      map.set(f.id, `${nomeBaseGrupoFotoGaleria(f)} ${i + 1}`);
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

export function fmtDataEvento(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export type GaleriaMeuColaborador = { id: string; nome: string };

/** Colaborador vinculado ao login (RPC SECURITY DEFINER — mesmo critério do RLS Minhas Fotos). */
export async function buscarMeuColaboradorGaleria(): Promise<GaleriaMeuColaborador | null> {
  const { data, error } = await supabase.rpc("galeria_fotos_meu_colaborador");
  if (error || data == null) return null;
  const row = data as { id?: string; nome?: string };
  if (!row.id || !row.nome) return null;
  return { id: row.id, nome: row.nome };
}
