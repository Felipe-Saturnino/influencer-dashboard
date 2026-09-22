import { supabase } from "./supabase";
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
 * Falha fechada: sem RPC ou erro → sem liderança.
 */
export async function fetchRhLiderancaEscopo(
  funcionarioId?: string | null,
): Promise<RhLiderancaEscopo> {
  const id = (funcionarioId ?? "").trim() || null;
  const { data, error } = await supabase.rpc("rh_lideranca_escopo", {
    p_funcionario_id: id,
  });
  if (error) {
    console.error("[rh_lideranca_escopo]", error);
    return ESCOPO_VAZIO;
  }
  return parseEscopo(data);
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

export function unidadesParaFiltroTime(
  unidades: RhLiderancaUnidade[],
): { id: string; name: string }[] {
  return unidades
    .map((u) => ({ id: u.id, name: u.nome }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
