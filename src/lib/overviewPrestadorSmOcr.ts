/** Agregações KPIs de OCR (Service Manager) — Sinais (`sm_sinais`) + Tickets (`estudio_incidentes` pelo relator). */

import { GAME_IDENTITY_LABEL, type GameIdentityKey } from "./gameIdentityColors";
import { GP_KPI_JOGOS_ORDEM, normalizarTipoJogoGpKpi } from "./gpKpiMetrics";
import type { EstudioIncidenteRow } from "./estudioIncidentesTypes";
import type { SmSinalRow } from "./smSinaisTypes";
import {
  calcularKpisSinais,
  mediaMs,
  tmaAtendimentoMs,
  tmaResolucaoMs,
  tmaTotalMs,
  type SmSinalKpis,
} from "./smSinaisHelpers";

export type SmOcrMetricas = SmSinalKpis & { tickets: number };

export type SmOcrLinhaBase = SmOcrMetricas & {
  key: string;
  label: string;
};

export type SmOcrJogoLinha = SmOcrLinhaBase & { jogoKey: GameIdentityKey | "outro" };

export type SmOcrMesaLinha = SmOcrLinhaBase & {
  mesaId: string | null;
  tableId: string;
};

export type SmOcrEstudioLinha = SmOcrLinhaBase & {
  estudioSlug: string;
  mesas: SmOcrMesaLinha[];
};

export type SmOcrPrestadorLinha = SmOcrLinhaBase & { prestadorId: string };

export type SmOcrDiaLinha = SmOcrMetricas & { dia: string };

function metricasDeSinaisETickets(sinais: SmSinalRow[], tickets: number): SmOcrMetricas {
  const k = calcularKpisSinais(sinais);
  return { ...k, tickets };
}

function jogoKeyDeSinal(r: SmSinalRow): GameIdentityKey | "outro" {
  const fromType = normalizarTipoJogoGpKpi(r.game_type);
  if (fromType) return fromType;
  const fromMesa = normalizarTipoJogoGpKpi(r.mesa?.tipo_jogo);
  if (fromMesa) return fromMesa;
  return "outro";
}

function jogoKeyDeTicket(r: EstudioIncidenteRow): GameIdentityKey | "outro" {
  return normalizarTipoJogoGpKpi(r.jogo) ?? "outro";
}

function labelJogo(key: GameIdentityKey | "outro"): string {
  if (key === "outro") return "Outro";
  return GAME_IDENTITY_LABEL[key];
}

function mesaLabel(r: SmSinalRow): string {
  const nome = (r.mesa?.nome_mesa ?? "").trim();
  if (nome) return nome;
  const num = (r.mesa?.numero_mesa ?? "").trim();
  if (num) return `Mesa ${num}`;
  const tid = (r.table_id ?? "").trim();
  return tid || "—";
}

function mesaKey(r: SmSinalRow): string {
  const mid = (r.mesa_id ?? "").trim();
  if (mid) return mid;
  return `t:${(r.table_id ?? "").trim() || "?"}`;
}

/** Filtra sinais do SM (resolver) no escopo. */
export function filtrarSinaisPorResolvers(
  rows: SmSinalRow[],
  funcionarioIds: string[],
): SmSinalRow[] {
  const set = new Set(funcionarioIds.map((x) => x.trim()).filter(Boolean));
  if (set.size === 0) return [];
  return rows.filter((r) => {
    const id = (r.resolver_funcionario_id ?? "").trim();
    return id && set.has(id);
  });
}

/**
 * Filtra tickets cujo relator é um dos SMs do escopo.
 * `profileIdPorFuncionario` = mapa rh_funcionarios.id → profiles.id.
 */
export function filtrarTicketsPorRelatoresSm(
  rows: EstudioIncidenteRow[],
  funcionarioIds: string[],
  profileIdPorFuncionario: Map<string, string>,
  nomePorFuncionario: Map<string, string>,
): EstudioIncidenteRow[] {
  const profileIds = new Set<string>();
  const nomes = new Set<string>();
  for (const fid of funcionarioIds) {
    const pid = profileIdPorFuncionario.get(fid);
    if (pid) profileIds.add(pid);
    const nome = (nomePorFuncionario.get(fid) ?? "").trim().toLowerCase();
    if (nome) nomes.add(nome);
  }
  if (profileIds.size === 0 && nomes.size === 0) return [];
  return rows.filter((r) => {
    const uid = (r.relator_user_id ?? "").trim();
    if (uid && profileIds.has(uid)) return true;
    const nome = (r.relator_nome ?? "").trim().toLowerCase();
    return Boolean(nome && nomes.has(nome));
  });
}

