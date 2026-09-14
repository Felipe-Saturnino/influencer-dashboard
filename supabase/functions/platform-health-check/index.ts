/**
 * Edge Function: platform-health-check
 * Diagnóstico operacional da plataforma — secrets, jobs, smoke de Edge, pings vivos.
 * Não dispara sync nem e-mails. Grava só resumo + avisos/falhas em tech_logs.
 *
 * Ficheiros no painel Supabase: `index.ts` + `platformHealthDiagnostics.ts` (mesmo nível).
 * Manter `platformHealthDiagnostics.ts` alinhado a `src/lib/platformHealthDiagnostics.ts`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildPlatformHealthTechLogs,
  classificarHttpSmoke,
  countDiagnosticSummary,
  DIAGNOSTICO_BRASIL_API_CNPJ_PING,
  DIAGNOSTICO_BUDGET_MS,
  DIAGNOSTICO_CONCURRENCY,
  DIAGNOSTICO_CRON_JOBS,
  DIAGNOSTICO_EDGE_FUNCTIONS,
  DIAGNOSTICO_HORARIO_CORTE,
  DIAGNOSTICO_LOBBY_OPERADORAS,
  DIAGNOSTICO_OPTIONS_TIMEOUT_MS,
  DIAGNOSTICO_PING_TIMEOUT_MS,
  DIAGNOSTICO_SPA_LISTA_URL,
  DIAGNOSTICO_STORAGE_BUCKETS,
  DIAGNOSTICO_SYNC_SLUGS,
  githubRepoPath,
  jobKindFromSlug,
  primeiraUrlDeLista,
  readPlatformHealthSecrets,
  techLogsParaGravar,
  TIPO_DIAGNOSTICO_RESUMO,
} from "./platformHealthDiagnostics.ts";
import type {
  PlatformHealthExtraProbe,
  PlatformHealthIntegrationSnapshot,
  PlatformHealthSnapshot,
} from "./platformHealthDiagnostics.ts";

const TZ_BR = "America/Sao_Paulo";
const MS_24H = 24 * 60 * 60 * 1000;

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

const LOBBY_SECRET_POR_SLUG: Array<{ slug: string; nome: string; secret: string }> = [
  { slug: "lobby_blaze", nome: "Lobby Blaze", secret: "MONITOR_LOBBY_BLAZE_INGEST_SECRET" },
  { slug: "lobby_cda", nome: "Lobby CDA", secret: "MONITOR_LOBBY_CDA_INGEST_SECRET" },
  { slug: "lobby_esportiva", nome: "Lobby Esportiva Bet", secret: "MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET" },
  { slug: "lobby_jonbet", nome: "Lobby Jonbet", secret: "MONITOR_LOBBY_JONBET_INGEST_SECRET" },
  { slug: "lobby_bateu", nome: "Lobby Bateu Bet", secret: "MONITOR_LOBBY_BATEU_INGEST_SECRET" },
  { slug: "lobby_rico", nome: "Lobby Rico Bet", secret: "MONITOR_LOBBY_RICO_INGEST_SECRET" },
  { slug: "lobby_brx", nome: "Lobby BRX Bet", secret: "MONITOR_LOBBY_BRX_INGEST_SECRET" },
  { slug: "lobby_donald", nome: "Lobby Donald Bet", secret: "MONITOR_LOBBY_DONALD_INGEST_SECRET" },
  { slug: "lobby_betponto", nome: "Lobby BetPontoBet", secret: "MONITOR_LOBBY_BETPONTO_INGEST_SECRET" },
];

const LOBBY_OPERADORA_POR_SLUG: Record<string, string> = {
  lobby_blaze: "blaze",
  lobby_cda: "casa_apostas",
  lobby_esportiva: "esportiva_bet",
  lobby_jonbet: "jonbet",
  lobby_bateu: "bateu_bet",
  lobby_rico: "rico_bet",
  lobby_brx: "brx_bet",
  lobby_donald: "donald_bet",
  lobby_betponto: "betponto_bet",
};

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

function subDiaIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
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

function extra(
  nome: string,
  severidade: PlatformHealthExtraProbe["severidade"],
  descricao: string,
  integracaoSlugFk: string | null = null,
): PlatformHealthExtraProbe {
  return { nome, severidade, descricao, integracaoSlugFk };
}

async function fetchTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<{ res: Response | null; aborted: boolean }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, aborted: false };
  } catch (e) {
    const aborted = e instanceof Error && (e.name === "AbortError" || /abort/i.test(e.message));
    return { res: null, aborted };
  } finally {
    clearTimeout(t);
  }
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  budgetStart: number,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      if (Date.now() - budgetStart > DIAGNOSTICO_BUDGET_MS) break;
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
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

type SyncLogRow = {
  integracao_slug: string;
  status: string;
  executado_em: string;
  erros_count: number;
};

type LobbyExecRow = {
  operadora_slug: string;
  executado_em: string;
  status: string;
  mesas_encontradas: number;
};

function taxaErroLogs(logs: SyncLogRow[]): number | null {
  if (logs.length === 0) return null;
  const falhas = logs.filter((l) => l.status === "falha").length;
  return (falhas / logs.length) * 100;
}

function lobbyTemColetaOk(slug: string, logs: SyncLogRow[], execs: LobbyExecRow[]): boolean {
  if (logs.some((l) => l.status === "ok")) return true;
  const op = LOBBY_OPERADORA_POR_SLUG[slug];
  if (!op) return false;
  return execs.some(
    (e) =>
      e.operadora_slug === op &&
      (e.status === "ok" || e.status === "parcial") &&
      e.mesas_encontradas > 0,
  );
}

function ultimoOkLobbyEm(slug: string, logs: SyncLogRow[], execs: LobbyExecRow[]): string | null {
  const op = LOBBY_OPERADORA_POR_SLUG[slug];
  const candidatos: string[] = [];
  const logOk = logs.find((l) => l.status === "ok");
  if (logOk?.executado_em) candidatos.push(logOk.executado_em);
  if (op) {
    const exec = execs.find(
      (e) =>
        e.operadora_slug === op &&
        (e.status === "ok" || e.status === "parcial") &&
        e.mesas_encontradas > 0,
    );
    if (exec?.executado_em) candidatos.push(exec.executado_em);
  }
  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.localeCompare(a))[0] ?? null;
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

  const budgetStart = Date.now();
  const hojeIso = hojeIsoBrasil();
  const ontemIso = subDiaIso(hojeIso);
  const hora = horaAtualBrasil();
  const passouHorarioCda = hora >= DIAGNOSTICO_HORARIO_CORTE.cda;
  const passouHorarioSocial = hora >= DIAGNOSTICO_HORARIO_CORTE.social;
  const passouHorarioComercialSpa = hora >= DIAGNOSTICO_HORARIO_CORTE.comercialSpa;
  const passouHorarioComercialDominio = hora >= DIAGNOSTICO_HORARIO_CORTE.comercialDominio;
  const passouHorarioComercialCnpj = hora >= DIAGNOSTICO_HORARIO_CORTE.comercialCnpj;
  const desde24h = new Date(Date.now() - MS_24H).toISOString();
  const envGet = (key: string) => Deno.env.get(key);

  const extras: PlatformHealthExtraProbe[] = [];
  const secrets = readPlatformHealthSecrets(envGet);

  extras.push(
    extra(
      "Supabase Auth",
      "ok",
      "Sessão validada e permissão de Editar confirmada.",
    ),
  );

  const syncSelect = "integracao_slug, status, executado_em, erros_count";
  const slugFetches = DIAGNOSTICO_SYNC_SLUGS.map((slug) =>
    supabase
      .from("sync_logs")
      .select(syncSelect)
      .eq("integracao_slug", slug)
      .order("executado_em", { ascending: false })
      .limit(40),
  );

  const [
    integrationsRes,
    lobbyExecRes,
    pipelineRes,
    techLogsRes,
    emailEnviosRes,
    cidrRes,
    metricasOntemRes,
    postgrestRes,
    ...slugSyncRes
  ] = await Promise.all([
    supabase.from("integrations").select("slug, nome, ativo"),
    supabase
      .from("lobby_monitor_execucao")
      .select("operadora_slug, executado_em, status, mesas_encontradas")
      .in("operadora_slug", [...DIAGNOSTICO_LOBBY_OPERADORAS])
      .order("executado_em", { ascending: false })
      .limit(400),
    supabase
      .from("pipeline_runs")
      .select("status, run_date, created_at, channel")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("tech_logs").select("tipo, integracao_slug, created_at").gte("created_at", desde24h),
    supabase.from("email_envios").select("tipo, data").eq("data", hojeIso).limit(50),
    supabase.from("prestador_ponto_cidr_allowlist").select("id", { count: "exact", head: true }),
    supabase
      .from("influencer_metricas")
      .select("id", { count: "exact", head: true })
      .eq("data", ontemIso),
    supabase.from("integrations").select("slug").limit(1),
    ...slugFetches,
  ]);

  if (postgrestRes.error) {
    extras.push(
      extra(
        "Supabase PostgREST",
        "erro",
        "Não foi possível ler a tabela de integrações. Verifique a API do projeto.",
      ),
    );
  } else {
    extras.push(extra("Supabase PostgREST", "ok", "Leitura da API do projeto OK."));
  }

  const logsBySlug = new Map<string, SyncLogRow[]>();
  for (const res of slugSyncRes) {
    for (const row of (res.data ?? []) as SyncLogRow[]) {
      const list = logsBySlug.get(row.integracao_slug) ?? [];
      list.push(row);
      logsBySlug.set(row.integracao_slug, list);
    }
  }
  for (const [, list] of logsBySlug) {
    list.sort((a, b) => b.executado_em.localeCompare(a.executado_em));
  }

  const lobbyExecucoes = (lobbyExecRes.data ?? []) as LobbyExecRow[];
  const integrationsRows = (integrationsRes.data ?? []) as Array<{
    slug: string;
    nome: string;
    ativo: boolean;
  }>;
  const ativos = integrationsRows.filter((i) => i.ativo !== false);

  const integracoes: PlatformHealthIntegrationSnapshot[] = [];

  for (const integ of ativos) {
    const slug = integ.slug;
    const logs = logsBySlug.get(slug) ?? [];
    const ultimo = logs[0];
    const kind = jobKindFromSlug(slug);
    let ultimoStatus = (ultimo?.status as "ok" | "falha") ?? null;
    let ultimoEm = ultimo?.executado_em ?? null;
    let okHoje = syncLogOkNoDia(logs, hojeIso);
    let teveHistorico = logs.some((l) => l.status === "ok");
    let atrasoLobby24h = false;

    if (kind === "lobby") {
      const coletaOk = lobbyTemColetaOk(slug, logs, lobbyExecucoes);
      if (coletaOk) {
        teveHistorico = true;
        const ultimoOk = ultimoOkLobbyEm(slug, logs, lobbyExecucoes);
        if (ultimoOk) {
          ultimoEm = ultimoOk;
          if (isoDateBrasilFromInstant(ultimoOk) === hojeIso) okHoje = true;
          if (new Date(ultimoOk).getTime() < Date.now() - MS_24H) atrasoLobby24h = true;
          if (ultimoStatus === "falha" && coletaOk) ultimoStatus = "ok";
        }
      }
    }

    integracoes.push({
      slug,
      nome: integ.nome,
      integracaoSlugFk: slug,
      ultimoStatus,
      ultimoEm,
      okHoje,
      teveHistorico,
      erros24h: logs.filter((l) => l.status === "falha").length,
      taxaErroPct: taxaErroLogs(logs),
      atrasoLobby24h,
      jobKind: kind,
    });
  }

  const slugsAtivos = new Set(ativos.map((i) => i.slug));
  for (const slug of DIAGNOSTICO_SYNC_SLUGS) {
    if (slugsAtivos.has(slug)) continue;
    if (integracoes.some((i) => i.slug === slug)) continue;
    const logs = logsBySlug.get(slug) ?? [];
    const kind = jobKindFromSlug(slug);
    const nomeFallback =
      slug === "painel_noticias_rss"
        ? "Painel de Notícias (RSS)"
        : slug === "cs_atendimento_outlook"
          ? "CS - Caixa de Contato (Outlook)"
          : slug;
    let atrasoLobby24h = false;
    let okHoje = syncLogOkNoDia(logs, hojeIso);
    let teveHistorico = logs.some((l) => l.status === "ok");
    let ultimoStatus = (logs[0]?.status as "ok" | "falha") ?? null;
    let ultimoEm = logs[0]?.executado_em ?? null;
    if (kind === "lobby") {
      const coletaOk = lobbyTemColetaOk(slug, logs, lobbyExecucoes);
      if (coletaOk) {
        teveHistorico = true;
        const ultimoOk = ultimoOkLobbyEm(slug, logs, lobbyExecucoes);
        if (ultimoOk) {
          ultimoEm = ultimoOk;
          if (isoDateBrasilFromInstant(ultimoOk) === hojeIso) okHoje = true;
          if (new Date(ultimoOk).getTime() < Date.now() - MS_24H) atrasoLobby24h = true;
          if (ultimoStatus === "falha") ultimoStatus = "ok";
        }
      }
    }
    integracoes.push({
      slug,
      nome: nomeFallback,
      integracaoSlugFk: slug,
      ultimoStatus,
      ultimoEm,
      okHoje,
      teveHistorico,
      erros24h: logs.filter((l) => l.status === "falha").length,
      taxaErroPct: taxaErroLogs(logs),
      atrasoLobby24h,
      jobKind: kind,
    });
    extras.push(
      extra(
        `Catálogo — ${nomeFallback}`,
        "aviso",
        "Slug esperado sem linha ativa em integrações. A página usa fallback de logs.",
        slug,
      ),
    );
  }

  const pipeline = pipelineRes.data ?? [];
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
    jobKind: "social",
  });

  const tech24 = techLogsRes.data ?? [];
  const countTechTipo = (pred: (t: string) => boolean) =>
    tech24.filter((l) => pred(l.tipo as string)).length;
  const emailsHoje = emailEnviosRes.data ?? [];
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
    jobKind: "email",
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
    jobKind: "email",
  });

  if (cidrRes.error) {
    extras.push(extra("Redes permitidas (CIDR)", "aviso", "Não foi possível conferir os prefixos de check-in."));
  } else if ((cidrRes.count ?? 0) === 0) {
    extras.push(
      extra(
        "Redes permitidas (CIDR)",
        "aviso",
        "Nenhum prefixo configurado — o check-in de prestadores fica bloqueado.",
      ),
    );
  } else {
    extras.push(
      extra("Redes permitidas (CIDR)", "ok", `${cidrRes.count} prefixo(s) autorizado(s).`),
    );
  }

  if (passouHorarioCda) {
    const nMetricas = metricasOntemRes.count ?? 0;
    if (!metricasOntemRes.error && nMetricas === 0) {
      extras.push(
        extra(
          "CDA — métricas D-1",
          "aviso",
          "Nenhuma métrica de influencer com data de ontem (o sync grava D-1).",
          "casa_apostas",
        ),
      );
    } else if (!metricasOntemRes.error) {
      extras.push(
        extra(
          "CDA — métricas D-1",
          "ok",
          `Há registros de métricas com data de ontem.`,
          "casa_apostas",
        ),
      );
    }
  }

  try {
    const { data: buckets, error: buckErr } = await supabase.storage.listBuckets();
    if (buckErr) {
      extras.push(extra("Supabase Storage", "aviso", "Não foi possível listar os buckets."));
    } else {
      const nomes = new Set((buckets ?? []).map((b) => b.name));
      const faltando = DIAGNOSTICO_STORAGE_BUCKETS.filter((n) => !nomes.has(n));
      if (faltando.length > 0) {
        extras.push(
          extra(
            "Supabase Storage",
            "aviso",
            `Bucket(s) ausente(s): ${faltando.join(", ")}.`,
          ),
        );
      } else {
        extras.push(extra("Supabase Storage", "ok", "Buckets essenciais presentes."));
      }
    }
  } catch {
    extras.push(extra("Supabase Storage", "aviso", "Falha ao listar buckets."));
  }

  try {
    const cronDb = supabase as unknown as {
      schema: (s: string) => {
        from: (t: string) => {
          select: (c: string) => Promise<{ data: Array<{ jobname: string; active: boolean }> | null; error: unknown }>;
        };
      };
    };
    const cronRes = await cronDb.schema("cron").from("job").select("jobname,active");
    if (cronRes.error || !cronRes.data) {
      extras.push(
        extra(
          "pg_cron",
          "aviso",
          "Não foi possível ler os jobs agendados (schema cron). Confira a extensão no projeto.",
        ),
      );
    } else {
      const ativosCron = new Set(
        cronRes.data.filter((j) => j.active !== false).map((j) => j.jobname),
      );
      const faltando = DIAGNOSTICO_CRON_JOBS.filter((n) => !ativosCron.has(n));
      if (faltando.length > 0) {
        extras.push(
          extra(
            "pg_cron",
            "aviso",
            `Job(s) ausente(s) ou inativo(s): ${faltando.join(", ")}.`,
          ),
        );
      } else {
        extras.push(extra("pg_cron", "ok", "Jobs diários esperados estão ativos."));
      }
    }
  } catch {
    extras.push(
      extra("pg_cron", "aviso", "Não foi possível ler os jobs agendados (schema cron)."),
    );
  }

  const functionsBase = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
  const smokeResults = await mapPool(
    DIAGNOSTICO_EDGE_FUNCTIONS,
    DIAGNOSTICO_CONCURRENCY,
    async (name) => {
      if (Date.now() - budgetStart > DIAGNOSTICO_BUDGET_MS) {
        return extra(`Edge ${name}`, "aviso", "Não deu tempo de verificar nesta execução.");
      }
      const { res, aborted } = await fetchTimeout(
        `${functionsBase}/${name}`,
        {
          method: "OPTIONS",
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        },
        DIAGNOSTICO_OPTIONS_TIMEOUT_MS,
      );
      const cls = classificarHttpSmoke(res?.status ?? 0, aborted || !res);
      const sev = cls.severidade === "ok" ? "ok" : cls.severidade;
      const detalhe =
        cls.severidade === "ok"
          ? "Function respondeu ao smoke OPTIONS."
          : cls.detalhe;
      return extra(`Edge ${name}`, sev, detalhe);
    },
    budgetStart,
  );
  for (const row of smokeResults) {
    if (row) extras.push(row);
  }
  const semTempo = DIAGNOSTICO_EDGE_FUNCTIONS.length - smokeResults.filter(Boolean).length;
  if (semTempo > 0) {
    extras.push(
      extra(
        "Smoke Edge Functions",
        "aviso",
        `${semTempo} função(ões) não verificada(s) — orçamento de tempo esgotado.`,
      ),
    );
  }

  if (secrets.resendApiKeyConfigurado) {
    const { res, aborted } = await fetchTimeout(
      "https://api.resend.com/domains",
      { headers: { Authorization: `Bearer ${envGet("RESEND_API_KEY") ?? ""}` } },
      DIAGNOSTICO_PING_TIMEOUT_MS,
    );
    const cls = classificarHttpSmoke(res?.status ?? 0, aborted || !res);
    extras.push(
      extra(
        "Resend — API",
        cls.severidade,
        cls.severidade === "ok"
          ? "API Key aceita e endpoint de domínios acessível."
          : `Ping em api.resend.com/domains: ${cls.detalhe}`,
      ),
    );
  }

  if (secrets.githubSocialConfigurado) {
    const repo = githubRepoPath(envGet("GITHUB_REPO"));
    const ghToken = envGet("GITHUB_TOKEN") ?? "";
    if (repo) {
      const { res, aborted } = await fetchTimeout(
        `https://api.github.com/repos/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "spin-platform-health-check",
          },
        },
        DIAGNOSTICO_PING_TIMEOUT_MS,
      );
      const cls = classificarHttpSmoke(res?.status ?? 0, aborted || !res);
      extras.push(
        extra(
          "GitHub — repositório Social",
          cls.severidade,
          cls.severidade === "ok" ? `Repositório ${repo} acessível.` : cls.detalhe,
        ),
      );
    } else {
      extras.push(
        extra("GitHub — repositório Social", "aviso", "GITHUB_REPO não está no formato owner/repo."),
      );
    }
  }

  const tenant = envGet("CS_OUTLOOK_TENANT_ID")?.trim() ?? "";
  const clientId = envGet("CS_OUTLOOK_CLIENT_ID")?.trim() ?? "";
  const clientSecret = envGet("CS_OUTLOOK_CLIENT_SECRET")?.trim() ?? "";
  const mailbox = (envGet("CS_OUTLOOK_MAILBOX") ?? "contato@spingaming.com.br").trim();
  if (!tenant || !clientId || !clientSecret) {
    extras.push(
      extra(
        "Microsoft Graph (Outlook CS)",
        "erro",
        "Secrets CS_OUTLOOK_TENANT_ID / CLIENT_ID / CLIENT_SECRET incompletos.",
        "cs_atendimento_outlook",
      ),
    );
  } else if (Date.now() - budgetStart < DIAGNOSTICO_BUDGET_MS) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const { res: tokenRes, aborted } = await fetchTimeout(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body },
      DIAGNOSTICO_PING_TIMEOUT_MS,
    );
    if (aborted || !tokenRes) {
      extras.push(
        extra("Microsoft Graph (Outlook CS)", "aviso", "Tempo esgotado ao pedir token Azure.", "cs_atendimento_outlook"),
      );
    } else if (!tokenRes.ok) {
      extras.push(
        extra(
          "Microsoft Graph (Outlook CS)",
          "erro",
          `Token Azure recusado (HTTP ${tokenRes.status}).`,
          "cs_atendimento_outlook",
        ),
      );
    } else {
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      const access = tokenJson.access_token ?? "";
      if (!access) {
        extras.push(
          extra("Microsoft Graph (Outlook CS)", "erro", "Token Azure sem access_token.", "cs_atendimento_outlook"),
        );
      } else {
        const user = encodeURIComponent(mailbox);
        const { res: inboxRes, aborted: inboxAbort } = await fetchTimeout(
          `https://graph.microsoft.com/v1.0/users/${user}/mailFolders/Inbox/messages?$select=id&$top=1`,
          { headers: { Authorization: `Bearer ${access}` } },
          DIAGNOSTICO_PING_TIMEOUT_MS,
        );
        const cls = classificarHttpSmoke(inboxRes?.status ?? 0, inboxAbort || !inboxRes);
        extras.push(
          extra(
            "Microsoft Graph (Outlook CS)",
            cls.severidade,
            cls.severidade === "ok" ? `Inbox de ${mailbox} acessível.` : cls.detalhe,
            "cs_atendimento_outlook",
          ),
        );
      }
    }
  }

  const cdaKey = envGet("CDA_INFLUENCERS_API_KEY")?.trim() ?? "";
  const cdaAfilKey = envGet("CDA_AFILIADOS_API_KEY")?.trim() ?? "";
  const reportingBase = (envGet("SMARTICO_REPORTING_API_URL") ?? "https://boapi3.smartico.ai").replace(/\/$/, "");
  const authFormat = (envGet("CDA_AUTH_FORMAT") ?? "Bearer").toLowerCase() === "direct" ? "direct" : "Bearer";
  const pingCda = async (label: string, apiKey: string, slug: string) => {
    if (!apiKey) return;
    if (Date.now() - budgetStart > DIAGNOSTICO_BUDGET_MS) {
      extras.push(extra(label, "aviso", "Não deu tempo de pingar a Reporting API nesta execução.", slug));
      return;
    }
    const params = new URLSearchParams({
      aggregation_period: "DAY",
      group_by: "utm_source",
      date_from: ontemIso,
      date_to: hojeIso,
    });
    const authHeaderCda = authFormat === "direct" ? apiKey : `Bearer ${apiKey}`;
    const { res, aborted } = await fetchTimeout(
      `${reportingBase}/api/af2_media_report_af?${params}`,
      { headers: { authorization: authHeaderCda } },
      DIAGNOSTICO_PING_TIMEOUT_MS,
    );
    const cls = classificarHttpSmoke(res?.status ?? 0, aborted || !res);
    extras.push(
      extra(
        label,
        cls.severidade,
        cls.severidade === "ok" ? "Reporting API respondeu (sem gravar métricas)." : cls.detalhe,
        slug,
      ),
    );
  };
  await pingCda("CDA Influencers — Reporting API", cdaKey, "casa_apostas");
  await pingCda("CDA Afiliados — Reporting API", cdaAfilKey, "casa_apostas_afiliados");

  const { res: brasilRes, aborted: brasilAbort } = await fetchTimeout(
    `https://brasilapi.com.br/api/cnpj/v1/${DIAGNOSTICO_BRASIL_API_CNPJ_PING}`,
    {},
    DIAGNOSTICO_PING_TIMEOUT_MS,
  );
  {
    const cls = classificarHttpSmoke(brasilRes?.status ?? 0, brasilAbort || !brasilRes);
    extras.push(
      extra(
        "Brasil API (CNPJ)",
        cls.severidade === "ok" ? "ok" : cls.severidade,
        cls.severidade === "ok"
          ? "Consulta pública de CNPJ respondeu."
          : cls.detalhe,
        "comercial_cnpj_enriquecimento",
      ),
    );
  }

  const { res: spaRes, aborted: spaAbort } = await fetchTimeout(
    DIAGNOSTICO_SPA_LISTA_URL,
    { method: "HEAD" },
    DIAGNOSTICO_PING_TIMEOUT_MS,
  );
  {
    let status = spaRes?.status ?? 0;
    let aborted = spaAbort || !spaRes;
    if (status === 405 || status === 501) {
      const retry = await fetchTimeout(DIAGNOSTICO_SPA_LISTA_URL, { method: "GET" }, DIAGNOSTICO_PING_TIMEOUT_MS);
      status = retry.res?.status ?? 0;
      aborted = retry.aborted || !retry.res;
    }
    const cls = classificarHttpSmoke(status, aborted);
    extras.push(
      extra(
        "Lista SPA (gov.br)",
        cls.severidade === "ok" ? "ok" : cls.severidade,
        cls.severidade === "ok" ? "Página de empresas autorizadas acessível." : cls.detalhe,
        "comercial_spa_lista",
      ),
    );
  }

  const pingRss = async (nome: string, envKey: string, slug: string) => {
    const url = primeiraUrlDeLista(envGet(envKey));
    if (!url) {
      extras.push(extra(nome, "aviso", `Nenhum feed em ${envKey}.`, slug));
      return;
    }
    const { res, aborted } = await fetchTimeout(url, { method: "HEAD" }, DIAGNOSTICO_PING_TIMEOUT_MS);
    let status = res?.status ?? 0;
    let abort = aborted || !res;
    if (status === 405 || status === 501) {
      const retry = await fetchTimeout(url, { method: "GET" }, DIAGNOSTICO_PING_TIMEOUT_MS);
      status = retry.res?.status ?? 0;
      abort = retry.aborted || !retry.res;
    }
    const cls = classificarHttpSmoke(status, abort);
    extras.push(
      extra(
        nome,
        cls.severidade === "ok" ? "ok" : cls.severidade,
        cls.severidade === "ok" ? "Primeiro feed RSS acessível." : cls.detalhe,
        slug,
      ),
    );
  };
  await pingRss("Painel de Notícias — feed RSS", "PAINEL_NOTICIAS_RSS_URLS", "painel_noticias_rss");
  await pingRss("Spin na Rede — feed RSS", "SPIN_NA_REDE_RSS_URLS", "spin_na_rede_rss");

  for (const lobby of LOBBY_SECRET_POR_SLUG) {
    const val = envGet(lobby.secret)?.trim() ?? "";
    extras.push(
      extra(
        `${lobby.nome} — secret de ingestão`,
        val ? "ok" : "aviso",
        val
          ? "Secret de ingestão presente (sem scrape do lobby)."
          : `${lobby.secret} ausente — o job Telecom pode falhar na autenticação.`,
        lobby.slug,
      ),
    );
  }

  const snapshot: PlatformHealthSnapshot = {
    hojeIso,
    passouHorarioCda,
    passouHorarioSocial,
    passouHorarioComercialSpa,
    passouHorarioComercialDominio,
    passouHorarioComercialCnpj,
    secrets,
    integracoes,
    extras,
  };

  const rowsCompletos = buildPlatformHealthTechLogs(snapshot);
  const counts = countDiagnosticSummary(rowsCompletos);
  const rows = techLogsParaGravar(rowsCompletos);

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

  const resumo =
    rows.find((r) => r.tipo === TIPO_DIAGNOSTICO_RESUMO)?.descricao ?? "Diagnóstico concluído.";

  return json(
    {
      ok: true,
      resumo,
      inseridos: rows.length,
      okCount: counts.ok,
      avisoCount: counts.aviso,
      erroCount: counts.erro,
    },
    req,
  );
});
