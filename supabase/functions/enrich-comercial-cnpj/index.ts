import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: enrich-comercial-cnpj
 * Enriquece comercial_empresas com cidade/UF da sede (Brasil API, cadastro Receita).
 * Marcas herdam via empresa_id — não grava em comercial_marcas.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * POST JSON: { dry_run?: boolean, limit?: number, force?: boolean }
 *
 * Deploy no painel Supabase: um único ficheiro index.ts (sem imports locais).
 * Parser espelhado em src/lib/comercialCnpjEnrichment.ts para testes locais.
 */

const INTEGRACAO_SLUG = "comercial_cnpj_enriquecimento";
const DEFAULT_LIMIT = 80;
const FETCH_CONCURRENCY = 2;
const FETCH_DELAY_MS = 450;
const BRASIL_API_CNPJ_BASE = "https://brasilapi.com.br/api/cnpj/v1";

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

function cnpjSomenteDigitos(cnpj: string): string | null {
  const d = cnpj.replace(/\D/g, "");
  return d.length === 14 ? d : null;
}

function parseBrasilApiCnpjLocalidade(
  payload: unknown,
): { cidade: string; estado: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const cidade = String(o.municipio ?? "").trim();
  const estado = String(o.uf ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!cidade || estado.length !== 2) return null;
  return { cidade, estado };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= items.length) break;
      if (idx > 0) await sleep(FETCH_DELAY_MS);
      results[idx] = await fn(items[idx], idx);
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
    console.error("[enrich-comercial-cnpj] Falha ao gravar sync_logs:", e);
  }
}

interface EmpresaRow {
  id: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
}

async function fetchLocalidadeBrasilApi(cnpjDigits: string): Promise<
  | { ok: true; cidade: string; estado: string }
  | { ok: false; erro: string }
> {
  const url = `${BRASIL_API_CNPJ_BASE}/${cnpjDigits}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "SpinGaming-DataIntelligence/1.0 (enrich-comercial-cnpj)",
      },
    });
    if (res.status === 404) {
      return { ok: false, erro: "CNPJ não encontrado na base consultada" };
    }
    if (!res.ok) {
      return { ok: false, erro: `Brasil API HTTP ${res.status}` };
    }
    const payload = await res.json();
    const parsed = parseBrasilApiCnpjLocalidade(payload);
    if (!parsed) {
      return { ok: false, erro: "Resposta sem município/UF válidos" };
    }
    return { ok: true, cidade: parsed.cidade, estado: parsed.estado };
  } catch (e) {
    return { ok: false, erro: String((e as Error)?.message ?? e) };
  }
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

  let body: { dry_run?: boolean; limit?: number; force?: boolean } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return json({ ok: false, erro: "Body JSON inválido" }, req, 400);
  }

  const dryRun = body.dry_run === true;
  const force = body.force === true;
  const limit = Math.min(Math.max(1, body.limit ?? DEFAULT_LIMIT), 500);
  const t0 = Date.now();
  const supabase = createClient(supabaseUrl, serviceKey, supabaseServiceOptions);
  const erros: string[] = [];

  let query = supabase
    .from("comercial_empresas")
    .select("id, cnpj, cidade, estado")
    .order("cnpj_enriquecido_em", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (!force) {
    query = query.is("cnpj_enriquecido_em", null);
  }

  const { data: empresasRaw, error: selErr } = await query;

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

  const empresas = (empresasRaw ?? []) as EmpresaRow[];
  let consultadas = 0;
  let atualizadas = 0;
  let semAlteracao = 0;
  let falhas = 0;

  const resultados = await mapWithConcurrency(empresas, FETCH_CONCURRENCY, async (emp) => {
    const digits = cnpjSomenteDigitos(emp.cnpj);
    if (!digits) {
      return { emp, tipo: "erro" as const, msg: `CNPJ inválido: ${emp.cnpj}` };
    }
    const res = await fetchLocalidadeBrasilApi(digits);
    consultadas += 1;
    if (!res.ok) {
      return { emp, tipo: "erro" as const, msg: `${emp.cnpj}: ${res.erro}` };
    }
    const mudou = emp.cidade !== res.cidade || emp.estado !== res.estado;
    if (!mudou && !force) {
      return { emp, tipo: "igual" as const, cidade: res.cidade, estado: res.estado };
    }
    return { emp, tipo: "ok" as const, cidade: res.cidade, estado: res.estado, mudou };
  });

  for (const r of resultados) {
    if (r.tipo === "erro") {
      falhas += 1;
      erros.push(r.msg);
      continue;
    }

    const cidade = r.cidade;
    const estado = r.estado;
    const now = new Date().toISOString();

    if (r.tipo === "igual") {
      if (!dryRun) {
        await supabase
          .from("comercial_empresas")
          .update({ cnpj_enriquecido_em: now })
          .eq("id", r.emp.id);
      }
      semAlteracao += 1;
      continue;
    }

    if (dryRun) {
      atualizadas += 1;
      continue;
    }

    const { error: updErr } = await supabase
      .from("comercial_empresas")
      .update({
        cidade,
        estado,
        cnpj_enriquecido_em: now,
      })
      .eq("id", r.emp.id);

    if (updErr) {
      falhas += 1;
      erros.push(`${r.emp.cnpj}: ${updErr.message}`);
    } else {
      atualizadas += 1;
    }
  }

  const duracao_ms = Date.now() - t0;
  const status = falhas > 0 && atualizadas === 0 && semAlteracao === 0 ? "falha" : "ok";

  if (!dryRun) {
    await gravarSyncLog(supabase, {
      status,
      registros_inseridos: 0,
      registros_atualizados: atualizadas + semAlteracao,
      erros_count: falhas,
      mensagem_erro: erros.length ? erros.slice(0, 5).join(" | ") : null,
      duracao_ms,
    });
  }

  return json(
    {
      ok: status === "ok",
      dry_run: dryRun,
      force,
      empresas_selecionadas: empresas.length,
      consultadas,
      atualizadas,
      sem_alteracao: semAlteracao,
      falhas,
      erros: erros.slice(0, 20),
      duracao_ms,
    },
    req,
    status === "ok" ? 200 : 500,
  );
});
