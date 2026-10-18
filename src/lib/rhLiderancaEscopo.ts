import { supabase } from "./supabase";
import { fetchAllPages } from "./supabasePaginate";
import type { RhFuncionario } from "../types/rhFuncionario";

export type RhLiderancaUnidadeTipo = "time" | "gerencia";

export type RhLiderancaUnidade = {
  id: string;
  tipo: RhLiderancaUnidadeTipo;
  nome: string;
  gerencia_id: string | null;
};

export type RhLiderancaEscopo = {
  funcionarioId: string | null;
  ehLider: boolean;
  unidades: RhLiderancaUnidade[];
  funcionarioIds: string[];
};

const ESCOPO_VAZIO: RhLiderancaEscopo = {
  funcionarioId: null,
  ehLider: false,
  unidades: [],
  funcionarioIds: [],
};

function asString(v: unknown): string {
  return String(v ?? "").trim();
}

function parseUnidade(raw: unknown): RhLiderancaUnidade | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  if (!id) return null;
  const tipo: RhLiderancaUnidadeTipo = r.tipo === "gerencia" ? "gerencia" : "time";
  return {
    id,
    tipo,
    nome: asString(r.nome) || (tipo === "gerencia" ? "Gerência" : "Time"),
    gerencia_id: asString(r.gerencia_id) || null,
  };
}

function parseEscopo(raw: unknown): RhLiderancaEscopo {
  if (!raw || typeof raw !== "object") return ESCOPO_VAZIO;
  const r = raw as Record<string, unknown>;
  const unidades = Array.isArray(r.unidades)
    ? r.unidades.map(parseUnidade).filter((u): u is RhLiderancaUnidade => Boolean(u))
    : [];
  const funcionarioIds = Array.isArray(r.funcionario_ids)
    ? r.funcionario_ids.map(asString).filter(Boolean)
    : [];
  return {
    funcionarioId: asString(r.funcionario_id) || null,
    ehLider: r.eh_lider === true,
    unidades,
    funcionarioIds,
  };
}

/**
 * Cascata Organograma do login (ou do prestador informado, se admin / Simulador).
 * Distingue falha de rede/RPC de «não é líder» (escopo vazio com ok).
 */
export type RhLiderancaEscopoFetch =
  | { ok: true; escopo: RhLiderancaEscopo }
  | { ok: false };

export async function fetchRhLiderancaEscopoResult(
  funcionarioId?: string | null,
): Promise<RhLiderancaEscopoFetch> {
  const id = (funcionarioId ?? "").trim() || null;
  const { data, error } = await supabase.rpc("rh_lideranca_escopo", {
    p_funcionario_id: id,
  });
  if (error) {
    console.error("[rh_lideranca_escopo]", error);
    return { ok: false };
  }
  return { ok: true, escopo: parseEscopo(data) };
}

/**
 * Cascata Organograma do login (ou do prestador informado, se admin / Simulador).
 * Falha fechada: sem RPC ou erro → sem liderança (use `fetchRhLiderancaEscopoResult` quando empty≠erro).
 */
export async function fetchRhLiderancaEscopo(
  funcionarioId?: string | null,
): Promise<RhLiderancaEscopo> {
  const r = await fetchRhLiderancaEscopoResult(funcionarioId);
  return r.ok ? r.escopo : ESCOPO_VAZIO;
}

/** `area_key` das abas já existentes da Escala Escritório (`eo_` / `eog_`). */
export function areaKeyEscritorioDaUnidade(u: Pick<RhLiderancaUnidade, "id" | "tipo">): string {
  const hex = (u.id ?? "").trim().toLowerCase().replace(/-/g, "");
  if (!hex) return u.tipo === "gerencia" ? "eog_unknown" : "eo_unknown";
  return u.tipo === "gerencia" ? `eog_${hex}` : `eo_${hex}`;
}

/** `area_key` das abas já existentes da Escala Escritório para as unidades lideradas. */
export function areaKeysEscritorioDasUnidades(unidades: RhLiderancaUnidade[]): Set<string> {
  return new Set(unidades.map(areaKeyEscritorioDaUnidade));
}

/**
 * Filtro Time: times da gerência quando ela tem filhos; a própria gerência
 * quando não tem time ativo abaixo. Mesma regra do Calendário.
 */
export function montarUnidadesFiltroTime(
  times: { id: string; nome: string; gerencia_id?: string | null }[],
  gerencias: { id: string; nome: string }[],
): RhLiderancaUnidade[] {
  const gerenciasComTime = new Set(
    times.map((t) => (t.gerencia_id ?? "").trim()).filter(Boolean),
  );
  const unidades: RhLiderancaUnidade[] = [];
  const seen = new Set<string>();
  for (const t of times) {
    const id = (t.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unidades.push({
      id,
      tipo: "time",
      nome: (t.nome ?? "").trim() || "Time",
      gerencia_id: (t.gerencia_id ?? "").trim() || null,
    });
  }
  for (const g of gerencias) {
    const id = (g.id ?? "").trim();
    if (!id || seen.has(id) || gerenciasComTime.has(id)) continue;
    seen.add(id);
    unidades.push({
      id,
      tipo: "gerencia",
      nome: (g.nome ?? "").trim() || "Gerência",
      gerencia_id: id,
    });
  }
  return unidades;
}

export function unidadesParaFiltroTime(
  unidades: RhLiderancaUnidade[],
): { id: string; name: string }[] {
  const times = unidades.filter((u) => u.tipo === "time");
  const gerenciasComTime = new Set(
    times.map((t) => (t.gerencia_id ?? "").trim()).filter(Boolean),
  );
  const seen = new Set<string>();
  return unidades
    .filter((u) => {
      if (!u.id || seen.has(u.id)) return false;
      if (u.tipo === "gerencia" && gerenciasComTime.has(u.id)) return false;
      seen.add(u.id);
      return true;
    })
    .map((u) => ({ id: u.id, name: u.nome }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Empresa inteira (Ver = Sim): times ativos + gerências sem time ativo. */
export async function fetchUnidadesFiltroTimeEmpresa(): Promise<RhLiderancaUnidade[]> {
  const [times, gerencias] = await Promise.all([
    fetchAllPages<{ id: string; nome: string; gerencia_id: string | null }>(async (from, to) => {
      const { data, error } = await supabase
        .from("rh_org_times")
        .select("id, nome, gerencia_id")
        .eq("status", "ativo")
        .order("nome", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
    fetchAllPages<{ id: string; nome: string }>(async (from, to) => {
      const { data, error } = await supabase
        .from("rh_org_gerencias")
        .select("id, nome")
        .eq("status", "ativo")
        .order("nome", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
  ]);
  return montarUnidadesFiltroTime(times, gerencias);
}

/** Prestadores da cascata (RPC SECURITY DEFINER — não exige Ver em rh_funcionarios). */
export async function fetchRhLiderancaPrestadores(
  funcionarioId?: string | null,
): Promise<RhFuncionario[]> {
  const id = (funcionarioId ?? "").trim() || null;
  const { data, error } = await supabase.rpc("rh_lideranca_prestadores", {
    p_funcionario_id: id,
  });
  if (error) {
    console.error("[rh_lideranca_prestadores]", error);
    return [];
  }
  return ((data ?? []) as RhFuncionario[]).sort((a, b) =>
    (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"),
  );
}
