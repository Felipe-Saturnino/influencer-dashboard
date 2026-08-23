/** Helpers para dashboard de posicionamento (lobby_monitor_*). */

import {
  horaBrasilFromInstant,
  isoDateBrasilFromInstant,
  subDiasIso,
} from "./dateBrasil";

export const POS_TOP3_MAX = 3;
export const POS_TOP10_MAX = 10;
export const POS_MID_MAX = 20;
export const POS_CHART_MAX = 30;

export const SEMANTIC = {
  verde: "#22c55e",
  vermelho: "#e84025",
  amarelo: "#f59e0b",
  cinza: "#6b7280",
  azul: "#3b82f6",
} as const;

export type VisaoPosicionamento = "mes" | "semana" | "dia";

/** Início do histórico de posicionamento no lobby (monitor Blaze). */
export const POS_MONITOR_MIN_ANO = 2026;
export const POS_MONITOR_MIN_MES = 4; // Maio (0-based)
export const POS_MONITOR_DIA_MIN = new Date(2026, 4, 18);

export const CATEGORIAS_LOBBY_EXIBICAO = [
  "Baccarat",
  "Roleta",
  "Blackjack",
  "Blackjack VIP",
  "Futebol Brasileiro",
] as const;

export interface LobbyExecucaoRow {
  id: string;
  operadora_slug: string;
  executado_em: string;
  status: string;
  pior_mesa_nome?: string | null;
  pior_mesa_identificacao?: string | null;
  pior_mesa_posicao?: number | null;
  jogos_a_frente_pior_mesa?: ConcorrenteLobby[];
}

