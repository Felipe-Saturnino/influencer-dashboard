// Edge Function: ingest-relatorio-mesas-ocr — JSON pós-OCR → relatorio_* v2
// Auth: JWT + admin OU permissão status_tecnico/mesas_spin can_editar

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}

interface DailyRow {
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  uap: number | null;
}

interface MonthlyRow {
  mes: string;
  uap: number | null;
  arpu: number | null;
}

interface PorRow {
  dia: string;
  operadora: string;
  mesa: string;
  ggr: number | null;
  turnover: number | null;
  apostas: number | null;
}

interface Body {
  data_referencia_por_mesa?: string;
  daily_summary?: DailyRow[];
  monthly_summary?: MonthlyRow[];
  por_tabela?: PorRow[];
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function podeEditar(v: string | null | undefined): boolean {
  return v === "sim" || v === "proprios";
}

async function canIngest(
  supabaseSr: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: prof, error: pe } = await supabaseSr.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (pe || !prof?.role) return false;
  for (const page of ["status_tecnico", "mesas_spin"] as const) {
    const { data: rp } = await supabaseSr
      .from("role_permissions")
      .select("can_editar")
      .eq("role", prof.role)
      .eq("page_key", page)
      .maybeSingle();
    if (podeEditar(rp?.can_editar)) return true;
  }
  return false;
}

const INTEGRACAO_SLUG = "upload_pls_daily_commercial";

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ ok: false, error: "Configuração incompleta" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Token ausente" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Sessão inválida" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  if (!(await canIngest(supabase, user.id))) {
    return new Response(JSON.stringify({ ok: false, error: "Sem permissão" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Body inválido" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const daily = Array.isArray(body.daily_summary) ? body.daily_summary : [];
  const monthly = Array.isArray(body.monthly_summary) ? body.monthly_summary : [];
  const porTabela = Array.isArray(body.por_tabela) ? body.por_tabela : [];
  if (daily.length + monthly.length + porTabela.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "Nenhum dado" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  for (const r of daily) {
    if (!isIsoDate(r.data)) {
      return new Response(JSON.stringify({ ok: false, error: `Data diária inválida: ${r.data}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }
  for (const r of monthly) {
    if (!isIsoDate(r.mes)) {
      return new Response(JSON.stringify({ ok: false, error: `Mês inválido: ${r.mes}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }
  for (const r of porTabela) {
    if (!isIsoDate(r.dia)) {
      return new Response(JSON.stringify({ ok: false, error: `Dia por mesa inválido: ${r.dia}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!r.operadora?.trim() || !r.mesa?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "operadora/mesa obrigatórios" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  const t0 = Date.now();
  try {
    let nDaily = 0;
    let nMonthly = 0;
    let nPor = 0;

    if (daily.length > 0) {
      const { error } = await supabase.from("relatorio_daily_summary").upsert(
        daily.map((r) => ({
          data: r.data,
          turnover: r.turnover,
          ggr: r.ggr,
          apostas: r.apostas,
          uap: r.uap,
        })),
        { onConflict: "data" },
      );
      if (error) throw error;
      nDaily = daily.length;
    }

    if (monthly.length > 0) {
      const { error } = await supabase.from("relatorio_monthly_summary").upsert(
        monthly.map((r) => ({
          mes: r.mes,
          uap: r.uap,
          arpu: r.arpu,
        })),
        { onConflict: "mes" },
      );
      if (error) throw error;
      nMonthly = monthly.length;
    }

    if (porTabela.length > 0) {
      const { error } = await supabase.from("relatorio_por_tabela").upsert(
        porTabela.map((r) => ({
          dia: r.dia,
          operadora: r.operadora,
          mesa: r.mesa,
          ggr: r.ggr,
          turnover: r.turnover,
          apostas: r.apostas,
        })),
        { onConflict: "dia,operadora,mesa" },
      );
      if (error) throw error;
      nPor = porTabela.length;
    }

    const dur = Date.now() - t0;
    await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: "ok",
      registros_inseridos: nDaily + nMonthly + nPor,
      registros_atualizados: 0,
      erros_count: 0,
      mensagem_erro: null,
      duracao_ms: dur,
      periodo_inicio: null,
      periodo_fim: null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: { daily: nDaily, monthly: nMonthly, por_tabela: nPor },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await supabase.from("tech_logs").insert({
        integracao_slug: INTEGRACAO_SLUG,
        tipo: INTEGRACAO_SLUG,
        descricao: `Erro ingest v2: ${msg}`.slice(0, 2000),
      });
      await supabase.from("sync_logs").insert({
        integracao_slug: INTEGRACAO_SLUG,
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg.slice(0, 500),
        duracao_ms: Date.now() - t0,
        periodo_inicio: null,
        periodo_fim: null,
      });
    } catch {
      /* empty */
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
