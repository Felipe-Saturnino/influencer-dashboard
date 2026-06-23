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

export type MarketingEventoEmbed = Pick<MarketingEvento, "id" | "nome" | "data_evento" | "ativo">;
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
