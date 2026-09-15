import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  chunkIds,
  parseJogadoresSpinResponse,
  RS_OPERADORA_SLUG_CDA,
  summarizeRsPayload,
  type RsSpinDia,
} from "./revenueSentinelJogadores.ts";

/**
 * Edge: sync-revenue-sentinel
 * Consome Data Export API (POST /v1/jogadores/spin) e enriquece jogadores TAP.
 *
 * Secrets: RS_API_URL, RS_API_KEY (X-API-Key), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Body opcional:
 *   { data_inicio, data_fim, dry_run, ext_customer_ids?, cda_conta? }
 */

const INTEGRACAO_SLUG = "revenue_sentinel";
const DEFAULT_BASE = "https://api.spingaming.com.br/api/v1/data";
const DEFAULT_DE = "2025-12-01";
const PAGE = 1000;
const RPC_CHUNK = 400;
const FETCH_MS = 45_000;

type SyncBody = {
  data_inicio?: string;
  data_fim?: string;
  dry_run?: boolean;
  ext_customer_ids?: string[];
  cda_conta?: "influencers" | "afiliados";
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

function hojeIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
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

  const dataInicio = params.data_inicio ?? DEFAULT_DE;
  const dataFim = params.data_fim ?? hojeIsoUtc();
  const dryRun = params.dry_run === true;
  const conta = params.cda_conta === "afiliados" ? "afiliados" : "influencers";

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
    const todosDias: RsSpinDia[] = [];
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
        const parsed = parseJogadoresSpinResponse(payload);
        todosDias.push(...parsed.dias);
        for (const m of parsed.missing) missing.add(m);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        erros.push(`lote: ${msg}`);
      } finally {
        clearTimeout(t);
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
      const a = ensure(d.ext_customer_id);
      a.player_id_bko = a.player_id_bko || d.player_id_bko;
      a.identity_key = a.identity_key || d.identity_key;
      a.rodadas += d.rodadas_spin;
      a.apostas += d.apostas_spin;
      a.ggr += d.ggr_spin ?? 0;
      a.turnover += d.turnover_spin ?? 0;
      a.jogou = a.jogou || d.jogou_spin;
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

    const cadastro = [...porId.entries()].map(([ext, a]) => ({
      ext_customer_id: ext,
      player_id_bko: a.player_id_bko,
      identity_key: a.identity_key,
      rodadas_spin: a.rodadas,
      apostas_spin: a.apostas,
      ggr_spin: a.jogou ? a.ggr : null,
      turnover_spin: a.jogou ? a.turnover : null,
      jogou_spin: a.jogou,
      jogou_outros: !a.jogou && comDeposito.has(ext),
      rodadas_por_jogo: a.jogos,
      rodadas_por_mesa: a.mesas,
      primeira_rodada_spin: a.minData ? `${a.minData}T00:00:00-03:00` : null,
      ultima_rodada_spin: a.maxData ? `${a.maxData}T00:00:00-03:00` : null,
    }));

    let diarioUpsert = 0;
    let cadastroUpsert = 0;

    if (!dryRun) {
      for (let i = 0; i < todosDias.length; i += RPC_CHUNK) {
        const slice = todosDias.slice(i, i + RPC_CHUNK);
        const { data, error } = await supabase.rpc("enriquecer_jogadores_spin_diario", {
          p_operadora_slug: RS_OPERADORA_SLUG_CDA,
          p_linhas: slice,
        });
        if (error) throw new Error(`RPC diário: ${error.message}`);
        diarioUpsert += Number(data ?? 0);
      }
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
      versao: "v1.0.0",
      integracao: INTEGRACAO_SLUG,
      dry_run: dryRun,
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
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
