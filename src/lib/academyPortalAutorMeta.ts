import { supabase } from "./supabase";

export type AcademyPortalAutorInfo = {
  nome: string;
};

export function fmtDataHoraPortalAcademy(iso: string | null | undefined): string {
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

export function linhaMetaAutorPortalAcademy(info: AcademyPortalAutorInfo | undefined, dataIso: string | null | undefined): string {
  const nome = (info?.nome ?? "").trim() || "Equipe Academy";
  return `${nome} - ${fmtDataHoraPortalAcademy(dataIso)}`;
}

export function autorIdPostagem(row: { created_by?: string | null; published_by?: string | null }): string | null {
  return row.created_by ?? row.published_by ?? null;
}

export async function carregarMetaAutoresPortalAcademy(userIds: string[]): Promise<Record<string, AcademyPortalAutorInfo>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
  const out: Record<string, AcademyPortalAutorInfo> = {};
  for (const p of profs ?? []) {
    const row = p as { id: string; name: string | null };
    out[row.id] = { nome: (row.name ?? "").trim() || "Equipe Academy" };
  }
  return out;
}
