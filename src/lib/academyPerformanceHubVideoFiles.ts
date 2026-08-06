import { supabase, supabaseAnonKey, supabaseUrl } from "./supabase";

export const ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET = "academy-performance-hub-videos";

/** Limite alinhado ao bucket (500 MB). */
export const ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES = 524288000;

export const ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_LABEL = "500 MB";

/** Retenção aplicada pela Edge Function purge-academy-performance-hub-videos. */
export const ACADEMY_PERFORMANCE_HUB_VIDEO_RETENCAO_DIAS = 90;

/**
 * Acima deste tamanho o upload usa TUS (resumável).
 * Abaixo: `storage.upload` simples — a API do Supabase recomenda TUS acima de ~6 MB.
 */
export const ACADEMY_PERFORMANCE_HUB_VIDEO_RESUMABLE_MIN_BYTES = 6 * 1024 * 1024;

/** Chunk obrigatório do protocolo TUS no Storage Supabase — não alterar. */
const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

/** Orientação no campo de upload — evita arquivos grandes na origem. */
export const ACADEMY_PERFORMANCE_HUB_VIDEO_ORIENTACAO =
  `Grave em 720p para o arquivo ficar leve — máximo ${ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_LABEL} por vídeo. ` +
  `O arquivo é apagado ${ACADEMY_PERFORMANCE_HUB_VIDEO_RETENCAO_DIAS} dias após a avaliação ser concluída.`;

export const ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO =
  `O vídeo ultrapassa o tamanho máximo de ${ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_LABEL}. Envie um arquivo menor.`;

const ERRO_GENERICO =
  "Não foi possível enviar o vídeo. Se o problema persistir, entre em contato com o suporte.";

const ERRO_SESSAO =
  "Sua sessão expirou. Faça login novamente e tente enviar o vídeo.";

const ERRO_REDE =
  "Não foi possível enviar o vídeo (falha de conexão ou tempo esgotado). Verifique a internet e tente novamente.";

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

export type UploadVideoPerformanceHubProgress = (pct: number) => void;

export function contentTypeVideoPerformanceHub(file: File): string {
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : "";
  const fromExt = MIME_POR_EXTENSAO[ext];
  const typed = file.type?.trim();
  if (typed && typed !== "application/octet-stream") {
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
  // Limite real do bucket / validação de tamanho — não confundir com 413 de gateway.
  if (
    (raw.includes("maximum") && (raw.includes("size") || raw.includes("file"))) ||
    raw.includes("entity too large") ||
    raw.includes("file size") ||
    raw.includes("exceeded the maximum")
  ) {
    return ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO;
  }
  if (raw.includes("413") || raw.includes("payload too large")) {
    return ERRO_REDE;
  }
  if (
    raw.includes("row-level security") ||
    raw.includes("violates") ||
    raw.includes("permission") ||
    raw.includes("not authorized") ||
    raw.includes("403") ||
    raw.includes("401")
  ) {
    return "Você não tem permissão para enviar o vídeo desta avaliação. Se o problema persistir, entre em contato com o suporte.";
  }
  if (
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("failed to fetch") ||
    raw.includes("aborted") ||
    raw.includes("econnreset")
  ) {
    return ERRO_REDE;
  }
  return ERRO_GENERICO;
}

function mensagemErroDesconhecido(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return mensagemErroUploadVideo({ message: String((e as { message: unknown }).message) });
  }
  return ERRO_GENERICO;
}

/** Host direto do Storage (`*.storage.supabase.co`) — melhor para uploads grandes. */
export function endpointResumableVideoPerformanceHub(baseUrl: string = supabaseUrl): string {
  try {
    const u = new URL(baseUrl);
    if (u.hostname.endsWith(".supabase.co") && !u.hostname.includes(".storage.")) {
      u.hostname = u.hostname.replace(/\.supabase\.co$/i, ".storage.supabase.co");
    }
    return `${u.origin}/storage/v1/upload/resumable`;
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
  }
}

async function uploadVideoSimples(
  path: string,
  file: File,
  contentType: string,
  onProgress?: UploadVideoPerformanceHubProgress,
): Promise<{ path: string; error: string | null }> {
  onProgress?.(0);
  const { error } = await supabase.storage.from(ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET).upload(path, file, {
    upsert: false,
    contentType,
  });
  if (error) {
    console.error("Performance Hub: falha ao enviar vídeo (simples)", error);
    return { path: "", error: mensagemErroUploadVideo(error) };
  }
  onProgress?.(100);
  return { path, error: null };
}

async function uploadVideoResumavel(
  path: string,
  file: File,
  contentType: string,
  onProgress?: UploadVideoPerformanceHubProgress,
): Promise<{ path: string; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    return { path: "", error: ERRO_SESSAO };
  }
  if (!supabaseUrl) {
    return { path: "", error: ERRO_GENERICO };
  }

  const { Upload } = await import("tus-js-client");

  return new Promise((resolve) => {
    const upload = new Upload(file, {
      endpoint: endpointResumableVideoPerformanceHub(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET,
        objectName: path,
        contentType,
        cacheControl: "3600",
      },
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      onError(error) {
        console.error("Performance Hub: falha ao enviar vídeo (resumável)", error);
        resolve({ path: "", error: mensagemErroDesconhecido(error) });
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal || !onProgress) return;
        const pct = Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100));
        onProgress(pct);
      },
      onSuccess() {
        onProgress?.(100);
        resolve({ path, error: null });
      },
    });

    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch((e) => {
        console.error("Performance Hub: falha ao iniciar upload resumável", e);
        resolve({ path: "", error: mensagemErroDesconhecido(e) });
      });
  });
}

export async function uploadVideoPerformanceHub(
  file: File,
  avaliacaoId?: string | null,
  onProgress?: UploadVideoPerformanceHubProgress,
): Promise<{ path: string; error: string | null }> {
  if (file.size > ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES) {
    return { path: "", error: ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO };
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
    if (file.size >= ACADEMY_PERFORMANCE_HUB_VIDEO_RESUMABLE_MIN_BYTES) {
      return await uploadVideoResumavel(path, file, contentType, onProgress);
    }
    return await uploadVideoSimples(path, file, contentType, onProgress);
  } catch (e) {
    console.error("[uploadVideoPerformanceHub]", e);
    return { path: "", error: mensagemErroDesconhecido(e) };
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
