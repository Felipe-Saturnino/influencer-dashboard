import { supabase } from "./supabase";
import type { CampanhaLink } from "../types";

const DIAS_ATIVO = 30;

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fmtIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const day = iso.includes("T") ? iso.split("T")[0] : iso.slice(0, 10);
  return day || null;
}

type CampanhaLinkRow = {
  id: string;
  utm_source: string;
  operadora_slug: string;
  created_by: string | null;
  created_at: string;
};

/**
 * Carrega links gerados e deriva Status (Ativo = métricas nos últimos 30 dias) e Última Visita.
 */
export async function carregarCampanhaLinks(
  operadoraSlug: string | null,
): Promise<CampanhaLink[]> {
  let query = supabase
    .from("campanha_links")
    .select("id, utm_source, operadora_slug, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (operadoraSlug) {
    query = query.eq("operadora_slug", operadoraSlug);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Campanhas] Erro ao carregar campanha_links:", error.message);
    return [];
  }

  const rows = (data ?? []) as CampanhaLinkRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const nomeMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
    for (const p of profiles ?? []) {
      nomeMap.set(p.id, (p.name as string)?.trim() || "—");
    }
  }

  const utmSources = [...new Set(rows.map((r) => r.utm_source))];
  const opSlugs = [...new Set(rows.map((r) => r.operadora_slug))];
  const limiar = isoDateDaysAgo(DIAS_ATIVO);

  const ativoKeys = new Set<string>();
  const ultimaVisitaMap = new Map<string, string>();

  if (utmSources.length > 0) {
    let metQ = supabase
      .from("utm_metricas_diarias")
      .select("utm_source, operadora_slug, data, visit_count, registration_count, ftd_count")
      .in("utm_source", utmSources)
      .gte("data", limiar)
      .limit(5000);
    if (opSlugs.length === 1) {
      metQ = metQ.eq("operadora_slug", opSlugs[0]!);
    } else if (opSlugs.length > 1) {
      metQ = metQ.in("operadora_slug", opSlugs);
    }
    const { data: metricas } = await metQ;
    for (const m of metricas ?? []) {
      const visitas = Number(m.visit_count ?? 0);
      const regs = Number(m.registration_count ?? 0);
      const ftds = Number(m.ftd_count ?? 0);
      if (visitas + regs + ftds <= 0) continue;
      const key = `${m.utm_source}::${m.operadora_slug}`;
      ativoKeys.add(key);
      const dia = fmtIsoDate(m.data as string);
      if (!dia) continue;
      const prev = ultimaVisitaMap.get(key);
      if (!prev || dia > prev) ultimaVisitaMap.set(key, dia);
    }

    let aliasQ = supabase
      .from("utm_aliases")
      .select("utm_source, operadora_slug, ultimo_visto")
      .in("utm_source", utmSources)
      .limit(2000);
    if (opSlugs.length === 1) {
      aliasQ = aliasQ.eq("operadora_slug", opSlugs[0]!);
    } else if (opSlugs.length > 1) {
      aliasQ = aliasQ.in("operadora_slug", opSlugs);
    }
    const { data: aliases } = await aliasQ;
    for (const a of aliases ?? []) {
      const key = `${a.utm_source}::${a.operadora_slug ?? ""}`;
      const dia = fmtIsoDate(a.ultimo_visto as string | null);
      if (!dia) continue;
      const prev = ultimaVisitaMap.get(key);
      if (!prev || dia > prev) ultimaVisitaMap.set(key, dia);
    }
  }

  return rows.map((r) => {
    const key = `${r.utm_source}::${r.operadora_slug}`;
    return {
      id: r.id,
      utm_source: r.utm_source,
      operadora_slug: r.operadora_slug,
      created_by: r.created_by,
      created_at: r.created_at,
      usuario_nome: r.created_by ? (nomeMap.get(r.created_by) ?? "—") : "—",
      ultima_visita: ultimaVisitaMap.get(key) ?? null,
      ativo_30d: ativoKeys.has(key),
    };
  });
}
