import { supabase } from "./supabase";

export const ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET = "academy-performance-hub-videos";

/** Limite alinhado ao bucket (200 MB). */
export const ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES = 209715200;

const MIME_POR_EXTENSAO: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mov: "video/quicktime",
  qt: "video/quicktime",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
};

const ERRO_GENERICO =
  "Não foi possível enviar o vídeo. Se o problema persistir, entre em contato com o suporte.";

export function contentTypeVideoPerformanceHub(file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
  const fromExt = MIME_POR_EXTENSAO[ext];
  const typed = file.type?.trim();
  if (typed && typed !== "application/octet-stream") {
    // Preferir MIME da extensão quando o browser manda tipo genérico de vídeo estranho
    if (fromExt && typed.startsWith("video/")) return fromExt;
    if (typed.startsWith("video/")) return typed;
  }
  return fromExt ?? "video/mp4";
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

function mensagemErroUploadVideo(error: { message?: string; statusCode?: string | number } | null): string {
  const raw = `${error?.message ?? ""} ${error?.statusCode ?? ""}`.toLowerCase();
  if (raw.includes("bucket") && (raw.includes("not found") || raw.includes("does not exist"))) {
    return "Armazenamento de vídeo ainda não está configurado. Entre em contato com o suporte.";
  }
  if (raw.includes("mime") || raw.includes("not supported") || raw.includes("invalid content")) {
    return "Formato de vídeo não suportado. Use MP4, MOV ou WebM.";
  }
  if (raw.includes("maximum") || raw.includes("too large") || raw.includes("payload") || raw.includes("413")) {
    return "O vídeo ultrapassa o tamanho máximo de 200 MB. Envie um arquivo menor.";
  }
  if (
    raw.includes("row-level security") ||
    raw.includes("violates") ||
    raw.includes("permission") ||
    raw.includes("not authorized") ||
    raw.includes("403")
  ) {
    return "Você não tem permissão para enviar o vídeo desta avaliação. Se o problema persistir, entre em contato com o suporte.";
  }
  return ERRO_GENERICO;
}

export async function uploadVideoPerformanceHub(
  file: File,
  avaliacaoId?: string | null,
): Promise<{ path: string; error: string | null }> {
  if (file.size > ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES) {
    return {
      path: "",
      error: "O vídeo ultrapassa o tamanho máximo de 200 MB. Envie um arquivo menor.",
    };
  }

  const extRaw = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
  const ext = (extRaw ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const pasta =
    avaliacaoId?.trim() && !avaliacaoId.startsWith("novo-")
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
      return { path: "", error: mensagemErroUploadVideo(error) };
    }
    return { path, error: null };
  } catch (e) {
    console.error("[uploadVideoPerformanceHub]", e);
    return { path: "", error: ERRO_GENERICO };
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
