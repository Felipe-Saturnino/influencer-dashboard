import { isoDateBrasilFromInstant } from "./dateBrasil";
import { supabase } from "./supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "./supabasePaginate";

export const MSG_BLOQUEIO_AGENDA_CONTRATO =
  "Sem horas acordadas / contrato ativo, fale com o Gestor do Contrato.";

export const MSG_BLOQUEIO_AGENDA_INTERNO =
  "Influencer está com cadastro inativo. Realize a ativação na página Influencers para agendar.";

export const ERRO_DB_INFLUENCER_INATIVO = "influencer_cadastro_inativo";

export function isErroInfluencerCadastroInativo(message: string | undefined | null): boolean {
  return (message ?? "").includes(ERRO_DB_INFLUENCER_INATIVO);
}

export function horasDeResultado(duracaoHoras: number | null | undefined, duracaoMin: number | null | undefined): number {
  return (Number(duracaoHoras) || 0) + (Number(duracaoMin) || 0) / 60;
}

export function horasPendentesCota(
  acordadas: number | null | undefined,
  realizadasCiclo: number,
): number | null {
  if (acordadas == null || acordadas <= 0) return null;
  return Math.max(0, acordadas - realizadasCiclo);
}

export function deveInativarPorCota(
  acordadas: number | null | undefined,
  realizadasCiclo: number,
): boolean {
  if (acordadas == null || acordadas <= 0) return false;
  return realizadasCiclo >= acordadas;
}

export function parseHorasAcordadas(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function cadastroBloqueiaAgenda(status: string | null | undefined): boolean {
  const s = (status ?? "ativo").toLowerCase();
  return s === "inativo" || s === "cancelado";
}

export type PersonaBloqueioAgendaCota = "contrato" | "interno";

export async function verificarPodeAgendarPorStatus(influencerId: string): Promise<{
  podeAgendar: boolean;
  status: string;
  erroVerificacao: boolean;
}> {
  if (!influencerId.trim()) {
    return { podeAgendar: false, status: "inativo", erroVerificacao: false };
  }

  const { data, error } = await supabase
    .from("influencer_perfil")
    .select("status")
    .eq("id", influencerId)
    .maybeSingle();

  if (error) {
    console.error("verificarPodeAgendarPorStatus:", error);
    return { podeAgendar: false, status: "ativo", erroVerificacao: true };
  }

  const status = (data?.status as string | null | undefined) ?? "ativo";
  return {
    podeAgendar: !cadastroBloqueiaAgenda(status),
    status,
    erroVerificacao: false,
  };
}

export async function buscarHorasRealizadasCiclo(
  influencerId: string,
  cicloInicioIso: string | null | undefined,
): Promise<number> {
  const cicloData = isoDateBrasilFromInstant(cicloInicioIso);
  if (!influencerId.trim() || !cicloData) return 0;

  const lives = await fetchAllPages<{ id: string }>(async (from, to) =>
    supabase
      .from("lives")
      .select("id")
      .eq("influencer_id", influencerId)
      .eq("status", "realizada")
      .gte("data", cicloData)
      .order("id", { ascending: true })
      .range(from, to),
  );

  const resultados = await fetchLiveResultadosBatched<{
    live_id: string;
    duracao_horas: number | null;
    duracao_min: number | null;
  }>(lives.map((l) => l.id), async (ids) =>
    supabase
      .from("live_resultados")
      .select("live_id, duracao_horas, duracao_min")
      .in("live_id", ids),
  );

  return resultados.reduce(
    (acc, r) => acc + horasDeResultado(r.duracao_horas, r.duracao_min),
    0,
  );
}
