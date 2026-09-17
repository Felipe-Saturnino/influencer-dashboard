import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  chunkIds,
  parseJogadoresSpinResponse,
  RS_OPERADORA_SLUG_CDA,
  summarizeRsPayload,
  tapIdFromRsExternal,
  type RsSpinDia,
} from "./revenueSentinelJogadores.ts";
import {
  agruparOperatorPlayerRounds,
  RS_ROUNDS_DATASET,
  RS_ROUNDS_PAGE_SIZE,
  totalRsRoundsPayload,
  type RsMesaCatalogo,
} from "./revenueSentinelRounds.ts";

/**
 * Edge: sync-revenue-sentinel
 * Consome Data Export API:
 * - POST /v1/jogadores/spin: consolidado e fallback;
 * - GET /v1/datasets/operator-player-rounds: fatos por data e mesa (fonte principal).
 *
 * Secrets: RS_API_URL, RS_API_KEY (X-API-Key), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Body opcional:
 *   { data_inicio, data_fim, dry_run, ext_customer_ids?, cda_conta?, atualizar_cadastro?,
 *     probe_datasets?, usar_detalhe_rodadas? }
 * Uma chamada cobre uma única competência. Sem datas, usa mês corrente até D-1.
 * `probe_datasets: true` só lê GET catalog/schema/datasets (não grava).
 */

const INTEGRACAO_SLUG = "revenue_sentinel";
const DEFAULT_BASE = "https://api.spingaming.com.br/api/v1/data";
const PAGE = 1000;
const RPC_CHUNK = 400;
const FETCH_MS = 45_000;

type SyncBody = {
  data_inicio?: string;
  data_fim?: string;
  dry_run?: boolean;
  ext_customer_ids?: string[];
  cda_conta?: "influencers" | "afiliados";
  atualizar_cadastro?: boolean;
  probe_datasets?: boolean;
  usar_detalhe_rodadas?: boolean;
};

function cors(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(req) },
  });
}

const ID_KEY = /^(id|.*_id|external_id|ext_customer_id|crm_id|email|phone|cpf|cnpj|name|username)$/i;
const MESA_KEY = /table|mesa|game|jogo/i;
const DATA_KEY = /date|dia|day|snapshot|played_at|created_at/i;

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
}

function envelopeRows(payload: unknown): unknown[] {
  const rec = asRec(payload);
  if (!rec) return Array.isArray(payload) ? payload : [];
  for (const k of ["rows", "items", "data", "results", "records", "hits"]) {
    if (Array.isArray(rec[k])) return rec[k] as unknown[];
  }
  return [];
}

function redactVal(key: string, v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (DATA_KEY.test(key) || MESA_KEY.test(key) || /^\d{4}-\d{2}-\d{2}/.test(v)) return v;
    if (ID_KEY.test(key) || /CDA-\d+/i.test(v) || v.length > 24) {
      return v.length <= 4 ? "***" : `…${v.slice(-4)}`;
    }
    return v.length > 48 ? `${v.slice(0, 24)}…` : v;
  }
  if (Array.isArray(v)) return `[array:${v.length}]`;
  if (typeof v === "object") return `{keys:${Object.keys(v).slice(0, 12).join(",")}}`;
  return typeof v;
}

function summarizeSample(payload: unknown, http: number) {
  const rec = asRec(payload);
  const rows = envelopeRows(payload);
  const first = asRec(rows[0]) ?? (rows.length === 0 ? asRec(payload) : null);
  const cols = first ? Object.keys(first) : [];
  const uniques: Record<string, string[]> = {};
  for (const col of cols) {
    if (!MESA_KEY.test(col) && !DATA_KEY.test(col)) continue;
    const set = new Set<string>();
    for (const row of rows.slice(0, 200)) {
      const r = asRec(row);
      if (!r || r[col] == null) continue;
      set.add(String(r[col]).slice(0, 80));
      if (set.size >= 12) break;
    }
    if (set.size) uniques[col] = [...set];
  }
  return {
    http,
    envelope_keys: rec ? Object.keys(rec).slice(0, 24) : [],
    n_rows: rows.length,
    total: rec?.total ?? rec?.count ?? rec?.row_count ?? null,
    colunas: cols,
    amostra_redigida: first
      ? Object.fromEntries(cols.map((k) => [k, redactVal(k, first[k])]))
      : null,
    valores_mesa_ou_data: uniques,
  };
}

