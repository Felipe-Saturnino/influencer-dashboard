import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { montarIcsCalendarioPrestador, type RhCalendarioIcsEvento } from "./rhCalendarioIcs.ts";

/**
 * Feed iCal público (Google / Outlook / Apple assinam por URL).
 * Sem JWT — o token do prestador é o segredo. verify_jwt = false.
 */

const ICS_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": 'inline; filename="calendario-spin.ics"',
  "Cache-Control": "public, max-age=300",
};

function tokenDaRequest(req: Request): string {
  const url = new URL(req.url);
  const q = (url.searchParams.get("token") ?? "").trim();
  if (q) return q;
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (last && last !== "rh-calendario-ics") return last;
  return "";
}

function parseEventos(raw: unknown): RhCalendarioIcsEvento[] {
  if (!raw || typeof raw !== "object") return [];
  const eventos = (raw as { eventos?: unknown }).eventos;
  if (!Array.isArray(eventos)) return [];
  const out: RhCalendarioIcsEvento[] = [];
  for (const item of eventos) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const uid = typeof o.uid === "string" ? o.uid : "";
    const titulo = typeof o.titulo === "string" ? o.titulo : "";
    const startsAt = typeof o.startsAt === "string" ? o.startsAt : "";
    const endsAt = typeof o.endsAt === "string" ? o.endsAt : "";
    if (!uid || !titulo || !startsAt) continue;
    out.push({
      uid,
      titulo,
      startsAt,
      endsAt: endsAt || startsAt,
      allDay: o.allDay === true,
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      },
    });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: ICS_HEADERS });
  }

  const token = tokenDaRequest(req);
  if (token.length < 16) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response("Service Unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("rh_calendario_ics_feed_eventos", { p_token: token });
  if (error) {
    console.error("[rh-calendario-ics]", error.message);
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const payload = data as { ok?: boolean; error?: string; eventos?: unknown } | null;
  if (!payload || payload.ok !== true) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const ics = montarIcsCalendarioPrestador({ eventos: parseEventos(payload) });
  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers: ICS_HEADERS });
  }
  return new Response(ics, { status: 200, headers: ICS_HEADERS });
});
