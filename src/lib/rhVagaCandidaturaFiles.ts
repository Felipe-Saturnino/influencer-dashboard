import { supabase } from "./supabase";

export const RH_VAGA_CANDIDATURAS_BUCKET = "rh-vaga-candidaturas";

export function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(0, 120);
}

/** Prefixo de path: prestador UUID ou pasta `externo` (candidatura site). */
export function pathOwnerCandidaturaVaga(funcionarioId: string | null | undefined): string {
  const id = (funcionarioId ?? "").trim();
  return id || "externo";
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

export async function uploadAnexoCandidaturaVaga(
  funcionarioId: string | null | undefined,
  vagaId: string,
  file: File,
): Promise<{ ok: true; path: string; fileName: string } | { ok: false; message: string }> {
  const safe = sanitizeStorageFileName(file.name);
  const owner = pathOwnerCandidaturaVaga(funcionarioId);
  const path = `${owner}/${vagaId}/anexos/${crypto.randomUUID()}_${safe}`;
  const { error } = await supabase.storage.from(RH_VAGA_CANDIDATURAS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, path, fileName: file.name };
}

export async function urlAssinadaCurriculoCandidatura(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(RH_VAGA_CANDIDATURAS_BUCKET).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Alias semântico — mesmo helper de URL assinada (currículo, portfólio, vídeo, anexos). */
export async function urlAssinadaArquivoCandidatura(storagePath: string): Promise<string | null> {
  return urlAssinadaCurriculoCandidatura(storagePath);
}

export function downloadTextoComoArquivo(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
