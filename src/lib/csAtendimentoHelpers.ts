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

export async function carregarAtendentesCustomerService(): Promise<CsAtendenteFiltroOption[]> {
  const { data: times, error: errTimes } = await supabase
    .from("rh_org_times")
    .select("id, nome")
    .eq("ativo", true);

  if (errTimes) {
    console.error("[csAtendimento] times", errTimes);
    return [];
  }

  const timeIds = (times ?? []).filter((t) => isCustomerServiceTimeNome(t.nome)).map((t) => t.id);
  if (timeIds.length === 0) return [];

  const { data: funcs, error: errFuncs } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, email_spin, email")
    .in("org_time_id", timeIds)
    .in("status", ["ativo", "indisponivel"])
    .order("nome", { ascending: true });

  if (errFuncs) {
    console.error("[csAtendimento] funcionarios", errFuncs);
    return [];
  }

  const emails = new Set<string>();
  for (const f of funcs ?? []) {
    const spin = f.email_spin?.trim().toLowerCase();
    const pessoal = f.email?.trim().toLowerCase();
    if (spin) emails.add(spin);
    if (pessoal) emails.add(pessoal);
  }

  if (emails.size === 0) {
    return (funcs ?? []).map((f) => ({
      profileId: f.id,
      nome: f.nome?.trim() || "—",
    }));
  }

  const { data: profiles, error: errProfiles } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("email", [...emails]);

  if (errProfiles) {
    console.error("[csAtendimento] profiles", errProfiles);
    return (funcs ?? []).map((f) => ({
      profileId: f.id,
      nome: f.nome?.trim() || "—",
    }));
  }

  const profilePorEmail = new Map<string, { id: string; name: string | null }>();
  for (const p of profiles ?? []) {
    const em = p.email?.trim().toLowerCase();
    if (em) profilePorEmail.set(em, { id: p.id, name: p.name });
  }

  const out: CsAtendenteFiltroOption[] = [];
  const seen = new Set<string>();

  for (const f of funcs ?? []) {
    const spin = f.email_spin?.trim().toLowerCase();
    const pessoal = f.email?.trim().toLowerCase();
    const prof = (spin && profilePorEmail.get(spin)) || (pessoal && profilePorEmail.get(pessoal));
    const profileId = prof?.id ?? f.id;
    if (seen.has(profileId)) continue;
    seen.add(profileId);
    out.push({
      profileId,
      nome: f.nome?.trim() || prof?.name?.trim() || "—",
    });
  }

  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function unwrapCsEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