async function rsGet(
  apiBase: string,
  apiKey: string,
  path: string,
  query: Record<string, string> = {},
): Promise<{ status: number; payload: unknown }> {
  const url = new URL(`${apiBase}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { "X-API-Key": apiKey },
    });
    const text = await res.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text.slice(0, 400) };
    }
    return { status: res.status, payload };
  } finally {
    clearTimeout(t);
  }
}

function ontemIsoSaoPaulo(): string {
  const agoraSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  agoraSp.setDate(agoraSp.getDate() - 1);
  return agoraSp.toISOString().slice(0, 10);
}

function inicioMes(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

async function fetchAllPages<T>(
  run: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const acc: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    acc.push(...rows);
    if (rows.length < PAGE) break;
  }
  return acc;
}

type MesaCatalogoRow = Omit<RsMesaCatalogo, "estudio_tipo" | "identificacao_cda">;
type EstudioRow = { slug: string; tipo: "dedicado" | "network" };
type EstudioOperadoraRow = { estudio_slug: string };
type MesaIdentificacaoRow = { mesa_id: string; mesa_identificacao_operadora: string | null };

async function carregarCatalogoMesasCda(
  supabase: ReturnType<typeof createClient>,
): Promise<RsMesaCatalogo[]> {
  const [mesas, estudios, vinculos, identificacoes] = await Promise.all([
    fetchAllPages<MesaCatalogoRow>((from, to) =>
      supabase
        .from("mesas_spin_cadastro")
        .select("id,nome_mesa,tipo_jogo,mesa_identificacao,mesa_identificacao_operadora,operadora_slug,estudio_slug")
        .range(from, to)
    ),
    fetchAllPages<EstudioRow>((from, to) =>
      supabase.from("estudios_spin").select("slug,tipo").range(from, to)
    ),
    fetchAllPages<EstudioOperadoraRow>((from, to) =>
      supabase
        .from("estudios_spin_operadoras")
        .select("estudio_slug")
        .eq("operadora_slug", RS_OPERADORA_SLUG_CDA)
        .range(from, to)
    ),
    fetchAllPages<MesaIdentificacaoRow>((from, to) =>
      supabase
        .from("mesas_spin_operadora_identificacao")
        .select("mesa_id,mesa_identificacao_operadora")
        .eq("operadora_slug", RS_OPERADORA_SLUG_CDA)
        .range(from, to)
    ),
  ]);
  const estudioTipo = new Map(estudios.map((e) => [e.slug, e.tipo] as const));
  const estudiosCda = new Set(vinculos.map((v) => v.estudio_slug));
  const idCda = new Map(identificacoes.map((i) => [i.mesa_id, i.mesa_identificacao_operadora] as const));

  return mesas
    .filter((m) =>
      m.operadora_slug === RS_OPERADORA_SLUG_CDA ||
      (m.estudio_slug != null && estudiosCda.has(m.estudio_slug))
    )
    .map((m) => ({
      ...m,
      estudio_tipo: m.estudio_slug ? estudioTipo.get(m.estudio_slug) ?? null : null,
      identificacao_cda: idCda.get(m.id) ?? null,
    }));
}

type RsRoundsFetch = {
  payloadsFiltrados: unknown[];
  totalApi: number;
  paginas: number;
  linhasFiltradas: number;
};

/**
 * A API não filtra por jogador. Pagina toda a competência, mas retém em memória
 * somente linhas dos IDs TAP deste canal.
 */
async function buscarRoundsCda(
  apiBase: string,
  apiKey: string,
  de: string,
  ate: string,
  ids: ReadonlySet<string>,
): Promise<RsRoundsFetch> {
  const queryBase = {
    start_date: de,
    end_date: ate,
    operator: "Casa de Apostas",
    limit: String(RS_ROUNDS_PAGE_SIZE),
  };
  const primeira = await rsGet(apiBase, apiKey, `/v1/datasets/${RS_ROUNDS_DATASET}`, {
    ...queryBase,
    offset: "0",
  });
  if (primeira.status !== 200) {
    throw new Error(`GET ${RS_ROUNDS_DATASET}: HTTP ${primeira.status}`);
  }
  const totalApi = totalRsRoundsPayload(primeira.payload) ?? envelopeRows(primeira.payload).length;
  const payloadsFiltrados: unknown[] = [];
  let linhasFiltradas = 0;
  const guardar = (payload: unknown) => {
    const items = envelopeRows(payload).filter((item) => {
      const row = asRec(item);
      const ext = tapIdFromRsExternal(String(row?.external_id ?? ""));
      return ext.length > 0 && ids.has(ext);
    });
    linhasFiltradas += items.length;
    if (items.length > 0) payloadsFiltrados.push({ items });
  };
  guardar(primeira.payload);

  const offsets: number[] = [];
  for (let offset = RS_ROUNDS_PAGE_SIZE; offset < totalApi; offset += RS_ROUNDS_PAGE_SIZE) {
    offsets.push(offset);
  }
  const concorrencia = 3;
  for (let i = 0; i < offsets.length; i += concorrencia) {
    const lote = offsets.slice(i, i + concorrencia);
    const paginas = await Promise.all(lote.map((offset) =>
      rsGet(apiBase, apiKey, `/v1/datasets/${RS_ROUNDS_DATASET}`, {
        ...queryBase,
        offset: String(offset),
      })
    ));
    for (const pagina of paginas) {
      if (pagina.status !== 200) {
        throw new Error(`GET ${RS_ROUNDS_DATASET}: HTTP ${pagina.status}`);
      }
      guardar(pagina.payload);
    }
  }

  return {
    payloadsFiltrados,
    totalApi,
    paginas: offsets.length + 1,
    linhasFiltradas,
  };
}

const SPIN_VAZIO = {
  rodadas_spin: 0,
  apostas_spin: 0,
  ggr_spin: null,
  turnover_spin: null,
  jogou_spin: null,
  rodadas_por_jogo: {},
  rodadas_por_mesa: [],
};

/** Recalcula a competência de forma idempotente sem tocar nos fatos TAP. */
async function limparSpinPeriodo(
  supabase: ReturnType<typeof createClient>,
  conta: "influencers" | "afiliados",
  de: string,
  ate: string,
  idsExplicitos: string[] | null,
): Promise<void> {
  const limpar = async (ids?: string[]) => {
    let query = supabase
      .from("jogadores_metricas_diarias")
      .update(SPIN_VAZIO)
      .eq("operadora_slug", RS_OPERADORA_SLUG_CDA)
      .eq("cda_conta", conta)
      .gte("data", de)
      .lte("data", ate);
    if (ids?.length) query = query.in("ext_customer_id", ids);
    const { error } = await query;
    if (error) throw new Error(`limpeza Spin da competência: ${error.message}`);
  };

  if (!idsExplicitos?.length) {
    await limpar();
    return;
  }
  for (let i = 0; i < idsExplicitos.length; i += RPC_CHUNK) {
    await limpar(idsExplicitos.slice(i, i + RPC_CHUNK));
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors(req) });
  }

  const inicioMs = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiKey = Deno.env.get("RS_API_KEY")?.trim() ?? "";
  const apiBase = (Deno.env.get("RS_API_URL") ?? DEFAULT_BASE).replace(/\/$/, "");

  if (!supabaseUrl || !serviceKey) {
    return json(req, { ok: false, erro: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes." }, 200);
  }
  if (!apiKey) {
    return json(req, {
      ok: false,
      erro: "Configure RS_API_KEY em Supabase → Edge Functions → Secrets.",
    }, 200);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let params: SyncBody = {};
  try {
    params = await req.json();
  } catch {
    /* body vazio */
  }

  const dataFim = params.data_fim ?? ontemIsoSaoPaulo();
  const dataInicio = params.data_inicio ?? inicioMes(dataFim);
  const dryRun = params.dry_run === true;
  const atualizarCadastro = params.atualizar_cadastro === true;
  const usarDetalheRodadas = params.usar_detalhe_rodadas !== false;
  const conta = params.cda_conta === "afiliados" ? "afiliados" : "influencers";

  if (params.probe_datasets === true) {
    const de = params.data_inicio ?? "2026-08-01";
    const ate = params.data_fim ?? "2026-08-07";
    try {
      const [status, catalog, schemaRounds, schemaSnaps] = await Promise.all([
        rsGet(apiBase, apiKey, "/v1/status"),
        rsGet(apiBase, apiKey, "/v1/catalog"),
        rsGet(apiBase, apiKey, "/v1/schema/operator-player-rounds"),
        rsGet(apiBase, apiKey, "/v1/schema/operator-player-snapshots"),
      ]);
      const operadores = ["casa_apostas", "Casa de Apostas"];
      const roundsPorOp: Record<string, ReturnType<typeof summarizeSample>> = {};
      const snapsPorOp: Record<string, ReturnType<typeof summarizeSample>> = {};
      for (const op of operadores) {
        const q = { start_date: de, end_date: ate, operator: op, limit: "25" };
        const rounds = await rsGet(apiBase, apiKey, "/v1/datasets/operator-player-rounds", q);
        const snaps = await rsGet(apiBase, apiKey, "/v1/datasets/operator-player-snapshots", q);
        roundsPorOp[op] = summarizeSample(rounds.payload, rounds.status);
        snapsPorOp[op] = summarizeSample(snaps.payload, snaps.status);
      }
      return json(req, {
        ok: true,
        versao: "v1.5.0",
        probe: "datasets",
        periodo: { de, ate },
        status: { http: status.status, payload: status.payload },
        catalog: { http: catalog.status, payload: catalog.payload },
        schema_rounds: { http: schemaRounds.status, payload: schemaRounds.payload },
        schema_snapshots: { http: schemaSnaps.status, payload: schemaSnaps.payload },
        rounds: roundsPorOp,
        snapshots: snapsPorOp,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json(req, { ok: false, probe: "datasets", erro: msg }, 200);
    }
  }

  if (dataInicio.slice(0, 7) !== dataFim.slice(0, 7)) {
    return json(req, {
      ok: false,
      erro: "O sync Revenue Sentinel aceita uma competência por chamada. Informe data_inicio e data_fim no mesmo mês.",
    }, 200);
  }

  const gravarLog = async (opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    registros_atualizados?: number;
    erros_count: number;
    mensagem_erro?: string;
  }) => {
    const { error } = await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados ?? 0,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro ?? null,
      duracao_ms: Date.now() - inicioMs,
      periodo_inicio: dataInicio,
      periodo_fim: dataFim,
    });
    if (error) console.error("[sync-revenue-sentinel] sync_logs:", error.message);
  };

  try {
    const idsForamInformados = (params.ext_customer_ids?.length ?? 0) > 0;
    let ids = (params.ext_customer_ids ?? [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);

    if (ids.length === 0) {
      const rows = await fetchAllPages<{ ext_customer_id: string }>((from, to) =>
        supabase
          .from("jogadores")
          .select("ext_customer_id")
          .eq("operadora_slug", RS_OPERADORA_SLUG_CDA)
          .eq("cda_conta", conta)
          .range(from, to),
      );
      ids = [...new Set(rows.map((r) => r.ext_customer_id).filter(Boolean))];
    }

    const depositRows = await fetchAllPages<{ ext_customer_id: string }>((from, to) =>
      supabase
        .from("jogadores_metricas_diarias")
        .select("ext_customer_id")
        .eq("operadora_slug", RS_OPERADORA_SLUG_CDA)
        .gt("deposit_count", 0)
        .range(from, to),
    );
    const comDeposito = new Set(depositRows.map((r) => r.ext_customer_id));

    const chunks = chunkIds(ids);
    const diasConsolidados: RsSpinDia[] = [];
    const missing = new Set<string>();
    const erros: string[] = [];
    let httpOk = 0;
    let payloadShape: ReturnType<typeof summarizeRsPayload> | null = null;

    for (const lote of chunks) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_MS);
      try {
        const res = await fetch(`${apiBase}/v1/jogadores/spin`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            operadora_slug: RS_OPERADORA_SLUG_CDA,
            ext_customer_ids: lote,
            de: dataInicio,
            ate: dataFim,
          }),
        });
        const text = await res.text();
        let payload: unknown = text;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = { raw: text.slice(0, 400) };
        }
        if (!res.ok) {
          erros.push(`HTTP ${res.status} (lote ${lote.length} ids)`);
          continue;
        }
        httpOk += 1;
        if (!payloadShape) {
          payloadShape = summarizeRsPayload(payload);
          console.log("[sync-revenue-sentinel] payload", JSON.stringify(payloadShape));
        }
        // O contrato atual devolve totais da janela sem dia. Cada chamada representa
        // uma competência; o primeiro dia funciona como bucket estável para o UPSERT.
        const parsed = parseJogadoresSpinResponse(payload, dataInicio);
        diasConsolidados.push(...parsed.dias);
        for (const m of parsed.missing) missing.add(m);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`lote: ${msg}`);
      } finally {
        clearTimeout(t);
      }
    }

    let todosDias = diasConsolidados;
    let roundsDetalhe: {
      ativo: boolean;
      total_api: number;
      paginas: number;
      linhas_ids_canal: number;
      duplicadas: number;
      mesas_sem_cadastro: string[];
      rodadas_detalhe: number;
      rodadas_consolidado: number;
    } | null = null;

    if (usarDetalheRodadas) {
      try {
        const [catalogo, roundsFetch] = await Promise.all([
          carregarCatalogoMesasCda(supabase),
          buscarRoundsCda(apiBase, apiKey, dataInicio, dataFim, new Set(ids)),
        ]);
        const resumo = agruparOperatorPlayerRounds(
          roundsFetch.payloadsFiltrados,
          new Set(ids),
          catalogo,
        );
        const rodadasDetalhe = resumo.dias.reduce((s, d) => s + d.rodadas_spin, 0);
        const rodadasConsolidado = diasConsolidados.reduce((s, d) => s + d.rodadas_spin, 0);
        roundsDetalhe = {
          ativo: true,
          total_api: roundsFetch.totalApi,
          paginas: roundsFetch.paginas,
          linhas_ids_canal: roundsFetch.linhasFiltradas,
          duplicadas: resumo.duplicadas,
          mesas_sem_cadastro: resumo.mesasSemCadastro.slice(0, 20),
          rodadas_detalhe: rodadasDetalhe,
          rodadas_consolidado: rodadasConsolidado,
        };

        // O dataset granular é a fonte da verdade para data, mesa, rodadas e financeiro.
        // Se há dados na API mas nenhum ID do canal cruza, preserva o consolidado e
        // sinaliza erro de identidade em vez de zerar silenciosamente a competência.
        if (roundsFetch.totalApi === 0 || resumo.dias.length > 0) {
          todosDias = resumo.dias;
        } else {
          roundsDetalhe.ativo = false;
          erros.push(
            `${RS_ROUNDS_DATASET}: ${roundsFetch.totalApi} linhas na competência, mas nenhuma cruzou os ${ids.length} IDs TAP`,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`detalhe de rodadas: ${msg}`);
      }
    }

    const porId = new Map<string, {
      player_id_bko: string | null;
      identity_key: string | null;
      rodadas: number;
      apostas: number;
      ggr: number;
      turnover: number;
      jogou: boolean;
      jogos: Record<string, number>;
      mesas: RsSpinDia["rodadas_por_mesa"];
      minData: string | null;
      maxData: string | null;
    }>();

    const ensure = (ext: string) => {
      let a = porId.get(ext);
      if (!a) {
        a = {
          player_id_bko: null,
          identity_key: null,
          rodadas: 0,
          apostas: 0,
          ggr: 0,
          turnover: 0,
          jogou: false,
          jogos: {},
          mesas: [],
          minData: null,
          maxData: null,
        };
        porId.set(ext, a);
      }
      return a;
    };

    for (const d of todosDias) {
      if (d.rodadas_spin <= 0 && d.apostas_spin <= 0) continue;
      const a = ensure(d.ext_customer_id);
      a.player_id_bko = a.player_id_bko || d.player_id_bko;
      a.identity_key = a.identity_key || d.identity_key;
      a.rodadas += d.rodadas_spin;
      a.apostas += d.apostas_spin;
      a.ggr += d.ggr_spin ?? 0;
      a.turnover += d.turnover_spin ?? 0;
      a.jogou = a.rodadas > 0 || a.apostas > 0;
      for (const [j, n] of Object.entries(d.rodadas_por_jogo)) {
        a.jogos[j] = (a.jogos[j] ?? 0) + n;
      }
      a.mesas.push(...d.rodadas_por_mesa);
      if (!a.minData || d.data < a.minData) a.minData = d.data;
      if (!a.maxData || d.data > a.maxData) a.maxData = d.data;
    }

    for (const id of ids) {
      if (!porId.has(id)) ensure(id);
    }

    const cadastro = [...porId.entries()].map(([ext, a]) => {
      const jogouSpin = a.rodadas > 0 || a.apostas > 0;
      return {
        ext_customer_id: ext,
        player_id_bko: a.player_id_bko,
        identity_key: a.identity_key,
        rodadas_spin: a.rodadas,
        apostas_spin: a.apostas,
        ggr_spin: jogouSpin ? a.ggr : null,
        turnover_spin: jogouSpin ? a.turnover : null,
        jogou_spin: jogouSpin,
        jogou_outros: !jogouSpin && comDeposito.has(ext),
        rodadas_por_jogo: a.jogos,
        rodadas_por_mesa: a.mesas,
        primeira_rodada_spin: jogouSpin && a.minData ? `${a.minData}T00:00:00-03:00` : null,
        ultima_rodada_spin: jogouSpin && a.maxData ? `${a.maxData}T00:00:00-03:00` : null,
      };
    });

    let diarioUpsert = 0;
    let cadastroUpsert = 0;

    if (!dryRun) {
      await limparSpinPeriodo(
        supabase,
        conta,
        dataInicio,
        dataFim,
        idsForamInformados ? ids : null,
      );
      for (let i = 0; i < todosDias.length; i += RPC_CHUNK) {
        const slice = todosDias.slice(i, i + RPC_CHUNK);
        const { data, error } = await supabase.rpc("enriquecer_jogadores_spin_diario", {
          p_operadora_slug: RS_OPERADORA_SLUG_CDA,
          p_linhas: slice,
        });
        if (error) throw new Error(`RPC diário: ${error.message}`);
        diarioUpsert += Number(data ?? 0);
      }
      if (atualizarCadastro) {
        for (let i = 0; i < cadastro.length; i += RPC_CHUNK) {
          const slice = cadastro.slice(i, i + RPC_CHUNK);
          const { data, error } = await supabase.rpc("enriquecer_jogadores_spin_cadastro", {
            p_operadora_slug: RS_OPERADORA_SLUG_CDA,
            p_linhas: slice,
          });
          if (error) throw new Error(`RPC cadastro: ${error.message}`);
          cadastroUpsert += Number(data ?? 0);
        }
      }
    }

    const status: "ok" | "falha" = erros.length > 0 && httpOk === 0 ? "falha" : "ok";
    const shapeNota =
      todosDias.length === 0 && httpOk > 0
        ? `Data Export 200 sem dias Spin. missing=${missing.size}/${ids.length}${payloadShape ? `; chaves=${payloadShape.keys.join(",") || payloadShape.kind}` : ""}`
        : undefined;
    if (!dryRun) {
      await gravarLog({
        status,
        registros_inseridos: diarioUpsert,
        registros_atualizados: cadastroUpsert,
        erros_count: erros.length,
        mensagem_erro: erros.length > 0 ? erros.slice(0, 3).join("; ") : shapeNota,
      });
    }

    return json(req, {
      ok: status === "ok",
      versao: "v1.5.0",
      integracao: INTEGRACAO_SLUG,
      dry_run: dryRun,
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      atualizar_cadastro: atualizarCadastro,
      competencia_recalculada: !dryRun,
      fonte_rodadas: roundsDetalhe?.ativo ? RS_ROUNDS_DATASET : "jogadores-spin",
      rounds_detalhe: roundsDetalhe,
      ids_enviados: ids.length,
      lotes: chunks.length,
      lotes_ok: httpOk,
      dias_spin: todosDias.length,
      missing: missing.size,
      jogaram_spin: cadastro.filter((c) => c.jogou_spin).length,
      jogaram_outros: cadastro.filter((c) => c.jogou_outros).length,
      diario_upsert: diarioUpsert,
      cadastro_upsert: cadastroUpsert,
      payload_shape: payloadShape,
      erros,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-revenue-sentinel]", msg);
    await gravarLog({
      status: "falha",
      registros_inseridos: 0,
      erros_count: 1,
      mensagem_erro: msg.slice(0, 500),
    });
    return json(req, { ok: false, erro: msg }, 200);
  }
});
