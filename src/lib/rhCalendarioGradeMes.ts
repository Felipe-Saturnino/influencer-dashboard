import { supabase } from "./supabase";
import type { RpcGradeCalendarioRow } from "./overviewPrestadorCalendarioHelpers";

/**
 * Grade do Calendário: `rh_calendario_grade_mes` (Estúdio aprovado).
 * A RPC devolve jsonb (array completo) — evita o limite PostgREST ~1000 linhas
 * de `RETURNS TABLE` (N prestadores × 31 dias).
 * Escritório é mesclado no cliente via `mesclarGradeComEscritorioSintetico`.
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

/** Aceita jsonb (array) ou legado SETOF/TABLE (array de linhas). */
export function parseRhCalendarioGradeMesPayload(data: unknown): RpcGradeCalendarioRow[] {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(payload)) return [];
  const out: RpcGradeCalendarioRow[] = [];
  for (const item of payload) {
    const row = normalizarLinhaGrade(item);
    if (row) out.push(row);
  }
  return out;
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

  console.error("rh_calendario_grade_mes", primary.error);

  const legacy = await supabase.rpc("rh_calendario_grade_escala_mes", { p_ref_mes: refMesIso });
  if (!legacy.error) {
    return {
      rows: parseRhCalendarioGradeMesPayload(legacy.data),
      error: null,
      usedFallback: true,
    };
  }

  console.error("rh_calendario_grade_escala_mes", legacy.error);
  return {
    rows: [],
    error: new Error("Não foi possível carregar a escala do calendário."),
    usedFallback: false,
  };
}
