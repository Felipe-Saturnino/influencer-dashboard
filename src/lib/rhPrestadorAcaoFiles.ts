import { supabase } from "./supabase";

export const RH_PRESTADOR_ACOES_BUCKET = "rh-prestador-acoes";

export type AnexoPrestadorAcao = { name: string; path: string; publicUrl: string };

/** Envia arquivos ao bucket público `rh-prestador-acoes/{prestadorId}/…`. */
export async function uploadAnexosAcaoRh(prestadorId: string, files: File[]): Promise<{ ok: true; anexos: AnexoPrestadorAcao[] } | { ok: false; message: string }> {
  const anexos: AnexoPrestadorAcao[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^\w.-]/g, "_").slice(0, 120);
    const path = `${prestadorId}/${crypto.randomUUID()}_${safe}`;
    const { error } = await supabase.storage.from(RH_PRESTADOR_ACOES_BUCKET).upload(path, file, { upsert: false });
    if (error) return { ok: false, message: error.message };
    const { data: pub } = supabase.storage.from(RH_PRESTADOR_ACOES_BUCKET).getPublicUrl(path);
    anexos.push({ name: file.name, path, publicUrl: pub.publicUrl });
  }
  return { ok: true, anexos };
}
