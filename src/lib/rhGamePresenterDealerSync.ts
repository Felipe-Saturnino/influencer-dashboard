import { supabase } from "./supabase";
import type { DealerGenero, DealerJogo, DealerTurno } from "../types";
import type { RhFuncionario } from "../types/rhFuncionario";

export function isGamePresenterTimeNome(nome: string | null | undefined): boolean {
  const n = (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return n.replace(/\s+/g, " ") === "game presenter";
}

/** Primeiro e último token do nome (regra dealer). */
export function primeiroUltimoNome(nomeCompleto: string): string {
  const parts = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function staffTurnoTextoParaDealerTurno(raw: string | null | undefined): DealerTurno {
  const n = (raw ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const collapsed = n.replace(/\s+/g, " ");
  if (n.startsWith("manh")) return "manha";
  if (n.startsWith("tarde")) return "tarde";
  if (n.startsWith("noite")) return "noite";
  if (collapsed === "comercial" || collapsed.includes("horario comercial")) return "tarde";
  return "noite";
}

type DealerJogoCadastro = Exclude<DealerJogo, "mesa_vip">;

/** Skills em `ativo` viram jogos no dealer; skill `vip` ativa define `vip: true`. */
export function staffSkillsParaJogosEVip(skills: Record<string, unknown> | null | undefined): {
  jogos: DealerJogoCadastro[];
  vip: boolean;
} {
  const s = skills ?? {};
  const ativo = (k: string) => String(s[k] ?? "inativo").toLowerCase() === "ativo";
  const jogos: DealerJogoCadastro[] = [];
  if (ativo("baccarat")) jogos.push("baccarat");
  if (ativo("blackjack")) jogos.push("blackjack");
  if (ativo("roleta")) jogos.push("roleta");
  const vip = ativo("vip");
  if (jogos.length === 0) jogos.push("roleta");
  return { jogos, vip };
}

export function parseStaffDealerFotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

function generoDeRow(row: RhFuncionario): DealerGenero {
  const g = row.staff_dealer_genero;
  return g === "masculino" || g === "feminino" ? g : "feminino";
}

function bioDeRow(row: RhFuncionario): string | null {
  const t = (row.staff_dealer_bio ?? "").trim();
  return t ? t : null;
}

function fotosDeRow(row: RhFuncionario): string[] {
  return parseStaffDealerFotos(row.staff_dealer_fotos);
}

const TURNO_DEALER_LABEL: Record<DealerTurno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export function labelTurnoDealerSync(t: DealerTurno): string {
  return TURNO_DEALER_LABEL[t] ?? t;
}

export function readStaffDealerGeneroForUi(row: RhFuncionario): DealerGenero {
  return generoDeRow(row);
}

export function readStaffDealerBioForUi(row: RhFuncionario): string {
  return (row.staff_dealer_bio ?? "").trim();
}

export function readStaffDealerFotosForUi(row: RhFuncionario): string[] {
  return fotosDeRow(row);
}

/**
 * Cria ou atualiza `dealers` quando o prestador está no time **Game Presenter** (nome do time, case-insensitive).
 * Não altera dealers se o time não for GP ou se o prestador estiver encerrado.
 */
export async function syncGamePresenterDealerFromRhFuncionario(
  row: RhFuncionario,
): Promise<{ ok: boolean; reason?: string; dealerId?: string }> {
  if (!row.org_time_id) return { ok: true, reason: "no_org_time" };
  if (row.status === "encerrado") return { ok: true, reason: "prestador_encerrado" };

  const { data: timeRow, error: eT } = await supabase
    .from("rh_org_times")
    .select("nome,status")
    .eq("id", row.org_time_id)
    .maybeSingle();
  if (eT || !timeRow) return { ok: true, reason: "time_not_found" };
  const tr = timeRow as { nome: string; status?: string | null };
  if (String(tr.status ?? "").toLowerCase() !== "ativo") return { ok: true, reason: "time_inativo" };
  if (!isGamePresenterTimeNome(tr.nome)) return { ok: true, reason: "not_game_presenter" };

  const nick = (row.staff_nickname ?? "").trim() || primeiroUltimoNome(row.nome) || "Dealer";
  const nomeReal = primeiroUltimoNome(row.nome) || nick;
  const fotos = fotosDeRow(row);
  const genero = generoDeRow(row);
  const turno = staffTurnoTextoParaDealerTurno(row.staff_turno);
  const { jogos, vip } = staffSkillsParaJogosEVip(row.staff_skills as Record<string, unknown> | null);
  const slug = (row.staff_operadora_slug ?? "").trim() || null;
  const bio = bioDeRow(row);

  const payload = {
    nome_real: nomeReal,
    nickname: nick,
    fotos,
    genero,
    turno,
    jogos,
    operadora_slug: slug,
    perfil_influencer: bio,
    status: "aprovado" as const,
    vip,
    rh_funcionario_id: row.id,
  };

  const { data: existing, error: eEx } = await supabase.from("dealers").select("id").eq("rh_funcionario_id", row.id).maybeSingle();
  if (eEx) return { ok: false, reason: eEx.message };
  const exId = (existing as { id: string } | null)?.id;
  if (exId) {
    const { data: upd, error } = await supabase.from("dealers").update(payload).eq("id", exId).select("id").single();
    if (error) return { ok: false, reason: error.message };
    return { ok: true, dealerId: (upd as { id: string })?.id };
  }
  const { data: ins, error } = await supabase.from("dealers").insert(payload).select("id").single();
  if (error) return { ok: false, reason: error.message };
  return { ok: true, dealerId: (ins as { id: string })?.id };
}
