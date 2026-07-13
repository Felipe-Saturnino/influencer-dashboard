/**
 * Edge Function: sync-vagas-carreiras-site
 *
 * Monta o snapshot de vagas EXTERNAS + ABERTAS e envia POST JSON ao WordPress
 * (página Carreiras — https://spingaming.com.br/carreiras/).
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já existem.
 *   WORDPRESS_VAGAS_SYNC_URL — URL do endpoint da agência
 *     (ex.: https://spingaming.com.br/wp-json/spin/v1/vagas/sync)
 *   SPIN_VAGAS_SYNC_SECRET — valor do header x-spin-vagas-sync-secret
 *     (mesmo valor que a agência configura no WordPress)
 *
 * Proteção da própria function (opcional):
 *   SPIN_VAGAS_CARREIRAS_INGEST_SECRET — se definido, exige header
 *     x-spin-vagas-carreiras-ingest-secret OU Bearer service_role.
 *     Se ausente, aceita chamada com anon (padrão dos crons GitHub Actions).
 *
 * POST JSON opcional: { dry_run?: boolean }
 *   dry_run=true → monta o payload e NÃO chama o WordPress (nem grava sync_logs).
 *
 * Contrato com a agência: docs/api-sync-vagas-carreiras-site-agencia.md
 * Setup TI: docs/SETUP-SYNC-VAGAS-CARREIRAS.md
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const INTEGRACAO_SLUG = "vagas_carreiras_wordpress";
const WP_HEADER = "x-spin-vagas-sync-secret";
const INGEST_HEADER = "x-spin-vagas-carreiras-ingest-secret";
const FETCH_TIMEOUT_MS = 45_000;

type SupabaseAdmin = ReturnType<typeof createClient>;

type RhVagaSyncRow = {
  codigo_vaga: string | null;
  titulo: string;
  descricao: string;
  responsabilidades: string;
  repasse_inicial_centavos: number | null;
  tags: string[] | null;
  necessario_video_apresentacao: boolean | null;
  necessario_turno: boolean | null;
  data_fim_inscricoes: string;
};

type VagaPayload = {
  codigo_vaga: string;
  titulo: string;
  descricao: string;
  responsabilidades: string;
  repasse_inicial_centavos: number;
  repasse_inicial_formatado: string;
  tags: string[];
  necessario_video_apresentacao: boolean;
  necessario_turno: boolean;
  data_fim_inscricoes: string;
};

type SyncBody = {
  dry_run?: boolean;
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      `authorization, x-client-info, apikey, content-type, ${INGEST_HEADER}`,
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function autorizado(req: Request): boolean {
  const secret = Deno.env.get("SPIN_VAGAS_CARREIRAS_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get(INGEST_HEADER) ??
    req.headers.get("X-Spin-Vagas-Carreiras-Ingest-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
}

/** Formata centavos → R$ 1.500,00 (pt-BR). */
function fmtRepasseCentavos(centavos: number): string {
  const reais = centavos / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dataIsoOnly(v: string | null | undefined): string {
  if (!v?.trim()) return "";
  return v.trim().slice(0, 10);
}

function mapVaga(row: RhVagaSyncRow): VagaPayload | null {
  const codigo = (row.codigo_vaga ?? "").trim();
  if (!codigo) return null;
  const centavos = Math.max(0, Math.trunc(Number(row.repasse_inicial_centavos ?? 0) || 0));
  const tags = Array.isArray(row.tags)
    ? row.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  return {
    codigo_vaga: codigo,
    titulo: (row.titulo ?? "").trim(),
    descricao: (row.descricao ?? "").trim(),
    responsabilidades: (row.responsabilidades ?? "").trim(),
    repasse_inicial_centavos: centavos,
    repasse_inicial_formatado: fmtRepasseCentavos(centavos),
    tags,
    necessario_video_apresentacao: !!row.necessario_video_apresentacao,
    necessario_turno: !!row.necessario_turno,
    data_fim_inscricoes: dataIsoOnly(row.data_fim_inscricoes),
  };
}

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
    console.error("[sync-vagas-carreiras-site] Falha ao gravar sync_logs:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta." }, req, 500);
  }

  if (!autorizado(req)) {
    return json(
      {
        ok: false,
        erro: "Não autorizado. Defina x-spin-vagas-carreiras-ingest-secret ou Bearer service_role.",
      },
      req,
      401,
    );
  }

  let body: SyncBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as SyncBody;
  } catch {
    body = {};
  }
  const dry_run = body.dry_run === true;

  const t0 = Date.now();
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Alinha status aberta ↔ em_andamento pela data fim (fuso SP) antes do snapshot.
    const { error: rpcErr } = await supabase.rpc("rh_vagas_atualizar_status_inscricoes_encerradas");
    if (rpcErr) {
      console.warn("[sync-vagas-carreiras-site] RPC status data fim:", rpcErr.message);
    }

    const { data, error: qErr } = await supabase
      .from("rh_vagas")
      .select(
        "codigo_vaga, titulo, descricao, responsabilidades, repasse_inicial_centavos, tags, necessario_video_apresentacao, necessario_turno, data_fim_inscricoes",
      )
      .eq("tipo_vaga", "externa")
      .eq("status", "aberta")
      .order("codigo_vaga", { ascending: true });

    if (qErr) {
      const msg = "Não foi possível carregar as vagas para sincronização.";
      console.error("[sync-vagas-carreiras-site] query:", qErr.message);
      if (!dry_run) {
        await gravarSyncLog(supabase, {
          status: "falha",
          registros_inseridos: 0,
          registros_atualizados: 0,
          erros_count: 1,
          mensagem_erro: msg,
          duracao_ms: Date.now() - t0,
        });
      }
      return json({ ok: false, erro: msg }, req, 500);
    }

    const vagas: VagaPayload[] = [];
    for (const row of (data ?? []) as RhVagaSyncRow[]) {
      const mapped = mapVaga(row);
      if (mapped) vagas.push(mapped);
    }

    const synced_at = new Date().toISOString();
    const payload = { synced_at, vagas };

    if (dry_run) {
      return json(
        {
          ok: true,
          dry_run: true,
          synced_at,
          total_vagas: vagas.length,
          payload,
        },
        req,
      );
    }

    const wpUrl = (Deno.env.get("WORDPRESS_VAGAS_SYNC_URL") ?? "").trim();
    const wpSecret = (Deno.env.get("SPIN_VAGAS_SYNC_SECRET") ?? "").trim();

    if (!wpUrl || !/^https?:\/\//i.test(wpUrl)) {
      const msg =
        "WORDPRESS_VAGAS_SYNC_URL não configurada. Cadastre a URL do endpoint WordPress nos Secrets.";
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg,
        duracao_ms: Date.now() - t0,
      });
      return json({ ok: false, erro: msg, total_vagas: vagas.length }, req, 500);
    }

    if (!wpSecret) {
      const msg =
        "SPIN_VAGAS_SYNC_SECRET não configurada. Cadastre o mesmo segredo compartilhado com a agência.";
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg,
        duracao_ms: Date.now() - t0,
      });
      return json({ ok: false, erro: msg, total_vagas: vagas.length }, req, 500);
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    let wpStatus = 0;
    let wpBodyText = "";
    try {
      const wpRes = await fetch(wpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [WP_HEADER]: wpSecret,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
      wpStatus = wpRes.status;
      wpBodyText = (await wpRes.text()).slice(0, 2000);
    } catch (e) {
      clearTimeout(timer);
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Timeout ao chamar o WordPress."
          : "Não foi possível conectar ao endpoint WordPress.";
      console.error("[sync-vagas-carreiras-site] fetch WP:", e);
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg,
        duracao_ms: Date.now() - t0,
      });
      return json({ ok: false, erro: msg, total_vagas: vagas.length }, req, 502);
    }
    clearTimeout(timer);

    if (wpStatus < 200 || wpStatus >= 300) {
      const msg = `WordPress respondeu HTTP ${wpStatus}.`;
      console.error("[sync-vagas-carreiras-site]", msg, wpBodyText);
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: `${msg} ${wpBodyText}`.slice(0, 2000),
        duracao_ms: Date.now() - t0,
      });
      return json(
        {
          ok: false,
          erro: msg,
          total_vagas: vagas.length,
          wordpress_status: wpStatus,
          wordpress_body: wpBodyText,
        },
        req,
        502,
      );
    }

    await gravarSyncLog(supabase, {
      status: "ok",
      registros_inseridos: vagas.length,
      registros_atualizados: 0,
      erros_count: 0,
      mensagem_erro: null,
      duracao_ms: Date.now() - t0,
    });

    return json(
      {
        ok: true,
        synced_at,
        total_vagas: vagas.length,
        wordpress_status: wpStatus,
        duracao_ms: Date.now() - t0,
      },
      req,
    );
  } catch (e) {
    console.error("[sync-vagas-carreiras-site] exceção:", e);
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: 0,
      registros_atualizados: 0,
      erros_count: 1,
      mensagem_erro: "Erro inesperado na sincronização de vagas.",
      duracao_ms: Date.now() - t0,
    });
    return json({ ok: false, erro: "Erro inesperado na sincronização de vagas." }, req, 500);
  }
});
