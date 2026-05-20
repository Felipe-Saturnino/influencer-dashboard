import { supabase } from "./supabase";

export type PortalRhAutorInfo = {
  nome: string;
  diretoria: string;
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
  const diretoria = (info?.diretoria ?? "").trim() || "RH";
  return `${nome} - ${diretoria} - ${fmtDataHoraPortalRh(dataIso)}`;
}

export async function carregarMetaAutoresPortalRh(userIds: string[]): Promise<Record<string, PortalRhAutorInfo>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", ids);
  const out: Record<string, PortalRhAutorInfo> = {};
  const emailsNorm: string[] = [];
  const emailPorUser = new Map<string, string>();

  for (const p of profs ?? []) {
    const row = p as { id: string; name: string | null; email: string | null };
    out[row.id] = { nome: (row.name ?? "").trim() || "Equipe", diretoria: "RH" };
    const em = (row.email ?? "").trim().toLowerCase();
    if (em) {
      emailsNorm.push(em);
      emailPorUser.set(row.id, em);
    }
  }

  if (emailsNorm.length === 0) return out;

  const uniqEmails = [...new Set(emailsNorm)];
  const orParts = uniqEmails.flatMap((e) => [`email_spin.ilike.${e}`, `email.ilike.${e}`]);
  const { data: funcs } = await supabase
    .from("rh_funcionarios")
    .select("email, email_spin, org_diretoria:rh_org_diretorias(nome)")
    .or(orParts.join(","));

  const dirPorEmail = new Map<string, string>();
  for (const f of funcs ?? []) {
    const row = f as {
      email: string | null;
      email_spin: string | null;
      org_diretoria: { nome: string } | { nome: string }[] | null;
    };
    const join = Array.isArray(row.org_diretoria) ? row.org_diretoria[0] : row.org_diretoria;
    const dirNome = (join?.nome ?? "").trim();
    if (!dirNome) continue;
    for (const em of [(row.email_spin ?? "").trim().toLowerCase(), (row.email ?? "").trim().toLowerCase()]) {
      if (em) dirPorEmail.set(em, dirNome);
    }
  }

  for (const uid of ids) {
    const em = emailPorUser.get(uid);
    if (em && dirPorEmail.has(em)) {
      out[uid] = { ...out[uid], diretoria: dirPorEmail.get(em)! };
    }
  }

  return out;
}

export function autorIdPostagem(row: {
  created_by?: string | null;
  published_by?: string | null;
}): string | null {
  return row.created_by ?? row.published_by ?? null;
}
