import { supabase } from "./supabase";

export const RH_VAGA_CANDIDATURAS_BUCKET = "rh-vaga-candidaturas";

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(0, 120);
}

export async function uploadCurriculoCandidaturaVaga(
  funcionarioId: string,
  vagaId: string,
  file: File,
): Promise<{ ok: true; path: string; fileName: string } | { ok: false; message: string }> {
  const safe = sanitizeStorageFileName(file.name);
  const path = `${funcionarioId}/${vagaId}/${crypto.randomUUID()}_${safe}`;
  const { error } = await supabase.storage.from(RH_VAGA_CANDIDATURAS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, path, fileName: file.name };
}
