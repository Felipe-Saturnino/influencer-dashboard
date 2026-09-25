import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
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

async function fetchMesasPagina(select: string): Promise<Record<string, unknown>[]> {
  return fetchAllPages<Record<string, unknown>>(async (from, to) => {
    const res = await supabase
      .from("mesas_spin_cadastro")
      .select(select)
      .order("nome_mesa", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    return { data: (res.data ?? null) as Record<string, unknown>[] | null, error: res.error };
  });
}

/** Evita falha total quando colunas novas ainda não existem no PostgREST. */
export async function fetchMesasSpinCadastroRows(): Promise<MesaSpinCadastroRow[]> {
  const attempts = [MESAS_SELECT_COM_ESTUDIO, MESAS_SELECT_LEGADO, MESAS_SELECT_SEM_EMBED, MESAS_SELECT_LEGADO_SEM_EMBED];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const data = await fetchMesasPagina(attempts[i]!);
      return data.map((row) => normalizarMesaRow(row));
    } catch (e) {
      console.error(`mesas_spin_cadastro (tentativa ${i + 1}):`, e);
    }
  }

  throw new Error("Não foi possível carregar as mesas.");
}

async function fetchEstudiosPagina(select: string, soAtivos: boolean): Promise<Record<string, unknown>[]> {
  return fetchAllPages<Record<string, unknown>>(async (from, to) => {
    let q = supabase.from("estudios_spin").select(select);
    if (soAtivos) q = q.eq("ativo", true);
    const res = await q.order("nome", { ascending: true }).order("id", { ascending: true }).range(from, to);
    return { data: (res.data ?? null) as Record<string, unknown>[] | null, error: res.error };
  });
}

export async function fetchEstudiosSpinRows(): Promise<EstudioSpinRow[]> {
  try {
    const data = await fetchEstudiosPagina(ESTUDIOS_SELECT_COM_TURNOS, true);
    return data.map((row) => normalizarEstudioRow(row));
  } catch (e) {
    console.error("estudios_spin (com turnos):", e);
  }
  try {
    const data = await fetchEstudiosPagina(ESTUDIOS_SELECT_BASE, true);
    return data.map((row) => normalizarEstudioRow(row));
  } catch (e) {
    console.error("estudios_spin (base):", e);
    throw new Error("Não foi possível carregar os estúdios.");
  }
}

/** Estúdios inativos — só para resolver filtro de operadora em mesas legadas. */
export async function fetchEstudiosSpinJunctionRows(): Promise<EstudioSpinRow[]> {
  try {
    const data = await fetchEstudiosPagina(
      "id, slug, nome, tipo, ativo, created_at, updated_at, estudios_spin_operadoras(operadora_slug, operadoras(nome))",
      false,
    );
    return data.map((row) =>
      normalizarEstudioRow({
        ...row,
        turno_manha_inicio: null,
        turno_tarde_inicio: null,
        turno_noite_inicio: null,
      }),
    );
  } catch (e) {
    console.error("estudios_spin (junction):", e);
    throw new Error("Não foi possível carregar os estúdios.");
  }
}
