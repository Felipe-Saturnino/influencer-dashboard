import { supabase } from "./supabase";

export const ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET = "academy-performance-hub-videos";

const MIME_POR_EXTENSAO: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
};

export function contentTypeVideoPerformanceHub(file: File): string | undefined {
  const typed = file.type?.trim();
  if (typed && typed !== "application/octet-stream") return typed;
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
  return MIME_POR_EXTENSAO[ext];
}

/** `video_url` no banco guarda path do Storage (não URL blob:/http:). */
export function isVideoStoragePathPerformanceHub(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (v.startsWith("blob:") || v.startsWith("http://") || v.startsWith("https://")) return false;
  return true;
}

export function videoPerformanceHubPodeAssistir(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (v.startsWith("blob:")) return false;
  return true;
}

export async function uploadVideoPerformanceHub(
  file: File,
  avaliacaoId?: string | null,
): Promise<{ path: string; error: string | null }> {
  const extRaw = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
  const ext = (extRaw ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const pasta = avaliacaoId?.trim() && !avaliacaoId.startsWith("novo-")
    ? `videos/${avaliacaoId.trim()}`
    : "videos";
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const contentType = contentTypeVideoPerformanceHub(file);
  try {
    const { error } = await supabase.storage.from(ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET).upload(path, file, {
      upsert: false,
      contentType,
    });
    if (error) {
      console.error("Performance Hub: falha ao enviar vídeo", error);
      return { path: "", error: "Não foi possível enviar o vídeo. Se o problema persistir, entre em contato com o suporte." };
    }
    return { path, error: null };
  } catch (e) {
    console.error("[uploadVideoPerformanceHub]", e);
    return { path: "", error: "Não foi possível enviar o vídeo. Se o problema persistir, entre em contato com o suporte." };
  }
}

export async function urlAssinadaVideoPerformanceHub(
  videoUrlOrPath: string | null | undefined,
): Promise<string | null> {
  if (!videoUrlOrPath?.trim()) return null;
  const v = videoUrlOrPath.trim();
  if (v.startsWith("blob:")) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const { data, error } = await supabase.storage
    .from(ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET)
    .createSignedUrl(v, 3600);
  if (error || !data?.signedUrl) {
    console.error("Performance Hub: falha ao assinar URL do vídeo", error);
    return null;
  }
  return data.signedUrl;
}
