import { supabase } from "./supabase";
import type { DealerGenero, DealerJogo, DealerTurno } from "../types";
import type { RhFuncionario } from "../types/rhFuncionario";
import {
  staffEstudioSlugPrimarioParaSync,
  staffEstudioSlugsFromRow,
} from "../pages/rh/GestaoStaff/gestaoStaffEstudioHelpers";

import { timeOrganogramaIndicaGamePresenter } from "./rhPrestadorUsuarioSync";
import { primeiroUltimoNome } from "./nomePessoaFormat";

export function isGamePresenterTimeNome(nome: string | null | undefined): boolean {
  return timeOrganogramaIndicaGamePresenter(nome);
}

/** Prestador ativo/indisponível no time Game Presenter (mesma função que «dealer» no catálogo). */
export function prestadorQualificaParaElencoDealer(
  prestadorStatus: string | null | undefined,
  timeNome: string | null | undefined,
  timeStatus: string | null | undefined,
): boolean {
  const st = String(prestadorStatus ?? "").toLowerCase();
  if (st !== "ativo" && st !== "indisponivel") return false;
  if (String(timeStatus ?? "").toLowerCase() !== "ativo") return false;
  return isGamePresenterTimeNome(timeNome);
}

export type RhFuncionarioElencoEmbed = {
  id: string;
  status: string;
  org_time_id: string | null;
  rh_org_times: { nome: string; status?: string | null } | { nome: string; status?: string | null }[] | null;
};

export function prestadorEmbedQualificaElencoDealer(
  embed: RhFuncionarioElencoEmbed | null | undefined,
): boolean {
  if (!embed) return false;
  const timeRaw = embed.rh_org_times;
  const time = timeRaw == null ? null : Array.isArray(timeRaw) ? timeRaw[0] ?? null : timeRaw;
  return prestadorQualificaParaElencoDealer(embed.status, time?.nome, time?.status);
}

export async function removeDealerForRhFuncionarioId(
  rhFuncionarioId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await supabase.from("dealers").delete().eq("rh_funcionario_id", rhFuncionarioId);
  if (error) return { ok: false, reason: error.message };
  return { ok: true, reason: "removed_from_elenco" };
}

export { primeiroUltimoNome };

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
  if (ativo("futebol_brasileiro") || ativo("futebol_studio")) jogos.push("futebol_brasileiro");
  const vip = ativo("vip");
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
 * Mantém `dealers` alinhado ao elenco de **Game Presenter** (dealer = mesma função).
 * Cria/atualiza quando o prestador qualifica; remove o registro quando sai do time, é encerrado ou o time fica inativo.
 */
export async function syncGamePresenterDealerFromRhFuncionario(
  row: RhFuncionario,
): Promise<{ ok: boolean; reason?: string; dealerId?: string }> {
  if (!row.org_time_id || row.status === "encerrado") {
    return removeDealerForRhFuncionarioId(row.id);
  }

  const { data: timeRow, error: eT } = await supabase
    .from("rh_org_times")
    .select("nome,status")
    .eq("id", row.org_time_id)
    .maybeSingle();
  if (eT || !timeRow) {
    return removeDealerForRhFuncionarioId(row.id);
  }
  const tr = timeRow as { nome: string; status?: string | null };
  if (!prestadorQualificaParaElencoDealer(row.status, tr.nome, tr.status)) {
    return removeDealerForRhFuncionarioId(row.id);
  }

  const nick = (row.staff_nickname ?? "").trim() || primeiroUltimoNome(row.nome) || "Dealer";
  const nomeReal = primeiroUltimoNome(row.nome) || nick;
  const fotos = fotosDeRow(row);
  const genero = generoDeRow(row);
  const turno = staffTurnoTextoParaDealerTurno(row.staff_turno);
  const { jogos, vip } = staffSkillsParaJogosEVip(row.staff_skills as Record<string, unknown> | null);
  const slug = (row.staff_operadora_slug ?? "").trim() || null;
  const estudioSlugs = staffEstudioSlugsFromRow(row, {});
  const estudioSlug =
    staffEstudioSlugPrimarioParaSync(estudioSlugs) ?? ((row.staff_estudio_slug ?? "").trim() || null);
  const bio = bioDeRow(row);

  const payload = {
    nome_real: nomeReal,
    nickname: nick,
    fotos,
    genero,
    turno,
    jogos,
    estudio_slug: estudioSlug,
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
