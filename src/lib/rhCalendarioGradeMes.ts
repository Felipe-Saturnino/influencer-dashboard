import { supabase } from "./supabase";
import type { RpcGradeCalendarioRow } from "./overviewPrestadorCalendarioHelpers";

/**
 * Grade do Calendário: `rh_calendario_grade_mes` (Estúdio aprovado + eo_/eog_).
 * A RPC devolve jsonb (array completo) — evita o limite PostgREST ~1000 linhas
 * de `RETURNS TABLE` (N prestadores × 31 dias).
 * `funcionarioIds` opcional restringe o payload (Meu Calendário / Time / Staff).
 * Escritório / horário comercial é mesclado no cliente via `mesclarGradeComHorarioComercialSintetico`.
 * Fallback para `rh_calendario_grade_escala_mes` se a RPC nova falhar.
 */

function normalizarLinhaGrade(raw: unknown): RpcGradeCalendarioRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const funcionario_id = String(r.funcionario_id ?? "").trim();
  if (!funcionario_id) return null;
  const diaRaw = r.dia_iso;
  const dia_iso =
    typeof diaRaw === "string"
      ? diaRaw.slice(0, 10)
      : diaRaw instanceof Date
        ? diaRaw.toISOString().slice(0, 10)
        : String(diaRaw ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia_iso)) return null;
  return {
    funcionario_id,
    dia_iso,
    valor: String(r.valor ?? "").trim(),
    area_key: String(r.area_key ?? "").trim(),
  };
}

/** Desembrulha formatos comuns do PostgREST / supabase-js para jsonb ou TABLE. */
function unwrapGradePayload(data: unknown): unknown {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.rows)) return obj.rows;
    for (const key of ["rh_calendario_grade_mes", "rh_calendario_grade_escala_mes"] as const) {
      const inner = obj[key];
      if (Array.isArray(inner)) return inner;
      if (typeof inner === "string") {
        try {
          const parsed = JSON.parse(inner) as unknown;
          if (Array.isArray(parsed)) return parsed;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return [];
}

/** Aceita jsonb (array) ou legado SETOF/TABLE (array de linhas). */
export function parseRhCalendarioGradeMesPayload(data: unknown): RpcGradeCalendarioRow[] {
  const payload = unwrapGradePayload(data);
  if (!Array.isArray(payload)) return [];
  const out: RpcGradeCalendarioRow[] = [];
  for (const item of payload) {
    const row = normalizarLinhaGrade(item);
    if (row) out.push(row);
  }
  return out;
}

function logRpcError(nome: string, error: { message?: string; code?: string; details?: string; hint?: string }) {
  console.error(nome, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

function rpcArgs(refMesIso: string, funcionarioIds?: string[] | null): Record<string, unknown> {
  const args: Record<string, unknown> = { p_ref_mes: refMesIso };
  if (funcionarioIds && funcionarioIds.length > 0) {
    args.p_funcionario_ids = funcionarioIds;
  }
  return args;
}

/** Erro típico quando a migração com `p_funcionario_ids` ainda não foi aplicada. */
function erroParametroFuncionarioIds(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("p_funcionario_ids") ||
    m.includes("funcionario_ids") ||
    m.includes("could not find") ||
    m.includes("does not exist") ||
    m.includes("no function matches")
  );
}

async function rpcGradeMes(
  nome: "rh_calendario_grade_mes" | "rh_calendario_grade_escala_mes",
  refMesIso: string,
  funcionarioIds?: string[] | null,
): Promise<{ data: unknown; error: { message?: string } | null }> {
  const comFiltro = await supabase.rpc(nome, rpcArgs(refMesIso, funcionarioIds));
  if (
    !comFiltro.error ||
    !funcionarioIds?.length ||
    !erroParametroFuncionarioIds(comFiltro.error.message)
  ) {
    return comFiltro;
  }
  // Migração ainda não aplicada: busca completa e filtra no cliente.
  const semFiltro = await supabase.rpc(nome, { p_ref_mes: refMesIso });
  if (semFiltro.error) return semFiltro;
  const ids = new Set(funcionarioIds);
  const rows = parseRhCalendarioGradeMesPayload(semFiltro.data).filter((r) => ids.has(r.funcionario_id));
  return { data: rows, error: null };
}

export async function carregarRhCalendarioGradeMes(
  refMesIso: string,
  funcionarioIds?: string[] | null,
): Promise<{
  rows: RpcGradeCalendarioRow[];
  error: Error | null;
  usedFallback: boolean;
}> {
  const primary = await rpcGradeMes("rh_calendario_grade_mes", refMesIso, funcionarioIds);
  if (!primary.error) {
    return {
      rows: parseRhCalendarioGradeMesPayload(primary.data),
      error: null,
      usedFallback: false,
    };
  }

  logRpcError("rh_calendario_grade_mes", primary.error);

  const legacy = await rpcGradeMes("rh_calendario_grade_escala_mes", refMesIso, funcionarioIds);
  if (!legacy.error) {
    return {
      rows: parseRhCalendarioGradeMesPayload(legacy.data),
      error: null,
      usedFallback: true,
    };
  }

  logRpcError("rh_calendario_grade_escala_mes", legacy.error);
  return {
    rows: [],
    error: new Error("Não foi possível carregar a escala do calendário."),
    usedFallback: false,
  };
}