export interface ConcorrenteLobby {
  posicao: number;
  /** Numérico (Blaze/CDA) ou string (Esportiva / GG Labs, ex. good-game-v2:…). */
  game_id: number | string;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

export type CanalEstudioPosicionamento = "dedicado" | "network";

export interface LobbyPosicaoRow {
  execucao_id: string;
  mesa_identificacao: string;
  nome_mesa: string;
  /** Nome do estúdio (Gestão de Estúdios); usado no rótulo «Estúdio - Mesa». */
  nome_estudio?: string | null;
  /** Tipo do estúdio da mesa (Gestão de Estúdios); filtro Dedicado/Network na aba Posicionamento. */
  canal_estudio?: CanalEstudioPosicionamento | null;
  tipo_jogo: string;
  posicao: number | null;
  qtd_concorrentes_a_frente: number;
  concorrentes_a_frente: ConcorrenteLobby[];
}

/** Filtra posições pelo canal do estúdio (mesas sem canal conhecido são omitidas). */
export function filtrarPosicoesPorCanal(
  posicoes: LobbyPosicaoRow[],
  canal: CanalEstudioPosicionamento,
): LobbyPosicaoRow[] {
  return posicoes.filter((p) => p.canal_estudio === canal);
}

/** Rótulo canónico Posicionamento: «Estúdio - Mesa» (fallback só Mesa). */
export function labelMesaPosicionamento(
  nomeEstudio: string | null | undefined,
  nomeMesa: string,
): string {
  const e = nomeEstudio?.trim();
  const m = nomeMesa.trim();
  if (!m) return e || "—";
  if (!e) return m;
  return `${e} - ${m}`;
}

export function labelMesaPosicionamentoRow(p: {
  nome_estudio?: string | null;
  nome_mesa: string;
}): string {
  return labelMesaPosicionamento(p.nome_estudio, p.nome_mesa);
}

export interface SnapshotMesa {
  mesa_identificacao: string;
  nome_mesa: string;
  tipo_jogo: string;
  posicao: number | null;
  qtd_concorrentes_a_frente: number;
  concorrentes_a_frente: ConcorrenteLobby[];
  executado_em: string;
}

const DIAS_SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function fmtPosicao(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  return `P${Math.round(p)}`;
}

export function posicaoBgColor(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "color-mix(in srgb, #6b7280 12%, transparent)";
  if (p <= POS_TOP3_MAX) return "color-mix(in srgb, #22c55e 18%, transparent)";
  if (p <= POS_TOP10_MAX) return "color-mix(in srgb, #3b82f6 18%, transparent)";
  if (p <= POS_MID_MAX) return "color-mix(in srgb, #6b7280 14%, transparent)";
  return "color-mix(in srgb, #e84025 16%, transparent)";
}

export function posicaoTextColor(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return SEMANTIC.cinza;
  if (p <= POS_TOP3_MAX) return SEMANTIC.verde;
  if (p <= POS_TOP10_MAX) return SEMANTIC.azul;
  if (p <= POS_MID_MAX) return SEMANTIC.cinza;
  return SEMANTIC.vermelho;
}

export function labelTipoJogo(tipo: string, nomeMesa?: string): string {
  const t = tipo.trim().toLowerCase();
  const n = (nomeMesa ?? "").trim().toLowerCase();
  if (
    t === "blackjack_vip" ||
    (t.includes("vip") && t.includes("black")) ||
    n.includes("blackjack vip") ||
    n.includes("vip blackjack")
  ) {
    return "Blackjack VIP";
  }
  if (t.includes("blackjack") || t.includes("black")) return "Blackjack";
  if (t.includes("roleta") || t === "roleta") return "Roleta";
  if (t.includes("baccarat") || t.includes("bacará")) return "Baccarat";
  if (
    t.includes("futebol brasileiro") ||
    t.includes("futebol studio") ||
    t.includes("football studio") ||
    t.includes("futebol_studio") ||
    (t.includes("futebol") && !t.includes("roleta"))
  ) {
    return "Futebol Brasileiro";
  }
  return tipo.trim() || "Outros";
}

export function fmtUltimaAtualizacao(executadoEm: string | null | undefined): string {
  if (!executadoEm) return "Última atualização: —";
  const d = new Date(executadoEm);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Última atualização: ${data} · ${hora}`;
}

export function isAntesMinimoPosicionamento(visao: VisaoPosicionamento, ref: Date): boolean {
  if (visao === "mes") {
    return ref.getFullYear() < POS_MONITOR_MIN_ANO ||
      (ref.getFullYear() === POS_MONITOR_MIN_ANO && ref.getMonth() < POS_MONITOR_MIN_MES);
  }
  if (visao === "semana") {
    return startOfWeekMonday(ref).getTime() < POS_MONITOR_SEMANA_MIN.getTime();
  }
  const day = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return day.getTime() < POS_MONITOR_DIA_MIN.getTime();
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export const POS_MONITOR_SEMANA_MIN = startOfWeekMonday(POS_MONITOR_DIA_MIN);

export function endOfWeekSunday(monday: Date): Date {
  const x = new Date(monday);
  x.setDate(x.getDate() + 6);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

export function periodoRange(
  visao: VisaoPosicionamento,
  ref: Date,
  mesAno?: { ano: number; mes: number },
): { inicio: string; fim: string; fimExclusive: string } {
  if (visao === "dia") {
    const k = toDateKey(ref);
    const next = toDateKey(addDays(ref, 1));
    return { inicio: `${k}T00:00:00.000Z`, fim: `${k}T23:59:59.999Z`, fimExclusive: next };
  }
  if (visao === "semana") {
    const mon = startOfWeekMonday(ref);
    const sun = endOfWeekSunday(mon);
    const next = toDateKey(addDays(sun, 1));
    return {
      inicio: `${toDateKey(mon)}T00:00:00.000Z`,
      fim: `${toDateKey(sun)}T23:59:59.999Z`,
      fimExclusive: next,
    };
  }
  const ano = mesAno?.ano ?? ref.getFullYear();
  const mes = mesAno?.mes ?? ref.getMonth();
  const inicio = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(ano, mes + 1, 0).getDate();
  const fim = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const nextMonth = mes === 11 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 2).padStart(2, "0")}-01`;
  return {
    inicio: `${inicio}T00:00:00.000Z`,
    fim: `${fim}T23:59:59.999Z`,
    fimExclusive: nextMonth,
  };
}

export function periodoAnteriorRange(
  visao: VisaoPosicionamento,
  ref: Date,
  mesAno?: { ano: number; mes: number },
): { inicio: string; fim: string } {
  if (visao === "dia") {
    const prev = addDays(ref, -1);
    const k = toDateKey(prev);
    return { inicio: `${k}T00:00:00.000Z`, fim: `${k}T23:59:59.999Z` };
  }
  if (visao === "semana") {
    const mon = startOfWeekMonday(addWeeks(ref, -1));
    const sun = endOfWeekSunday(mon);
    return {
      inicio: `${toDateKey(mon)}T00:00:00.000Z`,
      fim: `${toDateKey(sun)}T23:59:59.999Z`,
    };
  }
  const ano = mesAno?.ano ?? ref.getFullYear();
  const mes = mesAno?.mes ?? ref.getMonth();
  const prevMes = mes === 0 ? 11 : mes - 1;
  const prevAno = mes === 0 ? ano - 1 : ano;
  const lastDay = new Date(prevAno, prevMes + 1, 0).getDate();
  const inicio = `${prevAno}-${String(prevMes + 1).padStart(2, "0")}-01`;
  const fim = `${prevAno}-${String(prevMes + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { inicio: `${inicio}T00:00:00.000Z`, fim: `${fim}T23:59:59.999Z` };
}

export function labelCarrosselPos(
  visao: VisaoPosicionamento,
  ref: Date,
  mesAno?: { ano: number; mes: number; label: string },
): string {
  if (visao === "mes" && mesAno) return mesAno.label;
  if (visao === "dia") {
    return ref.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  }
  const mon = startOfWeekMonday(ref);
  const sun = endOfWeekSunday(mon);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}`;
}

export function execucoesNoPeriodo(
  execucoes: LobbyExecucaoRow[],
  inicio: string,
  fim: string,
): LobbyExecucaoRow[] {
  const t0 = new Date(inicio).getTime();
  const t1 = new Date(fim).getTime();
  return execucoes.filter((e) => {
    const t = new Date(e.executado_em).getTime();
    return t >= t0 && t <= t1;
  });
}

export function ultimaExecucaoOk(execucoes: LobbyExecucaoRow[]): LobbyExecucaoRow | null {
  const ok = execucoes.filter((e) => e.status === "ok" || e.status === "parcial");
  if (ok.length === 0) return execucoes[0] ?? null;
  return [...ok].sort(
    (a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime(),
  )[0];
}

export function penultimaExecucao(
  execucoes: LobbyExecucaoRow[],
  atualId: string,
): LobbyExecucaoRow | null {
  const sorted = [...execucoes]
    .filter((e) => e.status === "ok" || e.status === "parcial")
    .sort((a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime());
  const idx = sorted.findIndex((e) => e.id === atualId);
  return idx >= 0 && idx + 1 < sorted.length ? sorted[idx + 1]! : sorted[1] ?? null;
}

export function mapPosicoesPorExecucao(
  posicoes: LobbyPosicaoRow[],
): Map<string, LobbyPosicaoRow[]> {
  const m = new Map<string, LobbyPosicaoRow[]>();
  for (const p of posicoes) {
    if (!m.has(p.execucao_id)) m.set(p.execucao_id, []);
    m.get(p.execucao_id)!.push(p);
  }
  return m;
}

/** % de leituras com posição ≤ 10 entre todas as leituras válidas do período. */
export function calcVisibilidadeVitrine(
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): number | null {
  let total = 0;
  let top10 = 0;
  for (const ex of execucoes) {
    for (const p of posByExec.get(ex.id) ?? []) {
      if (p.posicao == null) continue;
      total++;
      if (p.posicao <= POS_TOP10_MAX) top10++;
    }
  }
  if (total === 0) return null;
  return (top10 / total) * 100;
}

export function mesasNoTop10Snapshot(
  posicoes: LobbyPosicaoRow[],
): { noTop10: number; total: number } {
  const total = posicoes.length;
  const noTop10 = posicoes.filter((p) => p.posicao != null && p.posicao <= POS_TOP10_MAX).length;
  return { noTop10, total };
}

export function melhorPosicaoSnapshot(posicoes: LobbyPosicaoRow[]): {
  posicao: number;
  nome_mesa: string;
} | null {
  let best: { posicao: number; nome_mesa: string } | null = null;
  for (const p of posicoes) {
    if (p.posicao == null) continue;
    if (!best || p.posicao < best.posicao) {
      best = { posicao: p.posicao, nome_mesa: labelMesaPosicionamentoRow(p) };
    }
  }
  return best;
}

export function maiorQuedaSnapshot(
  atual: LobbyPosicaoRow[],
  anterior: LobbyPosicaoRow[],
): { delta: number; nome_mesa: string } | null {
  const prev = new Map(anterior.map((p) => [p.mesa_identificacao, p.posicao]));
  let worst: { delta: number; nome_mesa: string } | null = null;
  for (const p of atual) {
    const pa = prev.get(p.mesa_identificacao);
    if (p.posicao == null || pa == null) continue;
    const delta = p.posicao - pa;
    if (delta > 0 && (!worst || delta > worst.delta)) {
      worst = { delta, nome_mesa: labelMesaPosicionamentoRow(p) };
    }
  }
  return worst;
}

export function deltaPosicao(
  atual: number | null,
  anterior: number | null,
): number | null {
  if (atual == null || anterior == null) return null;
  return atual - anterior;
}

/**
 * Última posição distinta da atual na janela `[desdeDiaKey … hoje]`.
 * Percorre execuções da mais recente à mais antiga (exceto a execução atual).
 * Se não houver posição diferente na janela, devolve `null` (UI: —).
 */
export function ultimaPosicaoDiferenteNaJanela(
  mesaIdentificacao: string,
  posicaoAtual: number | null,
  execucaoAtualId: string | undefined,
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
  desdeDiaKey: string,
): number | null {
  const mesaId = mesaIdentificacao.trim();
  if (!mesaId) return null;

  const ordenadas = [...execucoes].sort(
    (a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime(),
  );

  for (const ex of ordenadas) {
    if (execucaoAtualId && ex.id === execucaoAtualId) continue;
    const dia = isoDateBrasilFromInstant(ex.executado_em);
    if (!dia || dia < desdeDiaKey) continue;
    const row = (posByExec.get(ex.id) ?? []).find(
      (p) => p.mesa_identificacao.trim() === mesaId,
    );
    if (row?.posicao == null) continue;
    if (posicaoAtual == null || row.posicao !== posicaoAtual) {
      return row.posicao;
    }
  }
  return null;
}

export type BucketHistorico = { key: string; label: string; execucaoIds: string[] };

export function bucketsHistorico(
  visao: VisaoPosicionamento,
  ref: Date,
  mesAno?: { ano: number; mes: number },
): BucketHistorico[] {
  if (visao === "dia") {
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${String(h).padStart(2, "0")}h`,
      execucaoIds: [],
    }));
  }
  if (visao === "semana") {
    const mon = startOfWeekMonday(ref);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i);
      const k = toDateKey(d);
      return {
        key: k,
        label: `${DIAS_SEM[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
        execucaoIds: [],
      };
    });
  }
  const ano = mesAno?.ano ?? ref.getFullYear();
  const mes = mesAno?.mes ?? ref.getMonth();
  const days = new Date(ano, mes + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const k = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { key: k, label: String(day), execucaoIds: [] };
  });
}

export function assignExecucoesToBuckets(
  buckets: BucketHistorico[],
  execucoes: LobbyExecucaoRow[],
  visao: VisaoPosicionamento,
): BucketHistorico[] {
  const copy = buckets.map((b) => ({ ...b, execucaoIds: [...b.execucaoIds] }));
  for (const ex of execucoes) {
    const dt = new Date(ex.executado_em);
    let key: string;
    if (visao === "dia") {
      key = String(horaBrasilFromInstant(ex.executado_em) ?? dt.getHours());
    } else if (visao === "semana") {
      key = isoDateBrasilFromInstant(ex.executado_em) ?? toDateKey(dt);
    } else {
      key = isoDateBrasilFromInstant(ex.executado_em) ?? toDateKey(dt);
    }
    const b = copy.find((x) => x.key === key);
    if (b) b.execucaoIds.push(ex.id);
  }
  return copy;
}

export function posicaoMediaMesaNoBucket(
  mesaId: string,
  execIds: string[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): number | null {
  const vals: number[] = [];
  for (const id of execIds) {
    const row = (posByExec.get(id) ?? []).find((p) => p.mesa_identificacao === mesaId);
    if (row?.posicao != null) vals.push(row.posicao);
  }
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function heatmapColunas(visao: VisaoPosicionamento, ref: Date, mesAno?: { ano: number; mes: number }): {
  key: string;
  label: string;
}[] {
  if (visao === "dia") {
    return [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({
      key: String(h),
      label: `${String(h).padStart(2, "0")}h`,
    }));
  }
  if (visao === "semana") {
    const mon = startOfWeekMonday(ref);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i);
      return { key: toDateKey(d), label: DIAS_SEM[d.getDay()] };
    });
  }
  const ano = mesAno?.ano ?? ref.getFullYear();
  const mes = mesAno?.mes ?? ref.getMonth();
  const first = new Date(ano, mes, 1);
  const last = new Date(ano, mes + 1, 0);
  const cols: { key: string; label: string }[] = [];
  let w = 1;
  let cur = new Date(first);
  while (cur <= last) {
    const end = addDays(cur, 6);
    const endClamped = end > last ? last : end;
    cols.push({ key: `S${w}`, label: `S${w}` });
    w++;
    cur = addDays(endClamped, 1);
  }
  return cols;
}

export function execucoesParaHeatCol(
  execucoes: LobbyExecucaoRow[],
  colKey: string,
  visao: VisaoPosicionamento,
  ref: Date,
  mesAno?: { ano: number; mes: number },
): string[] {
  if (visao === "dia") {
    const h = Number(colKey);
    return execucoes
      .filter((e) => new Date(e.executado_em).getHours() === h)
      .map((e) => e.id);
  }
  if (visao === "semana") {
    return execucoes.filter((e) => toDateKey(new Date(e.executado_em)) === colKey).map((e) => e.id);
  }
  const weekNum = Number(colKey.replace("S", ""));
  const ano = mesAno?.ano ?? ref.getFullYear();
  const mes = mesAno?.mes ?? ref.getMonth();
  const first = new Date(ano, mes, 1);
  const last = new Date(ano, mes + 1, 0);
  let w = 1;
  let cur = new Date(first);
  while (cur <= last && w <= weekNum) {
    if (w === weekNum) {
      const end = addDays(cur, 6);
      const endClamped = end > last ? last : end;
      const t0 = cur.getTime();
      const t1 = endClamped.getTime() + 86400000 - 1;
      return execucoes
        .filter((e) => {
          const t = new Date(e.executado_em).getTime();
          return t >= t0 && t <= t1;
        })
        .map((e) => e.id);
    }
    const end = addDays(cur, 6);
    cur = addDays(end > last ? last : end, 1);
    w++;
  }
  return [];
}

export function rankingConcorrentes(
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): { provider: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ex of execucoes) {
    for (const p of posByExec.get(ex.id) ?? []) {
      for (const c of p.concorrentes_a_frente ?? []) {
        const name = (c.provider_name || c.provider_slug || "Desconhecido").trim();
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);
}

export function visibilidadePorCategoria(
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): {
  categoria: string;
  pctTop10: number;
  melhorPos: number | null;
  pctTop3: number;
}[] {
  const byTipo = new Map<string, { total: number; top10: number; top3: number; best: number | null }>();
  for (const ex of execucoes) {
    for (const p of posByExec.get(ex.id) ?? []) {
      const cat = labelTipoJogo(p.tipo_jogo, p.nome_mesa);
      if (!byTipo.has(cat)) byTipo.set(cat, { total: 0, top10: 0, top3: 0, best: null });
      const b = byTipo.get(cat)!;
      if (p.posicao == null) continue;
      b.total++;
      if (p.posicao <= POS_TOP10_MAX) b.top10++;
      if (p.posicao <= POS_TOP3_MAX) b.top3++;
      if (b.best == null || p.posicao < b.best) b.best = p.posicao;
    }
  }
  return [...byTipo.entries()]
    .map(([categoria, v]) => ({
      categoria,
      pctTop10: v.total > 0 ? (v.top10 / v.total) * 100 : 0,
      pctTop3: v.total > 0 ? (v.top3 / v.total) * 100 : 0,
      melhorPos: v.best,
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR"));
}

export type HeatmapHistoricoModo = "dia" | "7d" | "30d";

export function ultimaExecucaoNoDia(
  execucoes: LobbyExecucaoRow[],
  dayKey: string,
): LobbyExecucaoRow | null {
  const ok = execucoes.filter(
    (e) =>
      (e.status === "ok" || e.status === "parcial") &&
      isoDateBrasilFromInstant(e.executado_em) === dayKey,
  );
  if (ok.length === 0) return null;
  return [...ok].sort(
    (a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime(),
  )[0]!;
}

/** Execução do dia anterior mais próxima do mesmo horário (hora cheia). */
export function execucaoMesmoHorarioDiaAnterior(
  ref: LobbyExecucaoRow,
  execucoes: LobbyExecucaoRow[],
): LobbyExecucaoRow | null {
  const refDay = isoDateBrasilFromInstant(ref.executado_em);
  if (!refDay) return null;
  const prevKey = subDiasIso(refDay, 1);
  const hour = horaBrasilFromInstant(ref.executado_em);
  if (hour == null) return null;
  const candidates = execucoes.filter((e) => {
    if (e.status !== "ok" && e.status !== "parcial") return false;
    return isoDateBrasilFromInstant(e.executado_em) === prevKey;
  });
  if (candidates.length === 0) return null;
  let best: LobbyExecucaoRow | null = null;
  let bestDiff = 999;
  for (const e of candidates) {
    const eh = horaBrasilFromInstant(e.executado_em);
    if (eh == null) continue;
    const diff = Math.abs(eh - hour);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = e;
    }
  }
  return best;
}

/** Última execução ok/parcial por `executado_em` (qualquer dia). */
export function ultimaExecucaoValida(execucoes: LobbyExecucaoRow[]): LobbyExecucaoRow | null {
  const ok = execucoes.filter((e) => e.status === "ok" || e.status === "parcial");
  if (ok.length === 0) return null;
  return [...ok].sort(
    (a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime(),
  )[0]!;
}

/** Execução imediatamente anterior à de referência (último horário antes dela). */
export function execucaoAnteriorImediata(
  ref: LobbyExecucaoRow,
  execucoes: LobbyExecucaoRow[],
): LobbyExecucaoRow | null {
  const refTs = new Date(ref.executado_em).getTime();
  if (!Number.isFinite(refTs)) return null;
  const before = execucoes.filter((e) => {
    if (e.id === ref.id) return false;
    if (e.status !== "ok" && e.status !== "parcial") return false;
    const ts = new Date(e.executado_em).getTime();
    return Number.isFinite(ts) && ts < refTs;
  });
  if (before.length === 0) return null;
  return [...before].sort(
    (a, b) => new Date(b.executado_em).getTime() - new Date(a.executado_em).getTime(),
  )[0]!;
}

export function calcVisibilidadeLeituras(posicoes: LobbyPosicaoRow[]): number | null {
  let total = 0;
  let top10 = 0;
  for (const p of posicoes) {
    if (p.posicao == null) continue;
    total++;
    if (p.posicao <= POS_TOP10_MAX) top10++;
  }
  if (total === 0) return null;
  return (top10 / total) * 100;
}

export function melhorPosicaoComCategoria(
  posicoes: LobbyPosicaoRow[],
): { posicao: number; categoria: string } | null {
  let best: { posicao: number; categoria: string } | null = null;
  for (const p of posicoes) {
    if (p.posicao == null) continue;
    if (!best || p.posicao < best.posicao) {
      best = { posicao: p.posicao, categoria: labelTipoJogo(p.tipo_jogo, p.nome_mesa) };
    }
  }
  return best;
}

export function maiorQuedaEntreSnapshots(
  atual: LobbyPosicaoRow[],
  anterior: LobbyPosicaoRow[],
): { delta: number; nome_mesa: string } | null {
  const prev = new Map(anterior.map((p) => [p.mesa_identificacao, p.posicao]));
  let worst: { delta: number; nome_mesa: string } | null = null;
  for (const p of atual) {
    const pa = prev.get(p.mesa_identificacao);
    if (p.posicao == null || pa == null) continue;
    const delta = p.posicao - pa;
    if (delta > 0 && (!worst || delta > worst.delta)) {
      worst = { delta, nome_mesa: labelMesaPosicionamentoRow(p) };
    }
  }
  return worst;
}

export function colunasHistoricoPosicionamento(
  modo: HeatmapHistoricoModo,
  refDate: Date,
): { key: string; label: string }[] {
  if (modo === "dia") {
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${String(h).padStart(2, "0")}h`,
    }));
  }
  const dias = modo === "7d" ? 7 : 30;
  return Array.from({ length: dias }, (_, i) => {
    const d = addDays(refDate, i - (dias - 1));
    const k = toDateKey(d);
    return {
      key: k,
      label:
        modo === "7d"
          ? `${DIAS_SEM[d.getDay()]} ${d.getDate()}`
          : `${d.getDate()}/${d.getMonth() + 1}`,
    };
  });
}

export function execIdsColunaHistorico(
  modo: HeatmapHistoricoModo,
  colKey: string,
  refDate: Date,
  execucoes: LobbyExecucaoRow[],
): string[] {
  if (modo === "dia") {
    const h = Number(colKey);
    const dayKey = isoDateBrasilFromInstant(refDate.toISOString()) ?? toDateKey(refDate);
    return execucoes
      .filter((e) => {
        const dia = isoDateBrasilFromInstant(e.executado_em);
        const hora = horaBrasilFromInstant(e.executado_em);
        return dia === dayKey && hora === h;
      })
      .map((e) => e.id);
  }
  return execucoes
    .filter((e) => isoDateBrasilFromInstant(e.executado_em) === colKey)
    .map((e) => e.id);
}

export function visibilidadePorCategoriaDia(
  execucoesDia: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): { categoria: string; pctTop3: number; pctTop10: number }[] {
  const byTipo = new Map<string, { total: number; top10: number; top3: number }>();
  for (const ex of execucoesDia) {
    for (const p of posByExec.get(ex.id) ?? []) {
      const cat = labelTipoJogo(p.tipo_jogo, p.nome_mesa);
      if (!byTipo.has(cat)) byTipo.set(cat, { total: 0, top10: 0, top3: 0 });
      const b = byTipo.get(cat)!;
      if (p.posicao == null) continue;
      b.total++;
      if (p.posicao <= POS_TOP10_MAX) b.top10++;
      if (p.posicao <= POS_TOP3_MAX) b.top3++;
    }
  }
  return CATEGORIAS_LOBBY_EXIBICAO.map((categoria) => {
    const v = byTipo.get(categoria);
    return {
      categoria,
      pctTop3: v && v.total > 0 ? (v.top3 / v.total) * 100 : 0,
      pctTop10: v && v.total > 0 ? (v.top10 / v.total) * 100 : 0,
    };
  });
}

export function concorrentesPorJogoDetalhe(posicoes: LobbyPosicaoRow[]): {
  jogo: string;
  qtd: number;
  max: number;
  jogos: ConcorrenteLobby[];
}[] {
  const byJogo = new Map<string, { qtdMax: number; jogos: Map<string, ConcorrenteLobby> }>();
  for (const p of posicoes) {
    const j = labelTipoJogo(p.tipo_jogo, p.nome_mesa);
    if (!byJogo.has(j)) byJogo.set(j, { qtdMax: 0, jogos: new Map() });
    const b = byJogo.get(j)!;
    b.qtdMax = Math.max(b.qtdMax, p.qtd_concorrentes_a_frente ?? 0);
    for (const c of p.concorrentes_a_frente ?? []) {
      b.jogos.set(String(c.game_id), c);
    }
  }
  let maxQ = 1;
  const rows = CATEGORIAS_LOBBY_EXIBICAO.map((jogo) => {
    const b = byJogo.get(jogo);
    const jogos = b ? [...b.jogos.values()].sort((a, c) => a.posicao - c.posicao) : [];
    const qtd = b?.qtdMax ?? 0;
    if (qtd > maxQ) maxQ = qtd;
    return { jogo, qtd, max: 1, jogos };
  });
  return rows.map((r) => ({ ...r, max: maxQ }));
}

/**
 * Ranking alinhado a «Concorrentes à frente»: união dos concorrentes
 * (`concorrentes_a_frente`) de todas as mesas Spin do snapshot, sem duplicar game_id.
 * Não usa `jogos_a_frente_pior_mesa` (só a pior mesa / vitrine).
 */
export function rankingConcorrentesFromPosicoes(posicoes: LobbyPosicaoRow[]): ConcorrenteLobby[] {
  const byId = new Map<string, ConcorrenteLobby>();
  for (const p of posicoes) {
    for (const c of p.concorrentes_a_frente ?? []) {
      const key = String(c.game_id);
      const prev = byId.get(key);
      if (!prev || c.posicao < prev.posicao) {
        byId.set(key, c);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.posicao - b.posicao || a.name.localeCompare(b.name, "pt-BR"));
}

export function concorrentesPorJogoSnapshot(
  posicoes: LobbyPosicaoRow[],
): { jogo: string; qtd: number; max: number }[] {
  const by = new Map<string, number>();
  let max = 0;
  for (const p of posicoes) {
    const j = labelTipoJogo(p.tipo_jogo, p.nome_mesa);
    const q = p.qtd_concorrentes_a_frente ?? 0;
    by.set(j, Math.max(by.get(j) ?? 0, q));
    if (q > max) max = q;
  }
  const baseMax = Math.max(1, max);
  return CATEGORIAS_LOBBY_EXIBICAO.map((jogo) => ({
    jogo,
    qtd: by.get(jogo) ?? 0,
    max: baseMax,
  }));
}

export function visibilidadePorCategoriaCompleta(
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): {
  categoria: string;
  pctTop10: number;
  melhorPos: number | null;
  pctTop3: number;
}[] {
  const base = visibilidadePorCategoria(execucoes, posByExec);
  const map = new Map(base.map((c) => [c.categoria, c]));
  return CATEGORIAS_LOBBY_EXIBICAO.map(
    (categoria) =>
      map.get(categoria) ?? {
        categoria,
        pctTop10: 0,
        pctTop3: 0,
        melhorPos: null,
      },
  );
}

export interface AlertaPos {
  tipo: "atencao" | "positivo";
  texto: string;
  /** Dia civil da alteração (YYYY-MM-DD) — ordenação / merge consolidado. */
  dataIso?: string;
  /** Instant da execução nova (ms) — ordenação mais recente primeiro. */
  sortTs?: number;
}

export function gerarAlertas(
  snapshot: LobbyPosicaoRow[],
  anterior: LobbyPosicaoRow[],
  execPeriodo: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
): AlertaPos[] {
  const alertas: AlertaPos[] = [];
  const prev = new Map(anterior.map((p) => [p.mesa_identificacao, p.posicao]));

  for (const p of snapshot) {
    const pa = prev.get(p.mesa_identificacao);
    const label = labelMesaPosicionamentoRow(p);
    if (p.posicao === 1 && pa != null && pa > 1) {
      alertas.push({
        tipo: "positivo",
        texto: `${label} conquistou P1 (antes ${fmtPosicao(pa)}).`,
      });
    }
    if (p.posicao != null && p.posicao <= POS_TOP3_MAX && pa != null && pa > POS_TOP3_MAX) {
      alertas.push({
        tipo: "positivo",
        texto: `${label} entrou no top 3 (${fmtPosicao(p.posicao)}).`,
      });
    }
    if (pa != null && p.posicao != null && p.posicao - pa >= 8) {
      alertas.push({
        tipo: "atencao",
        texto: `Queda brusca em ${label}: ${fmtPosicao(pa)} → ${fmtPosicao(p.posicao)}.`,
      });
    }
  }

  const cats = visibilidadePorCategoria(execPeriodo, posByExec);
  for (const c of cats) {
    if (c.pctTop10 < 25 && c.pctTop10 > 0) {
      alertas.push({
        tipo: "atencao",
        texto: `Baixa presença no top 10 em ${c.categoria} (${c.pctTop10.toFixed(0)}%).`,
      });
    }
  }

  return alertas.slice(0, 12);
}

function fmtDiaMesIso(isoYmd: string): string {
  const [, m, d] = isoYmd.split("-");
  if (!m || !d) return isoYmd;
  return `${d}/${m}`;
}

/**
 * Lista mudanças de posição por mesa na janela civil `[desdeDiaKey … ateDiaKey]`.
 * Usa a **última leitura de cada dia** e emite uma linha quando o dia seguinte
 * difere do anterior (evita ruído de polls intra-dia). Mais recente primeiro.
 */
export function gerarAlertasAlteracoesJanela(
  execucoes: LobbyExecucaoRow[],
  posByExec: Map<string, LobbyPosicaoRow[]>,
  desdeDiaKey: string,
  ateDiaKey: string,
): AlertaPos[] {
  const naJanela = execucoes
    .filter((ex) => {
      const dia = isoDateBrasilFromInstant(ex.executado_em);
      return !!dia && dia >= desdeDiaKey && dia <= ateDiaKey;
    })
    .sort((a, b) => new Date(a.executado_em).getTime() - new Date(b.executado_em).getTime());

  if (naJanela.length === 0) return [];

  /** mesa → dia → última leitura do dia */
  const porMesaDia = new Map<
    string,
    Map<string, { posicao: number; executadoEm: string; nomeMesa: string }>
  >();

  for (const ex of naJanela) {
    const dia = isoDateBrasilFromInstant(ex.executado_em);
    if (!dia) continue;
    for (const row of posByExec.get(ex.id) ?? []) {
      if (row.posicao == null || !Number.isFinite(row.posicao)) continue;
      const mid = row.mesa_identificacao.trim();
      if (!mid) continue;
      let dias = porMesaDia.get(mid);
      if (!dias) {
        dias = new Map();
        porMesaDia.set(mid, dias);
      }
      const nomeMesa = row.nome_mesa?.trim() || mid;
      dias.set(dia, {
        posicao: Number(row.posicao),
        executadoEm: ex.executado_em,
        nomeMesa,
      });
    }
  }

  const alertas: AlertaPos[] = [];
  for (const dias of porMesaDia.values()) {
    const diasOrdenados = [...dias.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    for (let i = 1; i < diasOrdenados.length; i++) {
      const [, ant] = diasOrdenados[i - 1];
      const [diaAtual, atual] = diasOrdenados[i];
      if (ant.posicao === atual.posicao) continue;
      const melhorou = atual.posicao < ant.posicao;
      alertas.push({
        tipo: melhorou ? "positivo" : "atencao",
        texto: `Mesa (${atual.nomeMesa}) — ${fmtDiaMesIso(diaAtual)} — ${fmtPosicao(ant.posicao)} → ${fmtPosicao(atual.posicao)}`,
        dataIso: diaAtual,
        sortTs: new Date(atual.executadoEm).getTime(),
      });
    }
  }

  return alertas.sort((a, b) => (b.sortTs ?? 0) - (a.sortTs ?? 0));
}

export const LINE_COLORS = [
  "var(--brand-action, #7c3aed)",
  "var(--brand-contrast, #1e36f8)",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#70cae4",
  "#e84025",
] as const;
