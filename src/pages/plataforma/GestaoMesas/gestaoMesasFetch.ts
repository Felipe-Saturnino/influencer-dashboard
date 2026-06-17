import { supabase } from "../../../lib/supabase";
import type { EstudioSpinRow, MesaSpinCadastroRow } from "./gestaoMesasUi";

const MESAS_SELECT_COM_ESTUDIO =
  "id, operadora_slug, estudio_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, operadoras(nome)";

const MESAS_SELECT_LEGADO =
  "id, operadora_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, operadoras(nome)";

const ESTUDIOS_SELECT_COM_TURNOS =
  "id, slug, nome, tipo, ativo, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio, created_at, updated_at, estudios_spin_operadoras(operadora_slug, operadoras(nome))";

const ESTUDIOS_SELECT_BASE =
  "id, slug, nome, tipo, ativo, created_at, updated_at, estudios_spin_operadoras(operadora_slug, operadoras(nome))";

function normalizarMesaRow(row: Record<string, unknown>): MesaSpinCadastroRow {
  return {
    ...(row as MesaSpinCadastroRow),
    estudio_slug: typeof row.estudio_slug === "string" ? row.estudio_slug : null,
    estudios_spin: null,
  };
}

function normalizarEstudioRow(row: Record<string, unknown>): EstudioSpinRow {
  return {
    ...(row as EstudioSpinRow),
    turno_manha_inicio: (row.turno_manha_inicio as string | null | undefined) ?? null,
    turno_tarde_inicio: (row.turno_tarde_inicio as string | null | undefined) ?? null,
    turno_noite_inicio: (row.turno_noite_inicio as string | null | undefined) ?? null,
  };
}

/** Evita falha total quando colunas novas ainda não existem no PostgREST. */
export async function fetchMesasSpinCadastroRows(): Promise<MesaSpinCadastroRow[]> {
  const full = await supabase
    .from("mesas_spin_cadastro")
    .select(MESAS_SELECT_COM_ESTUDIO)
    .order("nome_mesa", { ascending: true });

  const res = full.error
    ? await supabase
        .from("mesas_spin_cadastro")
        .select(MESAS_SELECT_LEGADO)
        .order("nome_mesa", { ascending: true })
    : full;

  if (full.error) {
    console.error("mesas_spin_cadastro (com estúdio):", full.error);
  }
  if (res.error) {
    console.error("mesas_spin_cadastro (legado):", res.error);
    return [];
  }

  return (res.data ?? []).map((row) => normalizarMesaRow(row as Record<string, unknown>));
}

export async function fetchEstudiosSpinRows(): Promise<EstudioSpinRow[]> {
  const full = await supabase
    .from("estudios_spin")
    .select(ESTUDIOS_SELECT_COM_TURNOS)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const res = full.error
    ? await supabase
        .from("estudios_spin")
        .select(ESTUDIOS_SELECT_BASE)
        .eq("ativo", true)
        .order("nome", { ascending: true })
    : full;

  if (full.error) {
    console.error("estudios_spin (com turnos):", full.error);
  }
  if (res.error) {
    console.error("estudios_spin (base):", res.error);
    return [];
  }

  return (res.data ?? []).map((row) => normalizarEstudioRow(row as Record<string, unknown>));
}

/** Estúdios inativos — só para resolver filtro de operadora em mesas legadas. */
export async function fetchEstudiosSpinJunctionRows(): Promise<EstudioSpinRow[]> {
  const res = await supabase
    .from("estudios_spin")
    .select("id, slug, nome, tipo, ativo, created_at, updated_at, estudios_spin_operadoras(operadora_slug, operadoras(nome))")
    .order("nome", { ascending: true });

  if (res.error) {
    console.error("estudios_spin (junction):", res.error);
    return [];
  }

  return (res.data ?? []).map((row) =>
    normalizarEstudioRow({
      ...(row as Record<string, unknown>),
      turno_manha_inicio: null,
      turno_tarde_inicio: null,
      turno_noite_inicio: null,
    }),
  );
}
