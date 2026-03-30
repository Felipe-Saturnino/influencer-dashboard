// Edge Function: ingest-relatorio-mesas-ocr
// Recebe JSON parseado no cliente (OCR) e faz upsert nas tabelas relatorio_* com service_role.
// Auth: JWT obrigatório + admin OU role_permissions(mesas_spin can_view sim|proprios).

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
  operadora: string | null;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

interface MonthlyRow {
  mes: string;
  operadora: string | null;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

interface PorTabelaRow {
  data_relatorio: string;
  nome_tabela: string;
  operadora: string | null;
  ggr_d1: number | null;
  turnover_d1: number | null;
  bets_d1: number | null;
  ggr_d2: number | null;
  turnover_d2: number | null;
  bets_d2: number | null;
  ggr_mtd: number | null;
  turnover_mtd: number | null;
  bets_mtd: number | null;
}

interface Body {
  data_relatorio?: string;
  daily_summary?: DailyRow[];
  monthly_summary?: MonthlyRow[];
  por_tabela?: PorTabelaRow[];
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function canIngest(
  supabaseSr: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: prof, error: pe } = await supabaseSr
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (pe || !prof?.role) return false;
  if (prof.role === "admin" || prof.role === "executivo") return true;
  const { data: rpMesas } = await supabaseSr
    .from("role_permissions")
    .select("can_view")
    .eq("role", prof.role)
    .eq("page_key", "mesas_spin")
    .maybeSingle();
  if (rpMesas?.can_view === "sim" || rpMesas?.can_view === "proprios") return true;
  const { data: rpStatus } = await supabaseSr
    .from("role_permissions")
    .select("can_view")
    .eq("role", prof.role)
    .eq("page_key", "status_tecnico")
    .maybeSingle();
  return rpStatus?.can_view === "sim" || rpStatus?.can_view === "proprios";
}

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
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
    return new Response(JSON.stringify({ ok: false, error: "Configuração do servidor incompleta" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "Token de autorização ausente" }), {
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
    return new Response(JSON.stringify({ ok: false, error: "Sessão inválida ou expirada" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  if (!(await canIngest(supabase, user.id))) {
    return new Response(JSON.stringify({ ok: false, error: "Sem permissão para importar Mesas Spin" }), {
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
    return new Response(JSON.stringify({ ok: false, error: "Nenhum dado para importar" }), {
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
    if (!isIsoDate(r.data_relatorio)) {
      return new Response(JSON.stringify({ ok: false, error: `data_relatorio inválida: ${r.data_relatorio}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!r.nome_tabela || r.nome_tabela.length > 500) {
      return new Response(JSON.stringify({ ok: false, error: "nome_tabela inválido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  try {
    if (daily.length > 0) {
      const datas = [...new Set(daily.map((r) => r.data))];
      for (const d of datas) {
        const { error: delErr } = await supabase
          .from("relatorio_daily_summary")
          .delete()
          .eq("data", d)
          .is("operadora", null);
        if (delErr) throw delErr;
      }
      const ins = daily.map((r) => ({
        data: r.data,
        operadora: r.operadora,
        turnover: r.turnover,
        ggr: r.ggr,
        margin_pct: r.margin_pct,
        bets: r.bets,
        uap: r.uap,
        bet_size: r.bet_size,
        arpu: r.arpu,
      }));
      const { error: dErr } = await supabase.from("relatorio_daily_summary").insert(ins);
      if (dErr) throw dErr;
    }

    if (monthly.length > 0) {
      const meses = [...new Set(monthly.map((r) => r.mes))];
      for (const m of meses) {
        const { error: delErr } = await supabase
          .from("relatorio_monthly_summary")
          .delete()
          .eq("mes", m)
          .is("operadora", null);
        if (delErr) throw delErr;
      }
      const ins = monthly.map((r) => ({
        mes: r.mes,
        operadora: r.operadora,
        turnover: r.turnover,
        ggr: r.ggr,
        margin_pct: r.margin_pct,
        bets: r.bets,
        uap: r.uap,
        bet_size: r.bet_size,
        arpu: r.arpu,
      }));
      const { error: mErr } = await supabase.from("relatorio_monthly_summary").insert(ins);
      if (mErr) throw mErr;
    }

    if (porTabela.length > 0) {
      const { error: pErr } = await supabase.from("relatorio_por_tabela").upsert(
        porTabela.map((r) => ({
          data_relatorio: r.data_relatorio,
          nome_tabela: r.nome_tabela,
          operadora: r.operadora,
          ggr_d1: r.ggr_d1,
          turnover_d1: r.turnover_d1,
          bets_d1: r.bets_d1,
          ggr_d2: r.ggr_d2,
          turnover_d2: r.turnover_d2,
          bets_d2: r.bets_d2,
          ggr_mtd: r.ggr_mtd,
          turnover_mtd: r.turnover_mtd,
          bets_mtd: r.bets_mtd,
        })),
        { onConflict: "data_relatorio,nome_tabela" },
      );
      if (pErr) throw pErr;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: {
          daily: daily.length,
          monthly: monthly.length,
          por_tabela: porTabela.length,
        },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
