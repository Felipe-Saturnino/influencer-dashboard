import { supabaseAnonKey, supabaseUrl } from "./supabase";

export const MSG_PRESTADOR_PONTO_REDE =
  "Você deve estar logado na rede Spin Colaboradores para realizar o Check-in/Check-out.";

/** Janela de check-out após check-in (espelha Edge Function prestador-ponto). */
export const PRESTADOR_PONTO_JANELA_CHECKOUT_HORAS = 20;

export type PrestadorPontoEstado = {
  ok?: boolean;
  /** Dia civil atual (America/Sao_Paulo). */
  diaSp?: string;
  /** Dia do turno para o próximo registro (check-in aberto ou hoje). */
  turnoDiaSp?: string;
  cidrsConfigured?: boolean;
  clientIp?: string | null;
  ipPermitido?: boolean;
  escaladoHoje?: boolean;
  /** Escala no dia do turno (relevante para check-out noturno). */
  escaladoTurno?: boolean;
  /** Pode registrar o próximo ato; a escala é apenas informativa. */
  escaladoParaAcao?: boolean;
  rhFuncionarioId?: string | null;
  proximoTipo?: "check_in" | "check_out" | null;
  checkInAbertoAt?: string | null;
  janelaCheckoutHoras?: number;
  concluidoHoje?: boolean;
};

export type PrestadorPontoRegistroResumo = {
  tipo: "check_in" | "check_out";
  diaSp: string;
  createdAt?: string;
  funcionarioId?: string;
};

export type PrestadorPontoRegistrarResposta = {
  ok: boolean;
  error?: string;
  code?: string;
  estado?: PrestadorPontoEstado;
  /** Dia/tipo gravados neste POST (útil após check-out noturno). */
  registro?: PrestadorPontoRegistroResumo;
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
