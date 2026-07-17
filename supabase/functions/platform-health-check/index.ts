/**
 * Edge Function: platform-health-check
 * Diagnóstico operacional (leitura + secrets) — grava entradas em tech_logs.
 * Autorização: admin ou can_editar em status_tecnico (Gestão de Usuários).
 *
 * Ficheiros no painel Supabase: `index.ts` + `platformHealthDiagnostics.ts` (mesmo nível).
 * Manter `platformHealthDiagnostics.ts` alinhado a `src/lib/platformHealthDiagnostics.ts`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildPlatformHealthTechLogs,
  countDiagnosticSummary,
  readPlatformHealthSecrets,
  TIPO_DIAGNOSTICO_RESUMO,
} from "./platformHealthDiagnostics.ts";
import type {
  PlatformHealthIntegrationSnapshot,
  PlatformHealthSnapshot,
} from "./platformHealthDiagnostics.ts";

const TZ_BR = "America/Sao_Paulo";
const MS_24H = 24 * 60 * 60 * 1000;

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: Record<string, unknown>, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function hojeIsoBrasil(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ_BR });
}

function horaAtualBrasil(): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_BR,
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return parseInt(h, 10);
}

function isoDateBrasilFromInstant(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: TZ_BR });
}

function syncLogOkNoDia(
  logs: { status: string; executado_em?: string | null }[],
  isoDia: string,
): boolean {
  return logs.some(
    (l) => l.status === "ok" && isoDateBrasilFromInstant(l.executado_em) === isoDia,
  );
}

function pipelineSucessoNoDia(
  runs: { status: string; run_date?: string; created_at?: string }[],
  isoDia: string,
): boolean {
  return runs.some(
    (r) =>
      r.status === "success" &&
      (r.run_date === isoDia || isoDateBrasilFromInstant(r.created_at) === isoDia),
  );
}

async function resolveCaller(
  supabaseUrl: string,
  anonKey: string,
  token: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string; status: number }> {
  const base = supabaseUrl.replace(/\/$/, "");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      const msg =
        (typeof parsed.msg === "string" && parsed.msg) ||
        (typeof parsed.error_description === "string" && parsed.error_description) ||
        "Sessão inválida";
      return { ok: false, error: msg, status: res.status === 403 ? 403 : 401 };
    }
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (!id) return { ok: false, error: "Sessão inválida", status: 401 };
    return { ok: true, userId: id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao validar sessão";
    return { ok: false, error: msg, status: 500 };
  } finally {
    clearTimeout(t);
  }
}

async function podeExecutarDiagnostico(
  supabase: ReturnType<typeof createClient>,
  role: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const { data } = await supabase
    .from("role_permissions")
    .select("can_editar")
    .eq("role", role)
    .eq("page_key", "status_tecnico")
    .maybeSingle();
  const ce = data?.can_editar;
  return ce === "sim" || ce === "proprios";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ ok: false, erro: "Configuração do servidor incompleta." }, req, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ ok: false, erro: "Sessão ausente. Faça login novamente." }, req, 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const whoami = await resolveCaller(supabaseUrl, anonKey, token);
  if (!whoami.ok) {
    return json({ ok: false, erro: whoami.error }, req, whoami.status);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", whoami.userId)
    .maybeSingle();

  const role = (profile?.role as string | undefined) ?? "";
  if (!(await podeExecutarDiagnostico(supabase, role))) {
    return json(
      {
        ok: false,
        erro: "Sem permissão para executar diagnóstico. Libere Editar em Status Técnico (Gestão de Usuários).",
      },
      req,
      403,
    );
  }

  const hojeIso = hojeIsoBrasil();
  // Cron CDA 4h BRT; GitHub atrasa com frequência — espelha HORARIO_AGENDADO_BR.cda no front (8h).
  const passouHorarioCda = horaAtualBrasil() >= 8;
  const passouHorarioSocial = horaAtualBrasil() >= 6;
  const desde24h = new Date(Date.now() - MS_24H).toISOString();

  const syncSelect = "integracao_slug, status, executado_em, erros_count";
  const [
    { data: integrations },
    { data: syncLogs },
    { data: syncLogsCda },
    { data: pipelineRuns },
    { data: techLogs24h },
    { data: emailEnviosHoje },
  ] = await Promise.all([
    supabase.from("integrations").select("slug, nome").eq("ativo", true),
    supabase
      .from("sync_logs")
      .select(syncSelect)
      .order("executado_em", { ascending: false })
      .limit(200),
    // Jobs horários empurram o CDA para fora do topo global — fetch dedicado.
    supabase
      .from("sync_logs")
      .select(syncSelect)
      .eq("integracao_slug", "casa_apostas")
      .order("executado_em", { ascending: false })
      .limit(30),
    supabase
      .from("pipeline_runs")
      .select("status, run_date, created_at, channel")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("tech_logs")
      .select("tipo, integracao_slug, created_at")
      .gte("created_at", desde24h),
    supabase.from("email_envios").select("tipo, data").eq("data", hojeIso).limit(50),
  ]);

  type SyncLogRow = { integracao_slug: string; status: string; executado_em: string; erros_count: number };
  const logsBySlug = new Map<string, SyncLogRow[]>();
  const pushLog = (row: SyncLogRow) => {
    const slug = row.integracao_slug;
    if (!logsBySlug.has(slug)) logsBySlug.set(slug, []);
    logsBySlug.get(slug)!.push(row);
  };
  for (const row of (syncLogs ?? []) as SyncLogRow[]) pushLog(row);
  for (const row of (syncLogsCda ?? []) as SyncLogRow[]) {
    const list = logsBySlug.get("casa_apostas") ?? [];
    const em = row.executado_em;
    if (!list.some((r) => r.executado_em === em && r.status === row.status)) pushLog(row);
  }
  for (const [, list] of logsBySlug) {
    list.sort((a, b) => b.executado_em.localeCompare(a.executado_em));
  }

  const tech24 = techLogs24h ?? [];
  const countTechTipo = (pred: (t: string) => boolean) =>
    tech24.filter((l) => pred(l.tipo as string)).length;

  const integracoes: PlatformHealthIntegrationSnapshot[] = [];

  for (const integ of integrations ?? []) {
    const slug = integ.slug as string;
    const logs = logsBySlug.get(slug) ?? [];
    const ultimo = logs[0];
    integracoes.push({
      slug,
      nome: integ.nome as string,
      integracaoSlugFk: slug,
      ultimoStatus: (ultimo?.status as "ok" | "falha") ?? null,
      ultimoEm: (ultimo?.executado_em as string) ?? null,
      okHoje: syncLogOkNoDia(logs, hojeIso),
      teveHistorico: logs.some((l) => l.status === "ok"),
      erros24h: logs.filter((l) => l.status === "falha").length,
    });
  }

  const pipeline = pipelineRuns ?? [];
  const ultimoPipeline = pipeline[0];
  integracoes.push({
    slug: "social_kpis",
    nome: "Social Media KPIs",
    integracaoSlugFk: null,
    ultimoStatus: ultimoPipeline
      ? ultimoPipeline.status === "success"
        ? "success"
        : ultimoPipeline.status === "error"
          ? "error"
          : null
      : null,
    ultimoEm: (ultimoPipeline?.created_at as string) ?? null,
    okHoje: pipelineSucessoNoDia(pipeline, hojeIso),
    teveHistorico: pipeline.some((r) => r.status === "success"),
    erros24h: pipeline.filter((r) => {
      const created = new Date(r.created_at as string).getTime();
      return r.status === "error" && created >= Date.now() - MS_24H;
    }).length,
  });

  const emailsHoje = emailEnviosHoje ?? [];
  const emailDirHoje = emailsHoje.some((e) => e.tipo === "relatorio_diretoria");
  const emailAgendaHoje = emailsHoje.some((e) => e.tipo === "email_agenda_diaria");

  integracoes.push({
    slug: "email_diretoria",
    nome: "E-mail — Relatório de Influencers",
    integracaoSlugFk: null,
    ultimoStatus: emailDirHoje ? "ok" : null,
    ultimoEm: null,
    okHoje: emailDirHoje,
    teveHistorico: countTechTipo((t) => t === "relatorio_diretoria") > 0 || emailDirHoje,
    erros24h: countTechTipo((t) => t === "relatorio_diretoria"),
  });

  integracoes.push({
    slug: "email_agenda",
    nome: "E-mail — Agenda do dia",
    integracaoSlugFk: null,
    ultimoStatus: emailAgendaHoje ? "ok" : null,
    ultimoEm: null,
    okHoje: emailAgendaHoje,
    teveHistorico: countTechTipo((t) => t === "email_agenda_diaria") > 0 || emailAgendaHoje,
    erros24h: countTechTipo((t) => t === "email_agenda_diaria"),
  });

  const snapshot: PlatformHealthSnapshot = {
    hojeIso,
    passouHorarioCda,
    passouHorarioSocial,
    secrets: readPlatformHealthSecrets((key) => Deno.env.get(key)),
    integracoes,
  };

  const rows = buildPlatformHealthTechLogs(snapshot);
  const counts = countDiagnosticSummary(rows);

  const { error: insertError } = await supabase.from("tech_logs").insert(rows);
  if (insertError) {
    console.error("[platform-health-check] insert tech_logs:", insertError);
    return json(
      {
        ok: false,
        erro: "Não foi possível gravar o diagnóstico nos logs. Tente novamente em instantes.",
      },
      req,
      500,
    );
  }

  const resumo = rows.find((r) => r.tipo === TIPO_DIAGNOSTICO_RESUMO)?.descricao ?? "Diagnóstico concluído.";

  return json({
    ok: true,
    resumo,
    inseridos: rows.length,
    okCount: counts.ok,
    avisoCount: counts.aviso,
    erroCount: counts.erro,
  }, req);
});
