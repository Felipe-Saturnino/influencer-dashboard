import type { SupabaseClient } from "@supabase/supabase-js";
import {
  chavePresencaGestao,
  type PresencaCorrecaoMeta,
  type PresencaDiaGestao,
  type PresencaGestaoStatus,
  type PresencaJustificativaMeta,
} from "./rhCalendarioPresencaGestao";

export type RpcPresencaGestaoMesRow = {
  dia_iso: string | Date;
  status_gestao: PresencaGestaoStatus | null;
  correcao: PresencaCorrecaoMeta | null;
  justificativa: PresencaJustificativaMeta | null;
  historico: PresencaDiaGestao["historico"] | null;
};

function diaIsoFromRpc(raw: string | Date): string {
  if (typeof raw === "string") return raw.slice(0, 10);
  const d = new Date(raw);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mapRpcPresencaGestaoMesRow(row: RpcPresencaGestaoMesRow): { diaIso: string; gestao: PresencaDiaGestao } {
  return {
    diaIso: diaIsoFromRpc(row.dia_iso),
    gestao: {
      statusGestao: row.status_gestao ?? undefined,
      correcao: row.correcao ?? undefined,
      justificativa: row.justificativa ?? undefined,
      historico: row.historico ?? undefined,
    },
  };
}

export async function carregarPresencaGestaoMes(
  supabase: SupabaseClient,
  funcionarioId: string,
  refMesIso: string,
): Promise<{ mapa: Map<string, PresencaDiaGestao>; error: boolean }> {
  const mapa = new Map<string, PresencaDiaGestao>();
  const { data, error } = await supabase.rpc("rh_calendario_presenca_gestao_mes", {
    p_funcionario_id: funcionarioId,
    p_ref_mes: refMesIso,
  });
  if (error) return { mapa, error: true };
  for (const row of (data ?? []) as RpcPresencaGestaoMesRow[]) {
    const { diaIso, gestao } = mapRpcPresencaGestaoMesRow(row);
    mapa.set(chavePresencaGestao(funcionarioId, diaIso), gestao);
  }
  return { mapa, error: false };
}

type RpcPresencaGestaoDiaLoteRow = RpcPresencaGestaoMesRow & { funcionario_id: string };

/** Relatório diário: 1 RPC para gestão de vários funcionários no mesmo dia. */
export async function carregarPresencaGestaoDiaLote(
  supabase: SupabaseClient,
  funcionarioIds: string[],
  diaIso: string,
): Promise<{ mapa: Map<string, PresencaDiaGestao>; error: boolean }> {
  const mapa = new Map<string, PresencaDiaGestao>();
  if (funcionarioIds.length === 0) return { mapa, error: false };
  const { data, error } = await supabase.rpc("rh_calendario_presenca_gestao_dia_lote", {
    p_funcionario_ids: funcionarioIds,
    p_dia: diaIso,
  });
  if (error) return { mapa, error: true };
  for (const row of (data ?? []) as RpcPresencaGestaoDiaLoteRow[]) {
    const fid = typeof row.funcionario_id === "string" ? row.funcionario_id : "";
    if (!fid) continue;
    const { diaIso: d, gestao } = mapRpcPresencaGestaoMesRow(row);
    mapa.set(chavePresencaGestao(fid, d), gestao);
  }
  return { mapa, error: false };
}

/** Relatório diário: 1 RPC para ponto de vários funcionários no mesmo dia. */
export async function carregarPontoRegistrosDiaLote(
  supabase: SupabaseClient,
  funcionarioIds: string[],
  diaIso: string,
): Promise<{
  mapa: Map<string, { check_in_at: string | null; check_out_at: string | null }>;
  error: boolean;
}> {
  const mapa = new Map<string, { check_in_at: string | null; check_out_at: string | null }>();
  if (funcionarioIds.length === 0) return { mapa, error: false };
  const { data, error } = await supabase.rpc("rh_calendario_ponto_registros_dia_lote", {
    p_funcionario_ids: funcionarioIds,
    p_dia: diaIso,
  });
  if (error) return { mapa, error: true };
  for (const row of (data ?? []) as {
    funcionario_id: string;
    check_in_at: string | null;
    check_out_at: string | null;
  }[]) {
    const fid = typeof row.funcionario_id === "string" ? row.funcionario_id : "";
    if (!fid) continue;
    mapa.set(fid, { check_in_at: row.check_in_at, check_out_at: row.check_out_at });
  }
  return { mapa, error: false };
}

export async function salvarPresencaGestaoDia(
  supabase: SupabaseClient,
  funcionarioId: string,
  diaIso: string,
  gestao: PresencaDiaGestao,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.rpc("rh_calendario_presenca_gestao_salvar", {
    p_funcionario_id: funcionarioId,
    p_dia_iso: diaIso,
    p_status_gestao: gestao.statusGestao ?? null,
    p_correcao: gestao.correcao ?? null,
    p_justificativa: gestao.justificativa ?? null,
    p_historico: gestao.historico ?? [],
  });
  return { ok: !error };
}
