import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: validate-comercial-dominios
 * Verifica HTTP dos domínios em comercial_marcas → status_dominio ok | inativo.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * POST JSON: { dry_run?: boolean, limit?: number }
 *
 * Deploy no painel Supabase: um único ficheiro index.ts (sem imports locais).
 * Lógica espelhada em src/lib/comercialDominioValidation.ts para testes locais.
 */

type StatusDominioDb = "ok" | "inativo";

const INTEGRACAO_SLUG = "comercial_dominio_validacao";
const DOMINIO_CHECK_TIMEOUT_MS = 12_000;
const DOMINIO_CHECK_CONCURRENCY = 6;
const DOMINIO_CHECK_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const DOMINIO_CHECK_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent": DOMINIO_CHECK_USER_AGENT,
  "Cache-Control": "no-cache",
};
const DEFAULT_LIMIT = 500;

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-region",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: Record<string, unknown>, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function normalizeDominioForCheck(raw: string | null | undefined): string | null {
  const v = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!v || v === "a definir" || v === "a definir." || v === "-") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

function buildDominioProbeUrls(raw: string | null | undefined): string[] {
  const base = normalizeDominioForCheck(raw);
  if (!base) return [];
  const urls = new Set<string>([base]);
  try {
    const u = new URL(base);
    const host = u.hostname;
    if (host.startsWith("www.")) {
      urls.add(`${u.protocol}//${host.slice(4)}${u.pathname}${u.search}`);
    } else {
      urls.add(`${u.protocol}//www.${host}${u.pathname}${u.search}`);
    }
  } catch {
    /* ignore */
  }
  return [...urls];
}

function httpStatusAtivo(status: number): boolean {
  return status >= 200 && status < 400;
}

function responseIndicaDominioAtivo(res: Response): boolean {
  if (httpStatusAtivo(res.status)) return true;
  if (res.status === 403 || res.status === 401) {
    if (res.headers.get("cf-mitigated")) return true;
    const server = (res.headers.get("server") ?? "").toLowerCase();
    if (server.includes("cloudflare") || server.includes("nginx") || server.includes("openresty")) {
      return true;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) return true;
  }
  return false;
}

function fetchErrorIndicaServidorRespondeu(err: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    parts.push(String((cur as Error)?.message ?? cur));
    const code = (cur as { code?: string })?.code;
    if (code) parts.push(code);
    cur = (cur as { cause?: unknown })?.cause;
  }
  const joined = parts.join(" ").toLowerCase();
  return (
    joined.includes("und_err_headers_overflow") ||
    joined.includes("headers_overflow") ||
    joined.includes("headers overflow")
  );
}

async function probeUrlOnce(
  url: string,
  method: "GET" | "HEAD",
  signal: AbortSignal,
): Promise<"ok" | "inativo" | "retry"> {
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal,
      headers: DOMINIO_CHECK_HEADERS,
    });
    if (responseIndicaDominioAtivo(res)) return "ok";
    if (method === "HEAD") return "retry";
    if (res.status === 404) return "retry";
    return "inativo";
  } catch (err) {
    if (fetchErrorIndicaServidorRespondeu(err)) return "ok";
    if (method === "HEAD") return "retry";
    return "retry";
  }
}

async function probeDominioHttp(rawUrl: string | null | undefined): Promise<StatusDominioDb> {
  const urls = buildDominioProbeUrls(rawUrl);
  if (urls.length === 0) return "inativo";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOMINIO_CHECK_TIMEOUT_MS);

  try {
    for (const url of urls) {
      const getResult = await probeUrlOnce(url, "GET", ctrl.signal);
      if (getResult === "ok") return "ok";
      if (getResult === "inativo") return "inativo";

      const headResult = await probeUrlOnce(url, "HEAD", ctrl.signal);
      if (headResult === "ok") return "ok";
      if (headResult === "inativo") return "inativo";
    }
    return "inativo";
  } finally {
    clearTimeout(timer);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length || 1);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLog(
  supabase: SupabaseAdmin,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    registros_atualizados: number;
    erros_count: number;
    mensagem_erro: string | null;
    duracao_ms: number;
  },
): Promise<void> {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[validate-comercial-dominios] Falha ao gravar sync_logs:", e);
  }
}

async function insertHistoricoDominio(
  supabase: SupabaseAdmin,
  marcaId: string,
  valorAnterior: string,
  valorNovo: string,
): Promise<void> {
  if (valorAnterior === valorNovo) return;
  await supabase.from("comercial_marca_historico").insert({
    marca_id: marcaId,
    usuario_id: null,
    campo: "status_dominio",
    valor_anterior: valorAnterior === "ok" ? "Ativo" : "Inativo",
    valor_novo: valorNovo === "ok" ? "Ativo" : "Inativo",
  });
}

interface MarcaRow {
  id: string;
  dominio: string | null;
  status_dominio: StatusDominioDb;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, erro: "Método não permitido" }, req, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "Configuração do servidor incompleta" }, req, 500);
  }

  let body: { dry_run?: boolean; limit?: number } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return json({ ok: false, erro: "Body JSON inválido" }, req, 400);
  }

  const dryRun = body.dry_run === true;
  const limit = Math.min(Math.max(1, body.limit ?? DEFAULT_LIMIT), 2000);
  const t0 = Date.now();
  const supabase = createClient(supabaseUrl, serviceKey, supabaseServiceOptions);
  const erros: string[] = [];

  const { data: marcasRaw, error: selErr } = await supabase
    .from("comercial_marcas")
    .select("id, dominio, status_dominio")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (selErr) {
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: 0,
      registros_atualizados: 0,
      erros_count: 1,
      mensagem_erro: selErr.message,
      duracao_ms: Date.now() - t0,
    });
    return json({ ok: false, erro: selErr.message }, req, 500);
  }

  const marcas = (marcasRaw ?? []) as MarcaRow[];
  let verificadas = 0;
  let atualizadas = 0;
  let ativas = 0;
  let inativas = 0;

  const resultados = await mapWithConcurrency(marcas, DOMINIO_CHECK_CONCURRENCY, async (marca) => {
    const novoStatus: StatusDominioDb = marca.dominio ? await probeDominioHttp(marca.dominio) : "inativo";
    return { marca, novoStatus };
  });

  for (const { marca, novoStatus } of resultados) {
    verificadas += 1;
    if (novoStatus === "ok") ativas += 1;
    else inativas += 1;

    const anterior = marca.status_dominio === "ok" ? "ok" : "inativo";
    if (anterior === novoStatus) continue;

    if (dryRun) {
      atualizadas += 1;
      continue;
    }

    const { error: updErr } = await supabase
      .from("comercial_marcas")
      .update({ status_dominio: novoStatus })
      .eq("id", marca.id);

    if (updErr) {
      erros.push(`${marca.id}: ${updErr.message}`);
      continue;
    }

    await insertHistoricoDominio(supabase, marca.id, anterior, novoStatus);
    atualizadas += 1;
  }

  const duracao_ms = Date.now() - t0;
  const ok = erros.length === 0;

  if (!dryRun) {
    await gravarSyncLog(supabase, {
      status: ok ? "ok" : "falha",
      registros_inseridos: 0,
      registros_atualizados: atualizadas,
      erros_count: erros.length,
      mensagem_erro: erros.length ? erros.slice(0, 5).join(" | ") : null,
      duracao_ms,
    });
  }

  return json({
    ok,
    dry_run: dryRun,
    verificadas,
    atualizadas,
    ativas,
    inativas,
    erros: erros.slice(0, 20),
    duracao_ms,
  }, req);
});
