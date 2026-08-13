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

export const ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE =
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

export function detalheErroUploadVideo(error: unknown): { message: string; status: number | null } {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : String(error ?? "");
  let status: number | null = null;
  if (error && typeof error === "object") {
    const rec = error as {
      statusCode?: string | number;
      originalResponse?: { getStatus?: () => number } | null;
    };
    if (typeof rec.statusCode === "number") status = rec.statusCode;
    else if (typeof rec.statusCode === "string" && /^\d+$/.test(rec.statusCode)) {
      status = Number(rec.statusCode);
    }
    const fromRes = rec.originalResponse?.getStatus?.();
    if (typeof fromRes === "number" && fromRes > 0) status = fromRes;
  }
  return { message, status };
}

export function mensagemErroUploadVideo(error: { message?: string; statusCode?: string | number } | null): string {
  const raw = `${error?.message ?? ""} ${error?.statusCode ?? ""}`.toLowerCase();
  const status =
    typeof error?.statusCode === "number"
      ? error.statusCode
      : typeof error?.statusCode === "string" && /^\d+$/.test(error.statusCode)
        ? Number(error.statusCode)
        : null;

  if (raw.includes("bucket") && (raw.includes("not found") || raw.includes("does not exist"))) {
    return "Armazenamento de vídeo ainda não está configurado. Entre em contato com o suporte.";
  }
  if (raw.includes("mime") || raw.includes("not supported") || raw.includes("invalid content")) {
    return "Formato de vídeo não suportado. Use MP4, MOV ou WebM.";
  }
  if (status === 413 || raw.includes("payload too large") || raw.includes("entity too large")) {
    return ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE;
  }
  if (raw.includes("file size limit") || raw.includes("exceeded the maximum allowed size")) {
    return ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO;
  }
  if (status === 409 || raw.includes("409") || raw.includes("conflict")) {
    return ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE;
  }
  if (
    status === 401 ||
    status === 403 ||
    raw.includes("row-level security") ||
    raw.includes("violates") ||
    raw.includes("permission") ||
    raw.includes("not authorized")
  ) {
    return "Você não tem permissão para enviar o vídeo desta avaliação. Se o problema persistir, entre em contato com o suporte.";
  }
  if (
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("failed to fetch") ||
    raw.includes("aborted") ||
    raw.includes("econnreset") ||
    raw.includes("load failed") ||
    raw.includes("cors")
  ) {
    return ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE;
  }
  return ERRO_GENERICO;
}

function mensagemErroDesconhecido(e: unknown): string {
  const { message, status } = detalheErroUploadVideo(e);
  return mensagemErroUploadVideo({ message, statusCode: status ?? undefined });
}

function isErroRede(msg: string): boolean {
  return msg === ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE;
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

export function endpointResumableVideoPerformanceHubApi(baseUrl: string = supabaseUrl): string {
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

async function tokenSessaoVideo(): Promise<string | null> {
  const atual = await supabase.auth.getSession();
  let session = atual.data.session;
  const expiraEmMs = (session?.expires_at ?? 0) * 1000;
  if (!session?.access_token || expiraEmMs < Date.now() + 5 * 60 * 1000) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session ?? session;
  }
  return session?.access_token?.trim() || null;
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

async function uploadVideoResumavelEm(
  endpoint: string,
  path: string,
  file: File,
  contentType: string,
  onProgress?: UploadVideoPerformanceHubProgress,
): Promise<{ path: string; error: string | null }> {
  const accessToken = await tokenSessaoVideo();
  if (!accessToken) return { path: "", error: ERRO_SESSAO };
  if (!supabaseUrl) return { path: "", error: ERRO_GENERICO };

  const { Upload } = await import("tus-js-client");

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { path: string; error: string | null }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const upload = new Upload(file, {
      endpoint,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: false,
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: ACADEMY_PERFORMANCE_HUB_VIDEOS_BUCKET,
        objectName: path,
        contentType,
        cacheControl: "3600",
      },
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      fingerprint(fileRef: File) {
        const nome = "name" in fileRef ? String(fileRef.name) : "";
        const modified = "lastModified" in fileRef ? String(fileRef.lastModified) : "";
        return Promise.resolve(`ph-video-${path}-${fileRef.size}-${modified}-${nome}`);
      },
      async onBeforeRequest(req) {
        const token = await tokenSessaoVideo();
        if (token) req.setHeader("Authorization", `Bearer ${token}`);
        if (supabaseAnonKey) req.setHeader("apikey", supabaseAnonKey);
      },
      onShouldRetry(error, _retryAttempt, _options) {
        const status = error.originalResponse?.getStatus() ?? 0;
        if (status === 400 || status === 401 || status === 403 || status === 404 || status === 413) {
          return false;
        }
        return true;
      },
      onError(error) {
        console.error("Performance Hub: falha ao enviar vídeo (resumável)", endpoint, error);
        finish({ path: "", error: mensagemErroDesconhecido(error) });
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal || !onProgress) return;
        const pct = Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100));
        onProgress(pct);
      },
      onSuccess() {
        onProgress?.(100);
        finish({ path, error: null });
      },
    });

    upload.start();
  });
}

async function uploadVideoResumavel(
  path: string,
  file: File,
  contentType: string,
  onProgress?: UploadVideoPerformanceHubProgress,
): Promise<{ path: string; error: string | null }> {
  const direto = endpointResumableVideoPerformanceHub();
  const viaApi = endpointResumableVideoPerformanceHubApi();
  const primeiro = await uploadVideoResumavelEm(direto, path, file, contentType, onProgress);
  if (!primeiro.error) return primeiro;
  if (direto !== viaApi && isErroRede(primeiro.error)) {
    console.warn("Performance Hub: retry TUS via API host");
    return uploadVideoResumavelEm(viaApi, path, file, contentType, onProgress);
  }
  return primeiro;
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
