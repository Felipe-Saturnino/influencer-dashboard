import { supabase } from "./supabase";

export type RhCalendarioIcsFeedErro = "sem_vinculo" | "sem_permissao" | "falha";

type RpcFeedRow = {
  ok?: boolean;
  token?: string;
  error?: string;
};

function mapErro(code: string | undefined): RhCalendarioIcsFeedErro {
  if (code === "sem_vinculo") return "sem_vinculo";
  if (code === "sem_permissao") return "sem_permissao";
  return "falha";
}

export function mensagemErroCalendarioIcsFeed(code: RhCalendarioIcsFeedErro): string {
  if (code === "sem_vinculo") {
    return "Não foi possível gerar o link. Confirme o vínculo de prestador no cadastro. Se o problema persistir, entre em contato com o suporte.";
  }
  if (code === "sem_permissao") {
    return "Você não tem permissão para visualizar este dashboard.";
  }
  return "Não foi possível gerar o link. Se o problema persistir, entre em contato com o suporte.";
}

export function urlPublicaCalendarioIcs(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
  return `${origin}/ics/calendario/${token}`;
}

async function rpcFeed(nome: "rh_calendario_ics_feed_obter" | "rh_calendario_ics_feed_regenerar"): Promise<
  { ok: true; token: string } | { ok: false; error: RhCalendarioIcsFeedErro }
> {
  const { data, error } = await supabase.rpc(nome);
  if (error) {
    console.error(`[${nome}]`, error);
    return { ok: false, error: "falha" };
  }
  const row = (data ?? null) as RpcFeedRow | null;
  const token = typeof row?.token === "string" ? row.token.trim() : "";
  if (row?.ok === true && token) return { ok: true, token };
  return { ok: false, error: mapErro(typeof row?.error === "string" ? row.error : undefined) };
}

export function obterFeedCalendarioIcs(): Promise<
  { ok: true; token: string } | { ok: false; error: RhCalendarioIcsFeedErro }
> {
  return rpcFeed("rh_calendario_ics_feed_obter");
}

export function regenerarFeedCalendarioIcs(): Promise<
  { ok: true; token: string } | { ok: false; error: RhCalendarioIcsFeedErro }
> {
  return rpcFeed("rh_calendario_ics_feed_regenerar");
}
