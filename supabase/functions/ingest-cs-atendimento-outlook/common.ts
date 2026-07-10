export const CS_ATENDIMENTO_EMAIL_BUCKET = "cs-atendimento-email";

export const DEFAULT_MAILBOX = "contato@spingaming.com.br";

export interface IngestOutlookBody {
  dry_run?: boolean;
  max_messages?: number;
  /** Processa não lidos (padrão) ou janela recente com dedupe no banco. */
  modo?: "unread" | "recent";
  /** Só em modo `recent`: horas para trás (padrão 168 = 7 dias). */
  since_hours?: number;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cs-atendimento-outlook-ingest-secret",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(data: unknown, req: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

export function autorizadoIngestOutlook(req: Request): boolean {
  const secret = Deno.env.get("CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get("x-cs-atendimento-outlook-ingest-secret") ??
    req.headers.get("X-Cs-Atendimento-Outlook-Ingest-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
}

export function stripHtmlBasico(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizePathSegment(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120) || "arquivo";
}

export function assuntoOuPadrao(subject: string | null | undefined): string {
  const t = (subject ?? "").trim();
  return t || "(sem assunto)";
}
