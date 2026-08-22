import { filtraFuncionariosParaLoginEmail } from "./rhFuncionarioLoginMatch";
import { carregarOpcoesTimesOrganograma } from "./rhOrganogramaFetch";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "./rhOrganogramaTree";
import { supabase } from "./supabase";
import type { RhFuncionario } from "../types/rhFuncionario";
import type { RhOrgPrestadorVinculoOpcao, RhOrgTimeOpcao } from "../types/rhOrganograma";

export type PortalRhAutorInfo = {
  nome: string;
  /** Time (ou gerência/diretoria se o vínculo for nesse nível) — nunca só a diretoria pai quando há time. */
  time: string;
};

/** Formato de rodapé: DD/MM/AA - HH:MM */
export function fmtDataHoraPortalRh(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${data} - ${hora}`;
  } catch {
    return "—";
  }
}

export function linhaMetaAutorPortalRh(info: PortalRhAutorInfo | undefined, dataIso: string | null | undefined): string {
  const nome = (info?.nome ?? "").trim() || "Equipe";
  const time = (info?.time ?? "").trim() || "—";
  return `${nome} - ${time} - ${fmtDataHoraPortalRh(dataIso)}`;
}

/** Nó mais específico do organograma: time → gerência → diretoria; fallback `setor`. */
export function timeNomeParaFuncionario(
  row: Pick<RhFuncionario, "org_time_id" | "org_gerencia_id" | "org_diretoria_id" | "setor">,
  vinculos: RhOrgPrestadorVinculoOpcao[],
  opcoesTimes: RhOrgTimeOpcao[],
): string {
  const o = encontrarVinculoParaFuncionarioRow(row, vinculos);
  if (o) {
    if (o.nivel === "time" && o.timeNome.trim()) return o.timeNome.trim();
    if (o.nivel === "gerencia" && o.gerenciaNome.trim()) return o.gerenciaNome.trim();
    if (o.diretoriaNome.trim()) return o.diretoriaNome.trim();
  }
  if (row.org_time_id) {
    const time = opcoesTimes.find((x) => x.timeId === row.org_time_id);
    if (time?.timeNome.trim()) return time.timeNome.trim();
  }
  const setor = (row.setor ?? "").trim();
  if (setor) return setor;
  return "—";
}

export async function carregarMetaAutoresPortalRh(userIds: string[]): Promise<Record<string, PortalRhAutorInfo>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const [{ data: profs }, orgPack, { data: funcRows }] = await Promise.all([
    supabase.from("profiles").select("id, name, email").in("id", ids),
    carregarOpcoesTimesOrganograma(),
    supabase
      .from("rh_funcionarios")
      .select("id, nome, email, email_spin, setor, org_time_id, org_gerencia_id, org_diretoria_id")
      .in("status", ["ativo", "indisponivel"]),
  ]);

  const vinculos = flattenVinculosDeGrupos(orgPack.grupos);
  const opcoesTimes = orgPack.opcoes;
  const prestadores = (funcRows ?? []) as RhFuncionario[];

  const out: Record<string, PortalRhAutorInfo> = {};

  for (const p of profs ?? []) {
    const row = p as { id: string; name: string | null; email: string | null };
    const emailLogin = (row.email ?? "").trim();
    let time = "—";
    let nome = (row.name ?? "").trim() || "Equipe";

    if (emailLogin) {
      const matches = filtraFuncionariosParaLoginEmail(prestadores, emailLogin);
      const func = matches[0];
      if (func) {
        time = timeNomeParaFuncionario(func, vinculos, opcoesTimes);
        if ((func.nome ?? "").trim()) nome = func.nome.trim();
      }
    }

    out[row.id] = { nome, time };
  }

  return out;
}

/**
 * Só nome do autor (profiles) — uso na Home, onde o rodapé não exibe time.
 * Evita organograma + dump de prestadores.
 */
export async function carregarNomesAutoresPortalRh(
  userIds: string[],
): Promise<Record<string, PortalRhAutorInfo>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
  const out: Record<string, PortalRhAutorInfo> = {};
  for (const p of profs ?? []) {
    const row = p as { id: string; name: string | null };
    out[row.id] = { nome: (row.name ?? "").trim() || "Equipe", time: "—" };
  }
  return out;
}

export function autorIdPostagem(row: {
  created_by?: string | null;
  published_by?: string | null;
}): string | null {
  return row.created_by ?? row.published_by ?? null;
}
