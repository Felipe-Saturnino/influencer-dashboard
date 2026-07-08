import { supabase } from "./supabase";
import type { CsAtendenteFiltroOption } from "../types/csAtendimento";

function normNomeTime(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function isCustomerServiceTimeNome(nome: string | null | undefined): boolean {
  return normNomeTime(nome ?? "") === "customer service";
}

type CsAtendenteRpcRow = { profile_id: string; nome: string | null };

export async function carregarAtendentesCustomerService(): Promise<CsAtendenteFiltroOption[]> {
  const { data, error } = await supabase.rpc("cs_atendimento_atendentes_listar");

  if (error) {
    console.error("[csAtendimento] atendentes", error);
    return [];
  }

  const rows = (data ?? []) as CsAtendenteRpcRow[];
  return rows
    .map((row) => ({
      profileId: row.profile_id,
      nome: row.nome?.trim() || "—",
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function unwrapCsEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