/** Prestador SM dono do ticket (relator → funcionarioId). */
export function funcionarioIdDoRelatorTicket(
  row: EstudioIncidenteRow,
  funcionarioIdPorProfile: Map<string, string>,
  funcionarioIdPorNome: Map<string, string>,
): string | null {
  const uid = (row.relator_user_id ?? "").trim();
  if (uid) {
    const fid = funcionarioIdPorProfile.get(uid);
    if (fid) return fid;
  }
  const nome = (row.relator_nome ?? "").trim().toLowerCase();
  if (nome) return funcionarioIdPorNome.get(nome) ?? null;
  return null;
}

export function agregarSmOcrPorJogo(
  sinais: SmSinalRow[],
  tickets: EstudioIncidenteRow[],
): SmOcrJogoLinha[] {
  const ordem: Array<GameIdentityKey | "outro"> = [...GP_KPI_JOGOS_ORDEM, "outro"];
  const sinaisMap = new Map<GameIdentityKey | "outro", SmSinalRow[]>();
  const ticketsMap = new Map<GameIdentityKey | "outro", number>();
  for (const r of sinais) {
    const k = jogoKeyDeSinal(r);
    const list = sinaisMap.get(k) ?? [];
    list.push(r);
    sinaisMap.set(k, list);
  }
  for (const r of tickets) {
    const k = jogoKeyDeTicket(r);
    ticketsMap.set(k, (ticketsMap.get(k) ?? 0) + 1);
  }
  return ordem
    .filter((k) => (sinaisMap.get(k)?.length ?? 0) > 0 || (ticketsMap.get(k) ?? 0) > 0)
    .map((jogoKey) => ({
      key: jogoKey,
      label: labelJogo(jogoKey),
      jogoKey,
      ...metricasDeSinaisETickets(sinaisMap.get(jogoKey) ?? [], ticketsMap.get(jogoKey) ?? 0),
    }));
}

