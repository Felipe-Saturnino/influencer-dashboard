import { supabase } from "../../../lib/supabase";
import type { EstudioSpinRow, MesaSpinCadastroRow } from "./gestaoMesasUi";

/** FK direta operadora_slug — obrigatório após mesas_spin_operadora_identificacao (PGRST201 / HTTP 300). */
const MESAS_OPERADORA_EMBED = "operadoras!mesas_spin_cadastro_operadora_slug_fkey(nome)";

const MESAS_SELECT_COM_ESTUDIO =
  `id, operadora_slug, estudio_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, ${MESAS_OPERADORA_EMBED}`;

const MESAS_SELECT_SEM_EMBED =
  "id, operadora_slug, estudio_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at";

const MESAS_SELECT_LEGADO =
  `id, operadora_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at, ${MESAS_OPERADORA_EMBED}`;

const MESAS_SELECT_LEGADO_SEM_EMBED =
  "id, operadora_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, mesa_identificacao_operadora, created_at, updated_at";

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
  const attempts = [MESAS_SELECT_COM_ESTUDIO, MESAS_SELECT_LEGADO, MESAS_SELECT_SEM_EMBED, MESAS_SELECT_LEGADO_SEM_EMBED];

  for (let i = 0; i < attempts.length; i++) {
    const select = attempts[i]!;
    const res = await supabase.from("mesas_spin_cadastro").select(select).order("nome_mesa", { ascending: true });
    if (!res.error) {
      return (res.data ?? []).map((row) => normalizarMesaRow(row as unknown as Record<string, unknown>));
    }
    console.error(`mesas_spin_cadastro (tentativa ${i + 1}):`, res.error);
  }

  return [];
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
