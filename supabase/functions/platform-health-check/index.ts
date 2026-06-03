/**
 * Edge Function: platform-health-check
 * Diagnóstico operacional (leitura + secrets) — grava entradas em tech_logs.
 * Autorização: admin ou can_editar em status_tecnico (Gestão de Usuários).
 *
 * Deploy no painel Supabase envia só este ficheiro — lógica de diagnóstico inline abaixo.
 * Ao alterar regras, atualizar também src/lib/platformHealthDiagnostics.ts (fonte para app + Vitest).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DiagnosticSeverity = "ok" | "aviso" | "erro";

const TIPO_DIAGNOSTICO_RESUMO = "diagnostico_plataforma";
const TIPO_DIAGNOSTICO_OK = "diagnostico_ok";
const TIPO_DIAGNOSTICO_AVISO = "diagnostico_aviso";
const TIPO_DIAGNOSTICO_ERRO = "diagnostico_erro";

interface TechLogInsertRow {
  integracao_slug: string | null;
  tipo: string;
  descricao: string;
}

interface PlatformHealthSecretsSnapshot {
  cdaConfigurado: boolean;
  githubSocialConfigurado: boolean;
  resendConfigurado: boolean;
}

interface PlatformHealthIntegrationSnapshot {
  slug: string | null;
  nome: string;
  integracaoSlugFk: string | null;
  ultimoStatus: "ok" | "falha" | "success" | "error" | null;
  ultimoEm: string | null;
  okHoje: boolean;
  teveHistorico: boolean;
  erros24h: number;
}

interface PlatformHealthSnapshot {
  hojeIso: string;
  passouHorarioCda: boolean;
  passouHorarioSocial: boolean;
  secrets: PlatformHealthSecretsSnapshot;
  integracoes: PlatformHealthIntegrationSnapshot[];
}

function tipoPorSeveridade(s: DiagnosticSeverity): string {
  if (s === "ok") return TIPO_DIAGNOSTICO_OK;
  if (s === "aviso") return TIPO_DIAGNOSTICO_AVISO;
  return TIPO_DIAGNOSTICO_ERRO;
}

function pushProbe(
  out: TechLogInsertRow[],
  probe: {
    nome: string;
    severidade: DiagnosticSeverity;
    descricao: string;
    integracaoSlugFk: string | null;
  },
): void {
  out.push({
    integracao_slug: probe.integracaoSlugFk,
    tipo: tipoPorSeveridade(probe.severidade),
    descricao: `${probe.nome}: ${probe.descricao}`.slice(0, 2000),
  });
}

function buildPlatformHealthTechLogs(snapshot: PlatformHealthSnapshot): TechLogInsertRow[] {
  const out: TechLogInsertRow[] = [];
  let ok = 0;
  let aviso = 0;
  let erro = 0;

  if (!snapshot.secrets.cdaConfigurado) {
    pushProbe(out, {
      nome: "Configuração CDA",
      severidade: "erro",
      descricao: "Credencial da API CDA não configurada nos secrets do projeto.",
      integracaoSlugFk: "casa_apostas",
    });
    erro++;
  } else {
    pushProbe(out, {
      nome: "Configuração CDA",
      severidade: "ok",
      descricao: "Credencial ou modo Reporting API presente.",
      integracaoSlugFk: "casa_apostas",
    });
    ok++;
  }

  if (!snapshot.secrets.githubSocialConfigurado) {
    pushProbe(out, {
      nome: "Configuração Social Media",
      severidade: "aviso",
      descricao: "Token ou repositório GitHub ausente — sync social manual pode falhar.",
      integracaoSlugFk: null,
    });
    aviso++;
  } else {
    pushProbe(out, {
      nome: "Configuração Social Media",
      severidade: "ok",
      descricao: "Secrets do disparo de workflow configurados.",
      integracaoSlugFk: null,
    });
    ok++;
  }

  if (!snapshot.secrets.resendConfigurado) {
    pushProbe(out, {
      nome: "Configuração e-mail (Resend)",
      severidade: "aviso",
      descricao: "Chave Resend ausente — relatório e agenda por e-mail podem falhar.",
      integracaoSlugFk: null,
    });
    aviso++;
  } else {
    pushProbe(out, {
      nome: "Configuração e-mail (Resend)",
      severidade: "ok",
      descricao: "Chave Resend configurada.",
      integracaoSlugFk: null,
    });
    ok++;
  }

  for (const integ of snapshot.integracoes) {
    let severidade: DiagnosticSeverity = "ok";
    let detalhe = "Última execução dentro do esperado.";

    if (!integ.teveHistorico && !integ.ultimoEm) {
      severidade = "aviso";
      detalhe = "Sem histórico de execução registrado.";
    } else if (integ.ultimoStatus === "falha" || integ.ultimoStatus === "error") {
      severidade = "erro";
      detalhe = "Última execução com falha.";
    } else if (integ.erros24h > 0) {
      severidade = "aviso";
      detalhe = `${integ.erros24h} ocorrência(s) de erro nas últimas 24 horas.`;
    } else if (integ.teveHistorico && !integ.okHoje) {
      const atraso =
        integ.nome.includes("CDA") && snapshot.passouHorarioCda
          ? "Job diário (4h BRT) ainda não registrou sucesso hoje."
          : (integ.nome.includes("Social") || integ.nome.includes("RSS") || integ.nome.includes("E-mail")) &&
              snapshot.passouHorarioSocial
            ? "Job agendado (6h BRT) ainda não registrou sucesso hoje."
            : "Sem sucesso registrado na data civil de hoje.";
      severidade = "aviso";
      detalhe = atraso;
    }

    if (severidade === "ok") ok++;
    else if (severidade === "aviso") aviso++;
    else erro++;

    pushProbe(out, {
      nome: integ.nome,
      severidade,
      descricao: detalhe,
      integracaoSlugFk: integ.integracaoSlugFk,
    });
  }

  const resumo =
    erro > 0
      ? `Diagnóstico manual concluído: ${erro} falha(s), ${aviso} atenção(ões), ${ok} OK. Revise as linhas abaixo.`
      : aviso > 0
        ? `Diagnóstico manual concluído: ${ok} OK, ${aviso} atenção(ões). Nenhuma falha crítica.`
        : `Diagnóstico manual concluído: ${ok} verificação(ões) OK. Nenhuma falha ou atenção.`;

  out.unshift({
    integracao_slug: null,
    tipo: TIPO_DIAGNOSTICO_RESUMO,
    descricao: resumo.slice(0, 2000),
  });

  return out;
}

function countDiagnosticSummary(logs: TechLogInsertRow[]): {
  ok: number;
  aviso: number;
  erro: number;
} {
  let ok = 0;
  let aviso = 0;
  let erro = 0;
  for (const l of logs) {
    if (l.tipo === TIPO_DIAGNOSTICO_OK) ok++;
    else if (l.tipo === TIPO_DIAGNOSTICO_AVISO) aviso++;
    else if (l.tipo === TIPO_DIAGNOSTICO_ERRO) erro++;
  }
  return { ok, aviso, erro };
}

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
  const passouHorarioCda = horaAtualBrasil() >= 4;
  const passouHorarioSocial = horaAtualBrasil() >= 6;
  const desde24h = new Date(Date.now() - MS_24H).toISOString();

  const [
    { data: integrations },
    { data: syncLogs },
    { data: pipelineRuns },
    { data: techLogs24h },
    { data: emailEnviosHoje },
  ] = await Promise.all([
    supabase.from("integrations").select("slug, nome").eq("ativo", true),
    supabase
      .from("sync_logs")
      .select("integracao_slug, status, executado_em, erros_count")
      .order("executado_em", { ascending: false })
      .limit(200),
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

  const logsBySlug = new Map<string, typeof syncLogs>();
  for (const row of syncLogs ?? []) {
    const slug = row.integracao_slug as string;
    if (!logsBySlug.has(slug)) logsBySlug.set(slug, []);
    logsBySlug.get(slug)!.push(row);
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

  const cdaConfigured = !!(
    Deno.env.get("CDA_INFLUENCERS_API_KEY")?.trim() ||
    Deno.env.get("CDA_USE_REPORTING_API")?.trim() === "true"
  );
  const githubOk = !!(Deno.env.get("GITHUB_TOKEN")?.trim() && Deno.env.get("GITHUB_REPO")?.trim());
  const resendOk = !!Deno.env.get("RESEND_API_KEY")?.trim();

  const snapshot: PlatformHealthSnapshot = {
    hojeIso,
    passouHorarioCda,
    passouHorarioSocial,
    secrets: {
      cdaConfigurado: cdaConfigured,
      githubSocialConfigurado: githubOk,
      resendConfigurado: resendOk,
    },
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

  const resumo = rows.find((r) => r.tipo === "diagnostico_plataforma")?.descricao ?? "Diagnóstico concluído.";

  return json({
    ok: true,
    resumo,
    inseridos: rows.length,
    okCount: counts.ok,
    avisoCount: counts.aviso,
    erroCount: counts.erro,
  }, req);
});