export function agregarSmOcrPorEstudio(
  sinais: SmSinalRow[],
  tickets: EstudioIncidenteRow[],
  estudioNomePorSlug: Record<string, string>,
): SmOcrEstudioLinha[] {
  const sinaisPorEst = new Map<string, SmSinalRow[]>();
  const ticketsPorEst = new Map<string, number>();
  for (const r of sinais) {
    const slug = (r.estudio_slug ?? "").trim() || "_sem_estudio";
    const list = sinaisPorEst.get(slug) ?? [];
    list.push(r);
    sinaisPorEst.set(slug, list);
  }
  for (const r of tickets) {
    const slug = (r.estudio_slug ?? "").trim() || "_sem_estudio";
    ticketsPorEst.set(slug, (ticketsPorEst.get(slug) ?? 0) + 1);
  }
  const slugs = new Set([...sinaisPorEst.keys(), ...ticketsPorEst.keys()]);
  const out: SmOcrEstudioLinha[] = [];
  for (const slug of slugs) {
    const sinaisEst = sinaisPorEst.get(slug) ?? [];
    const ticketsEst = ticketsPorEst.get(slug) ?? 0;
    const porMesa = new Map<string, SmSinalRow[]>();
    for (const s of sinaisEst) {
      const mk = mesaKey(s);
      const list = porMesa.get(mk) ?? [];
      list.push(s);
      porMesa.set(mk, list);
    }
    // Tickets sem mesa no drilldown de sinais — agrupa em linha “Tickets (sem sinal)” se houver tickets sem mesa match
    const mesas: SmOcrMesaLinha[] = [...porMesa.entries()]
      .map(([mk, list]) => {
        const sample = list[0]!;
        return {
          key: mk,
          label: mesaLabel(sample),
          mesaId: (sample.mesa_id ?? "").trim() || null,
          tableId: (sample.table_id ?? "").trim(),
          ...metricasDeSinaisETickets(list, 0),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    // Distribui tickets por mesa_id quando possível
    const ticketsPorMesa = new Map<string, number>();
    let ticketsSemMesa = 0;
    for (const t of tickets) {
      const tSlug = (t.estudio_slug ?? "").trim() || "_sem_estudio";
      if (tSlug !== slug) continue;
      const mid = (t.mesa_id ?? "").trim();
      if (!mid) {
        ticketsSemMesa += 1;
        continue;
      }
      ticketsPorMesa.set(mid, (ticketsPorMesa.get(mid) ?? 0) + 1);
    }
    for (const m of mesas) {
      if (m.mesaId) m.tickets = ticketsPorMesa.get(m.mesaId) ?? 0;
    }
    if (ticketsSemMesa > 0) {
      mesas.push({
        key: `${slug}:tickets-sem-mesa`,
        label: "Tickets sem mesa",
        mesaId: null,
        tableId: "",
        total: 0,
        tmaTotalMs: null,
        tmaAtendimentoMs: null,
        tmaResolucaoMs: null,
        tickets: ticketsSemMesa,
      });
    }

    out.push({
      key: slug,
      label:
        slug === "_sem_estudio"
          ? "Sem estúdio"
          : (estudioNomePorSlug[slug] ?? slug),
      estudioSlug: slug === "_sem_estudio" ? "" : slug,
      ...metricasDeSinaisETickets(sinaisEst, ticketsEst),
      mesas,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function agregarSmOcrPorPrestador(
  sinais: SmSinalRow[],
  tickets: EstudioIncidenteRow[],
  prestadores: { id: string; nome: string }[],
  funcionarioIdPorProfile: Map<string, string>,
  funcionarioIdPorNome: Map<string, string>,
): SmOcrPrestadorLinha[] {
  const sinaisPor = new Map<string, SmSinalRow[]>();
  for (const r of sinais) {
    const id = (r.resolver_funcionario_id ?? "").trim();
    if (!id) continue;
    const list = sinaisPor.get(id) ?? [];
    list.push(r);
    sinaisPor.set(id, list);
  }
  const ticketsPor = new Map<string, number>();
  for (const r of tickets) {
    const fid = funcionarioIdDoRelatorTicket(r, funcionarioIdPorProfile, funcionarioIdPorNome);
    if (!fid) continue;
    ticketsPor.set(fid, (ticketsPor.get(fid) ?? 0) + 1);
  }
  const ids = new Set([
    ...prestadores.map((p) => p.id),
    ...sinaisPor.keys(),
    ...ticketsPor.keys(),
  ]);
  const nomePorId = new Map(prestadores.map((p) => [p.id, p.nome]));
  return [...ids]
    .map((prestadorId) => {
      const sinaisP = sinaisPor.get(prestadorId) ?? [];
      const ticketsP = ticketsPor.get(prestadorId) ?? 0;
      return {
        key: prestadorId,
        prestadorId,
        label: nomePorId.get(prestadorId) ?? prestadorId,
        ...metricasDeSinaisETickets(sinaisP, ticketsP),
      };
    })
    .filter((r) => r.total > 0 || r.tickets > 0)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
}

export function agregarSmOcrPorDia(
  sinais: SmSinalRow[],
  tickets: EstudioIncidenteRow[],
): SmOcrDiaLinha[] {
  const sinaisPor = new Map<string, SmSinalRow[]>();
  for (const r of sinais) {
    const d = (r.dia_brt ?? "").slice(0, 10);
    if (!d) continue;
    const list = sinaisPor.get(d) ?? [];
    list.push(r);
    sinaisPor.set(d, list);
  }
  const ticketsPor = new Map<string, number>();
  for (const r of tickets) {
    const d = String(r.data_rodada ?? r.created_at ?? "").slice(0, 10);
    if (!d) continue;
    ticketsPor.set(d, (ticketsPor.get(d) ?? 0) + 1);
  }
  const dias = new Set([...sinaisPor.keys(), ...ticketsPor.keys()]);
  return [...dias]
    .sort((a, b) => b.localeCompare(a))
    .map((dia) => ({
      dia,
      ...metricasDeSinaisETickets(sinaisPor.get(dia) ?? [], ticketsPor.get(dia) ?? 0),
    }));
}

/** Reexport útil para sort MoM. */
export { mediaMs, tmaAtendimentoMs, tmaResolucaoMs, tmaTotalMs };
