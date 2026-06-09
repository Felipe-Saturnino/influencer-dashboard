import { supabaseAnonKey, supabaseUrl } from "./supabase";

export type RecuperarSenhaStatus =
  | "success"
  | "not_found"
  | "inactive"
  | "email_error"
  | "config_error";

export type RecuperarSenhaResult =
  | { ok: true; status: RecuperarSenhaStatus }
  | { ok: false; error: string };

function resolveRecuperarSenhaUrl(): string {
  const base = (supabaseUrl ?? "").trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("Configuração da plataforma incompleta. Entre em contato com o suporte.");
  }
  return `${base}/functions/v1/recuperar-senha`;
}

export async function solicitarRecuperarSenha(email: string): Promise<RecuperarSenhaResult> {
  if (!supabaseAnonKey?.trim()) {
    return { ok: false, error: "Configuração da plataforma incompleta. Entre em contato com o suporte." };
  }

  const loginUrl =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  let res: Response;
  try {
    res = await fetch(resolveRecuperarSenhaUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        loginUrl,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "Falha na conexão. Verifique sua internet e tente novamente.",
    };
  }

  let parsed: { status?: RecuperarSenhaStatus; error?: string } = {};
  try {
    parsed = (await res.json()) as typeof parsed;
  } catch {
    return {
      ok: false,
      error: "Não foi possível processar a solicitação. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  if (!res.ok) {
    const msg = parsed.error?.trim();
    return {
      ok: false,
      error:
        msg ||
        "Não foi possível processar a solicitação. Se o problema persistir, entre em contato com o suporte.",
    };
  }

  const status = parsed.status;
  if (
    status === "success" ||
    status === "not_found" ||
    status === "inactive" ||
    status === "email_error" ||
    status === "config_error"
  ) {
    return { ok: true, status };
  }

  return {
    ok: false,
    error: "Não foi possível processar a solicitação. Se o problema persistir, entre em contato com o suporte.",
  };
}
