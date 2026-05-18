import { supabaseAnonKey, supabaseUrl } from "./supabase";

export const MSG_PRESTADOR_PONTO_REDE =
  "Você deve estar logado na rede Spin Colaboradores para realizar o Check-in/Check-out.";

export type PrestadorPontoEstado = {
  ok?: boolean;
  diaSp?: string;
  cidrsConfigured?: boolean;
  clientIp?: string | null;
  ipPermitido?: boolean;
  escaladoHoje?: boolean;
  rhFuncionarioId?: string | null;
  proximoTipo?: "check_in" | "check_out" | null;
  concluidoHoje?: boolean;
};

export type PrestadorPontoRegistrarResposta = {
  ok: boolean;
  error?: string;
  code?: string;
  estado?: PrestadorPontoEstado;
};

function functionsBase(): string {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/prestador-ponto`;
}

export async function obterPrestadorPontoEstado(accessToken: string): Promise<PrestadorPontoEstado | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const res = await fetch(`${functionsBase()}?action=estado`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });
  const j = (await res.json()) as PrestadorPontoEstado;
  if (!res.ok || j?.ok !== true) return null;
  return j;
}

export async function registrarPrestadorPonto(accessToken: string): Promise<PrestadorPontoRegistrarResposta> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: "Configuração do Supabase incompleta.", code: "config" };
  }
  const res = await fetch(functionsBase(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "registrar" }),
  });
  return (await res.json()) as PrestadorPontoRegistrarResposta;
}
