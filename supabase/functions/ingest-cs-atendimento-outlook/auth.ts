const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

export { supabaseServiceOptions };

export type AuthResult =
  | { ok: true; via: "service_role" | "ingest_secret" | "admin" }
  | { ok: false; erro: string; status: number; diagnostico?: AuthDiagnostico };

export type AuthDiagnostico = {
  bearer_jwt_role: string | null;
  apikey_jwt_role: string | null;
  bearer_confere_service_role: boolean;
  apikey_confere_service_role: boolean;
  tem_ingest_secret_configurado: boolean;
};

function jwtRoleClaim(token: string): string | null {
  if (!token || !token.includes(".")) return null;
  try {
    const part = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const pad = part.length % 4 === 0 ? "" : "=".repeat(4 - (part.length % 4));
    const payload = JSON.parse(atob(part + pad)) as Record<string, unknown>;
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function authDiagnostico(req: Request, serviceKey: string, ingestSecret: string): AuthDiagnostico {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  const apiKey = (req.headers.get("apikey") ?? req.headers.get("Apikey") ?? "").trim();
  return {
    bearer_jwt_role: jwtRoleClaim(bearer),
    apikey_jwt_role: jwtRoleClaim(apiKey),
    bearer_confere_service_role: Boolean(serviceKey && bearer === serviceKey),
    apikey_confere_service_role: Boolean(serviceKey && apiKey === serviceKey),
    tem_ingest_secret_configurado: Boolean(ingestSecret),
  };
}

function erroChaveAnon(campo: "Authorization" | "apikey"): AuthResult {
  return {
    ok: false,
    status: 401,
    erro:
      `A chave em **${campo}** é a **anon** (role=anon). Em Project Settings → API, copie a chave **service_role** (secret, linha de baixo) — não a anon.`,
  };
}

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

export async function validarChamadaIngest(
  req: Request,
  opts?: { bodySecret?: string },
): Promise<AuthResult> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const ingestSecret = Deno.env.get("CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET")?.trim() ?? "";
  const bodySecret = opts?.bodySecret?.trim() ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  const apiKey = (req.headers.get("apikey") ?? req.headers.get("Apikey") ?? "").trim();
  const diag = () => authDiagnostico(req, serviceKey, ingestSecret);

  const headerSecret =
    req.headers.get("x-cs-atendimento-outlook-ingest-secret") ??
    req.headers.get("X-Cs-Atendimento-Outlook-Ingest-Secret") ??
    "";

  if (ingestSecret && (headerSecret === ingestSecret || bodySecret === ingestSecret)) {
    return { ok: true, via: "ingest_secret" };
  }

  if (bodySecret && !ingestSecret) {
    return {
      ok: false,
      erro:
        "ingest_secret no body, mas CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET não está configurado nos Secrets da Edge Function.",
      status: 401,
      diagnostico: diag(),
    };
  }

  if (bodySecret && ingestSecret && bodySecret !== ingestSecret) {
    return {
      ok: false,
      erro: "ingest_secret no body não confere com CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET.",
      status: 401,
      diagnostico: diag(),
    };
  }

  // apikey primeiro — Role postgres no Dashboard pode sobrescrever Authorization
  if (serviceKey && apiKey === serviceKey) {
    return { ok: true, via: "service_role" };
  }
  if (serviceKey && bearer === serviceKey) {
    return { ok: true, via: "service_role" };
  }

  if (apiKey && jwtRoleClaim(apiKey) === "anon") {
    return { ...erroChaveAnon("apikey"), diagnostico: diag() };
  }
  if (bearer && jwtRoleClaim(bearer) === "anon") {
    return { ...erroChaveAnon("Authorization"), diagnostico: diag() };
  }

  if (bearer && anonKey && bearer === anonKey) {
    return {
      ok: false,
      erro:
        "Chave anon não autoriza esta função. Use service_role em apikey (Project Settings → API) ou header x-cs-atendimento-outlook-ingest-secret.",
      status: 401,
      diagnostico: diag(),
    };
  }

  if (!ingestSecret && !bearer && !apiKey && !bodySecret) {
    return {
      ok: false,
      erro:
        "Não autorizado. Configure CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET nos Secrets e envie no body: {\"auth_probe\":true,\"ingest_secret\":\"…\"} (teste no Dashboard Supabase).",
      status: 401,
      diagnostico: diag(),
    };
  }

  if (bearer && anonKey && supabaseUrl && bearer !== serviceKey) {
    const whoami = await resolveCaller(supabaseUrl, anonKey, bearer);
    if (!whoami.ok) {
      const bearerRole = jwtRoleClaim(bearer);
      let hint = whoami.error;
      if (whoami.status === 403) {
        hint =
          "Token do Role postgres/anonymous do Dashboard não vale aqui. Troque Role para **Anonymous**, deixe Authorization vazio e use só **apikey** com service_role — ou use x-cs-atendimento-outlook-ingest-secret.";
      } else if (bearerRole && bearerRole !== "service_role") {
        hint = `JWT role=${bearerRole}. Use apikey com service_role ou ingest secret.`;
      }
      return { ok: false, erro: hint, status: whoami.status, diagnostico: diag() };
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
      erro: "Sem permissão. Libere Editar em Status Técnico ou use apikey service_role / secret de ingestão.",
      status: 403,
      diagnostico: diag(),
    };
  }

  const roleApi = jwtRoleClaim(apiKey);
  const roleBearer = jwtRoleClaim(bearer);
  let erro =
    "Não autorizado. Header **apikey** com service_role (Project Settings → API) ou x-cs-atendimento-outlook-ingest-secret.";
  if (roleApi === "service_role" || roleBearer === "service_role") {
    erro +=
      " A chave parece service_role mas não confere com a function — confira se copiou a chave inteira e faça redeploy da function.";
  }
  if (ingestSecret) {
    erro += " Alternativa: header x-cs-atendimento-outlook-ingest-secret com o secret configurado.";
  }

  return {
    ok: false,
    erro,
    status: 401,
    diagnostico: diag(),
  };
}
