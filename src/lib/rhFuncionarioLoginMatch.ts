import { supabase } from "./supabase";
import type { RhFuncionario } from "../types/rhFuncionario";

/** Prestadores cujo e-mail pessoal ou E-mail Spin coincide com o login (comparação normalizada). */
export function filtraFuncionariosParaLoginEmail(rows: RhFuncionario[], loginEmail: string): RhFuncionario[] {
  const n = loginEmail.trim().toLowerCase();
  return rows.filter((r) => {
    const em = (r.email ?? "").trim().toLowerCase();
    const sp = (r.email_spin ?? "").trim().toLowerCase();
    return em === n || (sp.length > 0 && sp === n);
  });
}

/**
 * IDs em `rh_funcionarios` ligados ao login atual — mesmo critério que Dados de Cadastro / sync prestador.
 * Usado p.ex. em Figurinos (permissão «Próprios») para casar `borrower_ref` da retirada.
 */
export async function buscarRhFuncionarioIdsPorEmailLogin(emailRaw: string | null | undefined): Promise<string[]> {
  const emailNorm = emailRaw?.trim();
  if (!emailNorm) return [];
  const emailLc = emailNorm.toLowerCase();
  const [byEmail, bySpin] = await Promise.all([
    supabase.from("rh_funcionarios").select("id,email,email_spin,status").ilike("email", emailNorm),
    supabase.from("rh_funcionarios").select("id,email,email_spin,status").not("email_spin", "is", null).ilike("email_spin", emailNorm),
  ]);
  if (byEmail.error || bySpin.error) return [];
  const map = new Map<string, RhFuncionario>();
  for (const r of [...(byEmail.data ?? []), ...(bySpin.data ?? [])] as RhFuncionario[]) {
    map.set(r.id, r);
  }
  const filtered = filtraFuncionariosParaLoginEmail([...map.values()], emailLc).filter((r) => r.status !== "encerrado");
  return [...new Set(filtered.map((r) => r.id))];
}

/**
 * Primeiro `rh_funcionarios` ativo/indisponível alinhado ao e-mail de login (e-mail ou e-mail Spin).
 * Mesma lógica da vista «Próprios» do Calendário RH.
 */
export async function buscarRhFuncionarioAtivoPorEmailLogin(emailBruto: string): Promise<RhFuncionario | null> {
  const em = emailBruto.trim();
  if (!em) return null;
  const el = em.toLowerCase();
  const { data: porEmailEq } = await supabase
    .from("rh_funcionarios")
    .select("*")
    .eq("email", em)
    .in("status", ["ativo", "indisponivel"])
    .maybeSingle();
  let row: RhFuncionario | null = (porEmailEq as RhFuncionario | null) ?? null;
  if (!row) {
    const { data: porSpinEq } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .eq("email_spin", em)
      .in("status", ["ativo", "indisponivel"])
      .maybeSingle();
    row = (porSpinEq as RhFuncionario | null) ?? null;
  }
  if (!row) {
    const { data: cand } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .in("status", ["ativo", "indisponivel"])
      .limit(80);
    row =
      (cand as RhFuncionario[] | undefined)?.find(
        (p) =>
          (p.email ?? "").trim().toLowerCase() === el ||
          (Boolean((p.email_spin ?? "").trim()) && (p.email_spin ?? "").trim().toLowerCase() === el),
      ) ?? null;
  }
  return row;
}
