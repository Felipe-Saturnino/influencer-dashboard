const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

export { supabaseServiceOptions };

export type AuthResult =
  | { ok: true; via: "service_role" | "ingest_secret" | "admin" }
  | { ok: false; erro: string; status: number };

export async function resolveCaller(
  supabaseUrl: string,
  anonKey: string,
  token: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string; status: number }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      signal: controller.signal,
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

export async function podeExecutarIngestOutlookAdmin(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.49.1").createClient>,
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

export async function validarChamadaIngest(req: Request): Promise<AuthResult> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const ingestSecret = Deno.env.get("CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET")?.trim() ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (serviceKey && bearer === serviceKey) {
    return { ok: true, via: "service_role" };
  }

  const headerSecret =
    req.headers.get("x-cs-atendimento-outlook-ingest-secret") ??
    req.headers.get("X-Cs-Atendimento-Outlook-Ingest-Secret") ??
    "";
  if (ingestSecret && headerSecret === ingestSecret) {
    return { ok: true, via: "ingest_secret" };
  }

  if (!ingestSecret && !bearer) {
    return { ok: false, erro: "Não autorizado.", status: 401 };
  }

  if (bearer && anonKey && supabaseUrl && bearer !== serviceKey) {
    const whoami = await resolveCaller(supabaseUrl, anonKey, bearer);
    if (!whoami.ok) {
      return { ok: false, erro: whoami.error, status: whoami.status };
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(supabaseUrl, serviceKey, supabaseServiceOptions);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", whoami.userId)
      .maybeSingle();

    const role = (profile?.role as string | undefined) ?? "";
    if (await podeExecutarIngestOutlookAdmin(supabase, role)) {
      return { ok: true, via: "admin" };
    }
    return {
      ok: false,
      erro: "Sem permissão. Libere Editar em Status Técnico ou use service_role / secret de ingestão.",
      status: 403,
    };
  }

  return {
    ok: false,
    erro: "Não autorizado. Use Bearer service_role, secret de ingestão ou sessão admin (Status Técnico).",
    status: 401,
  };
}
