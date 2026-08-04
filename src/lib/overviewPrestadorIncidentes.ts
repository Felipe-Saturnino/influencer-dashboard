/** Agregação de Incidentes (estudio_incidentes) para Overview Prestador → KPIs de Mesa. */

import type { GameIdentityKey } from "./gameIdentityColors";
import { normalizarTipoJogoIncidente } from "./estudioIncidentesHelpers";
import type { EstudioIncidenteRow, IncidenteCategoria } from "./estudioIncidentesTypes";
import { GP_KPI_JOGOS_ORDEM } from "./gpKpiMetrics";

/** Categorias que entram em «Graves» no Detalhamento Diário. */
export const INCIDENTE_CATEGORIAS_GRAVES: IncidenteCategoria[] = [
  "oculto",
  "nao_avisado",
  "avisado_resolvido",
  "avisado_nao_resolvido",
];

export type IncidenteAggContagem = {
  total: number;
  casos: number;
  erros: number;
  graves: number;
};

export const INCIDENTE_AGG_ZERO: IncidenteAggContagem = {
  total: 0,
  casos: 0,
  erros: 0,
  graves: 0,
};

export function agregarContagemIncidentes(rows: EstudioIncidenteRow[]): IncidenteAggContagem {
  const out: IncidenteAggContagem = { ...INCIDENTE_AGG_ZERO };
  for (const r of rows) {
    out.total += 1;
    if (r.incidente === "caso") out.casos += 1;
    else if (r.incidente === "erro") out.erros += 1;
    else if (INCIDENTE_CATEGORIAS_GRAVES.includes(r.incidente)) out.graves += 1;
  }
  return out;
}

/** Mapeia `jogo` do incidente → identidade canónica (null se fora do escopo GP). */
export function incidenteJogoParaIdentity(jogo: string | null | undefined): GameIdentityKey | null {
  const k = normalizarTipoJogoIncidente(jogo);
  if (k === "blackjack") return "blackjack";
  if (k === "baccarat") return "baccarat";
  if (k === "fb") return "futebol_brasileiro";
  if (k === "roleta") return "roleta";
  return null;
}

export function contarIncidentesPorJogo(rows: EstudioIncidenteRow[]): Record<GameIdentityKey, number> {
  const out: Record<GameIdentityKey, number> = {
    blackjack: 0,
    baccarat: 0,
    futebol_brasileiro: 0,
    roleta: 0,
  };
  for (const r of rows) {
    const key = incidenteJogoParaIdentity(r.jogo);
    if (key) out[key] += 1;
  }
  return out;
}

export type IncidenteDiaLinha = IncidenteAggContagem & { dia: string };

export function agruparIncidentesPorDia(rows: EstudioIncidenteRow[]): IncidenteDiaLinha[] {
  const map = new Map<string, EstudioIncidenteRow[]>();
  for (const r of rows) {
    const d = String(r.data_rodada ?? "").slice(0, 10);
    if (!d) continue;
    const list = map.get(d) ?? [];
    list.push(r);
    map.set(d, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dia, list]) => ({ dia, ...agregarContagemIncidentes(list) }));
}

/** Ordem estável dos jogos com KPI e/ou incidentes. */
export function jogosComDadosOuIncidentes(
  jogosComKpi: Set<GameIdentityKey>,
  porJogoInc: Record<GameIdentityKey, number>,
): GameIdentityKey[] {
  return GP_KPI_JOGOS_ORDEM.filter((k) => jogosComKpi.has(k) || (porJogoInc[k] ?? 0) > 0);
}
