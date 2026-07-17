import { supabase } from "./supabase";

export const ACADEMY_PORTAL_ASSETS_BUCKET = "academy-portal-assets";

export type AcademyPortalAnexoRef = { path: string; nome: string };

/** MIME aceitos pelo bucket — fallback quando o browser envia vazio ou octet-stream. */
const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function contentTypeAcademyPortalAsset(file: File): string | undefined {
  const typed = file.type?.trim();
  if (typed && typed !== "application/octet-stream") return typed;
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
  return MIME_POR_EXTENSAO[ext];
}

export async function uploadAcademyPortalAsset(
  file: File,
  pasta: "imagens" | "anexos",
): Promise<{ path: string; error: string | null }> {
  const extRaw = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const ext = (extRaw ?? "bin").toLowerCase();
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const contentType = contentTypeAcademyPortalAsset(file);
  try {
    const { error } = await supabase.storage.from(ACADEMY_PORTAL_ASSETS_BUCKET).upload(path, file, {
      upsert: false,
      contentType,
    });
    if (error) return { path: "", error: error.message };
    return { path, error: null };
  } catch (e) {
    console.error("[uploadAcademyPortalAsset]", e);
    return { path: "", error: "Falha de rede ao enviar o arquivo." };
  }
}

export async function uploadAcademyPortalAssets(
  files: readonly File[],
  pasta: "imagens" | "anexos",
): Promise<{ paths: string[]; error: string | null }> {
  const paths: string[] = [];
  for (const file of files) {
    const up = await uploadAcademyPortalAsset(file, pasta);
    if (up.error) return { paths: [], error: up.error };
    paths.push(up.path);
  }
  return { paths, error: null };
}

export function normalizarImagensAcademyPortal(row: {
  imagem_storage_paths?: string[] | null;
  imagem_storage_path?: string | null;
}): string[] {
  if (row.imagem_storage_paths?.length) {
    return row.imagem_storage_paths.map((p) => p.trim()).filter(Boolean);
  }
  if (row.imagem_storage_path?.trim()) return [row.imagem_storage_path.trim()];
  return [];
}

export function normalizarAnexosAcademyPortal(row: {
  anexo_storage_paths?: string[] | null;
  anexo_storage_path?: string | null;
  anexo_nomes?: string[] | null;
  anexo_nome?: string | null;
}): AcademyPortalAnexoRef[] {
  if (row.anexo_storage_paths?.length) {
    return row.anexo_storage_paths
      .map((path, i) => {
        const p = path.trim();
        if (!p) return null;
        const nome =
          row.anexo_nomes?.[i]?.trim() ||
          p.split("/").pop() ||
          "Anexo";
        return { path: p, nome };
      })
      .filter((x): x is AcademyPortalAnexoRef => x !== null);
  }
  if (row.anexo_storage_path?.trim()) {
    const p = row.anexo_storage_path.trim();
    return [
      {
        path: p,
        nome: row.anexo_nome?.trim() || p.split("/").pop() || "Anexo",
      },
    ];
  }
  return [];
}

export function payloadMidiaAcademyPortal(imagens: string[], anexos: AcademyPortalAnexoRef[]) {
  return {
    imagem_storage_paths: imagens.length ? imagens : null,
    imagem_storage_path: imagens[0] ?? null,
    anexo_storage_paths: anexos.length ? anexos.map((a) => a.path) : null,
    anexo_nomes: anexos.length ? anexos.map((a) => a.nome) : null,
    anexo_storage_path: anexos[0]?.path ?? null,
    anexo_nome: anexos[0]?.nome ?? null,
  };
}

export function arraysTextoIguais(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function anexosIguais(a: readonly AcademyPortalAnexoRef[], b: readonly AcademyPortalAnexoRef[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v.path === b[i]?.path && v.nome === b[i]?.nome);
}

export async function urlAssinadaAcademyPortalAsset(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await supabase.storage.from(ACADEMY_PORTAL_ASSETS_BUCKET).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function isVideoPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}
