/** Agregação de Incidentes (estudio_incidentes) para Overview Prestador → KPIs de Mesa. */

import type { GameIdentityKey } from "./gameIdentityColors";
import { normalizarTipoJogoIncidente } from "./estudioIncidentesHelpers";
import type { EstudioIncidenteRow, IncidenteCategoria } from "./estudioIncidentesTypes";
import { GP_KPI_JOGOS_ORDEM } from "./gpKpiMetrics";

/**
 * Erro no Overview Prestador = Erro + Não Avisados + Avisado/Não Resolvido.
 * Outros = Oculto + Avisado/Resolvido (ex-«Graves»).
 */
export const INCIDENTE_CATEGORIAS_ERRO: IncidenteCategoria[] = [
  "erro",
  "nao_avisado",
  "avisado_nao_resolvido",
];

export const INCIDENTE_CATEGORIAS_OUTROS: IncidenteCategoria[] = [
  "oculto",
  "avisado_resolvido",
];

export type IncidenteAggContagem = {
  total: number;
  casos: number;
  erros: number;
  outros: number;
};

export const INCIDENTE_AGG_ZERO: IncidenteAggContagem = {
  total: 0,
  casos: 0,
  erros: 0,
  outros: 0,
};

export function agregarContagemIncidentes(rows: EstudioIncidenteRow[]): IncidenteAggContagem {
  const out: IncidenteAggContagem = { ...INCIDENTE_AGG_ZERO };
  for (const r of rows) {
    out.total += 1;
    if (r.incidente === "caso") out.casos += 1;
    else if (INCIDENTE_CATEGORIAS_ERRO.includes(r.incidente)) out.erros += 1;
    else if (INCIDENTE_CATEGORIAS_OUTROS.includes(r.incidente)) out.outros += 1;
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

export type IncidenteJogoLinha = IncidenteAggContagem & {
  jogoKey: GameIdentityKey;
};

/** Agrega incidentes por jogo (contagens completas por categoria). */
export function agruparIncidentesPorJogo(
  rows: EstudioIncidenteRow[],
  jogosOrdem: GameIdentityKey[] = GP_KPI_JOGOS_ORDEM,
): IncidenteJogoLinha[] {
  const map = new Map<GameIdentityKey, EstudioIncidenteRow[]>();
  for (const r of rows) {
    const key = incidenteJogoParaIdentity(r.jogo);
    if (!key || !jogosOrdem.includes(key)) continue;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return jogosOrdem
    .filter((k) => map.has(k))
    .map((jogoKey) => ({
      jogoKey,
      ...agregarContagemIncidentes(map.get(jogoKey)!),
    }));
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

export type IncidentePrestadorLinha = IncidenteAggContagem & {
  prestadorId: string;
  nome: string;
  /** Placeholder até regra de produto. */
  severidade: "alta" | "media" | "ok";
};

export function agruparIncidentesPorPrestador(
  rows: EstudioIncidenteRow[],
  prestadores: { id: string; nome: string }[],
): IncidentePrestadorLinha[] {
  const porId = new Map<string, EstudioIncidenteRow[]>();
  for (const r of rows) {
    const id = String(r.prestador_id ?? "").trim();
    if (!id) continue;
    const list = porId.get(id) ?? [];
    list.push(r);
    porId.set(id, list);
  }
  const nomePorId = new Map(prestadores.map((p) => [p.id, p.nome]));
  const ids = new Set([...porId.keys(), ...prestadores.map((p) => p.id)]);
  return [...ids]
    .map((prestadorId) => {
      const agg = agregarContagemIncidentes(porId.get(prestadorId) ?? []);
      return {
        prestadorId,
        nome: nomePorId.get(prestadorId) ?? prestadorId,
        ...agg,
        severidade: "ok" as const,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Ordem estável dos jogos com KPI e/ou incidentes. */
export function jogosComDadosOuIncidentes(
  jogosComKpi: Set<GameIdentityKey>,
  porJogoInc: Record<GameIdentityKey, number>,
  jogosOrdem: GameIdentityKey[] = GP_KPI_JOGOS_ORDEM,
): GameIdentityKey[] {
  return jogosOrdem.filter((k) => jogosComKpi.has(k) || (porJogoInc[k] ?? 0) > 0);
}
