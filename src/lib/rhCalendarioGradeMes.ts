import { supabase } from "./supabase";
import type { RpcGradeCalendarioRow } from "./overviewPrestadorCalendarioHelpers";

/**
 * Grade do Calendário: `rh_calendario_grade_mes` (Estúdio aprovado + eo_/eog_).
 * A RPC devolve jsonb (array completo) — evita o limite PostgREST ~1000 linhas
 * de `RETURNS TABLE` (N prestadores × 31 dias).
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
  // Dupla serialização ocasional
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
    // Resposta envelopada pelo nome da função
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

export async function carregarRhCalendarioGradeMes(refMesIso: string): Promise<{
  rows: RpcGradeCalendarioRow[];
  error: Error | null;
  usedFallback: boolean;
}> {
  const primary = await supabase.rpc("rh_calendario_grade_mes", { p_ref_mes: refMesIso });
  if (!primary.error) {
    return {
      rows: parseRhCalendarioGradeMesPayload(primary.data),
      error: null,
      usedFallback: false,
    };
  }

  logRpcError("rh_calendario_grade_mes", primary.error);

  const legacy = await supabase.rpc("rh_calendario_grade_escala_mes", { p_ref_mes: refMesIso });
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
