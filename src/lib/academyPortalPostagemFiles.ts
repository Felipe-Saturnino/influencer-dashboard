import { supabase } from "./supabase";

export const ACADEMY_PORTAL_ASSETS_BUCKET = "academy-portal-assets";

export async function uploadAcademyPortalAsset(
  file: File,
  pasta: "imagens" | "anexos",
): Promise<{ path: string; error: string | null }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ACADEMY_PORTAL_ASSETS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) return { path: "", error: error.message };
  return { path, error: null };
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
