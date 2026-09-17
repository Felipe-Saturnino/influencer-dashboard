import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched, LIVE_RESULTADOS_IN_CHUNK } from "./supabasePaginate";
import type { CampanhaLink } from "../types";

const DIAS_ATIVO = 30;
/** Lote seguro para `.in("utm_source", …)` / `.in("id", …)`. */
const UTM_IN_CHUNK = LIVE_RESULTADOS_IN_CHUNK;

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
  campanha_id: string | null;
  created_by: string | null;
  created_at: string;
};

type MetricaRow = {
  utm_source: string;
  operadora_slug: string;
  data: string;
  visit_count: number | null;
  registration_count: number | null;
  ftd_count: number | null;
};

type AliasVisitaRow = {
  utm_source: string;
  operadora_slug: string | null;
  ultimo_visto: string | null;
};

/**
 * Carrega links gerados e deriva Status (Ativo = métricas nos últimos 30 dias) e Última Visita.
 * Pagina `campanha_links` e loteia métricas/aliases — sem `.limit` arbitrário.
 */
export async function carregarCampanhaLinks(
  operadoraSlug: string | null,
): Promise<CampanhaLink[]> {
  const rows = await fetchAllPages<CampanhaLinkRow>(async (from, to) => {
    let query = supabase
      .from("campanha_links")
      .select("id, utm_source, operadora_slug, campanha_id, created_by, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (operadoraSlug) {
      query = query.eq("operadora_slug", operadoraSlug);
    }
    return query;
  });

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const nomeMap = new Map<string, string>();
  if (userIds.length > 0) {
    const profiles = await fetchInBatched(userIds, UTM_IN_CHUNK, async (slice) => {
      const { data, error } = await supabase.from("profiles").select("id, name").in("id", slice);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; name: string | null }[];
    });
    for (const p of profiles) {
      nomeMap.set(p.id, p.name?.trim() || "—");
    }
  }

  const utmSources = [...new Set(rows.map((r) => r.utm_source))];
  const opSlugs = [...new Set(rows.map((r) => r.operadora_slug))];
  const limiar = isoDateDaysAgo(DIAS_ATIVO);

  const ativoKeys = new Set<string>();
  const ultimaVisitaMap = new Map<string, string>();

  if (utmSources.length > 0) {
    const metricas = await fetchInBatched(utmSources, UTM_IN_CHUNK, async (slice) => {
      let metQ = supabase
        .from("utm_metricas_diarias")
        .select("utm_source, operadora_slug, data, visit_count, registration_count, ftd_count")
        .in("utm_source", slice)
        .gte("data", limiar);
      if (opSlugs.length === 1) {
        metQ = metQ.eq("operadora_slug", opSlugs[0]!);
      } else if (opSlugs.length > 1) {
        metQ = metQ.in("operadora_slug", opSlugs);
      }
      const { data, error } = await metQ;
      if (error) throw new Error(error.message);
      return (data ?? []) as MetricaRow[];
    });

    for (const m of metricas) {
      const visitas = Number(m.visit_count ?? 0);
      const regs = Number(m.registration_count ?? 0);
      const ftds = Number(m.ftd_count ?? 0);
      if (visitas + regs + ftds <= 0) continue;
      const key = `${m.utm_source}::${m.operadora_slug}`;
      ativoKeys.add(key);
      const dia = fmtIsoDate(m.data);
      if (!dia) continue;
      const prev = ultimaVisitaMap.get(key);
      if (!prev || dia > prev) ultimaVisitaMap.set(key, dia);
    }

    const aliases = await fetchInBatched(utmSources, UTM_IN_CHUNK, async (slice) => {
      let aliasQ = supabase
        .from("utm_aliases")
        .select("utm_source, operadora_slug, ultimo_visto")
        .in("utm_source", slice);
      if (opSlugs.length === 1) {
        aliasQ = aliasQ.eq("operadora_slug", opSlugs[0]!);
      } else if (opSlugs.length > 1) {
        aliasQ = aliasQ.in("operadora_slug", opSlugs);
      }
      const { data, error } = await aliasQ;
      if (error) throw new Error(error.message);
      return (data ?? []) as AliasVisitaRow[];
    });

    for (const a of aliases) {
      const key = `${a.utm_source}::${a.operadora_slug ?? ""}`;
      const dia = fmtIsoDate(a.ultimo_visto);
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
      campanha_id: r.campanha_id,
      created_by: r.created_by,
      created_at: r.created_at,
      usuario_nome: r.created_by ? (nomeMap.get(r.created_by) ?? "—") : "—",
      ultima_visita: ultimaVisitaMap.get(key) ?? null,
      ativo_30d: ativoKeys.has(key),
    };
  });
}
