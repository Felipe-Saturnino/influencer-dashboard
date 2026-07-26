/**
 * Escala → Rotação: contexto do dia (RPC), geração de grade e publicação.
 */
import { supabase } from "./supabase";
import { primeiroUltimoNome } from "./rhGamePresenterDealerSync";
import {
  GAME_IDENTITY_HEX,
  type GameIdentityKey,
} from "./gameIdentityColors";
import { carregarPontoRegistrosDiaLote } from "./rhCalendarioPresencaGestaoDb";

export type RotacaoTurnoKey = "manha" | "tarde" | "noite";

export type RotacaoGpPool = {
  funcionarioId: string;
  nomeCompleto: string;
  nomeExibicao: string;
  nickname: string;
  falta: boolean;
  /** Reserva operacional — só entra na grade para cobrir mesas. */
  isShiftLead: boolean;
  estudioStaff?: string;
  estudioEfetivo?: string;
  alocacaoOrigem?: "staff" | "manual";
  /** true = check-in no dia; false = sem check-in; null = ainda não carregado */
  chegou?: boolean | null;
};

export type RotacaoMesa = {
  id: string;
  mesaIdentificacao: string;
  numeroMesa: string;
  nomeMesa: string;
  tipoJogo: string;
};

export type RotacaoContextoDia = {
  dia: string;
  turno: RotacaoTurnoKey;
  turnoLabel: string;
  estudioSlug: string;
  estudioNome: string;
  escalaAprovada: boolean;
  turnoInicio: string;
  turnoFim: string;
  horarioTexto: string;
  gps: RotacaoGpPool[];
  /** GPs do mesmo turno em outro estúdio efetivo (para mover). */
  gpsOutros: RotacaoGpPool[];
  /** Shift Leads escalados (reserva para cobrir mesas). */
  shiftLeads: RotacaoGpPool[];
  mesas: RotacaoMesa[];
};

export type RotacaoCelulaPayload = {
  funcionario_id: string;
  nome_exibicao: string;
  nickname: string;
  linha_ordem: number;
  slot_inicio: string;
  valor: string;
};

export type RotacaoPublicada = {
  id: string;
  dia: string;
  turno: RotacaoTurnoKey;
  estudioSlug: string;
  estudioNome: string;
  modeloN: number;
  slotMinutos: number;
  turnoInicio: string;
  turnoFim: string;
  publicadoEm: string | null;
  slots: string[];
  gps: { funcionarioId: string; nomeExibicao: string; nickname: string }[];
  /** matrix[gpIndex][slotIndex] */
  matrix: string[][];
  faltosos: { funcionarioId: string; nomeExibicao: string; nickname: string }[];
};

export const ROTACAO_MODELOS = [5, 6, 7, 8] as const;
export type RotacaoModeloN = (typeof ROTACAO_MODELOS)[number];

export const ROTACAO_TURNO_OPCOES: { value: RotacaoTurnoKey; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const MSG_ERRO =
  "Não foi possível carregar a rotação. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_PUB =
  "Não foi possível publicar a rotação. Se o problema persistir, entre em contato com o suporte.";

function tipoJogoParaIdentityKey(tipo: string): GameIdentityKey | null {
  const t = tipo.trim().toLowerCase();
  if (t === "baccarat") return "baccarat";
  if (t === "blackjack") return "blackjack";
  if (t === "roleta") return "roleta";
  if (t === "futebol brasileiro" || t === "futebol_brasileiro") return "futebol_brasileiro";
  return null;
}

export function corMesaPorTipoJogo(tipoJogo: string): string {
  const key = tipoJogoParaIdentityKey(tipoJogo);
  if (!key) return "#6b7280";
  return GAME_IDENTITY_HEX[key];
}

/** Hash estável para variar tom por mesa (mesmo jogo, mesas distintas). */
function hashRotacaoSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Cor da célula na grade: base = identidade do jogo;
 * tonalidades distintas por Número da Mesa (evita confusão entre mesas do mesmo jogo).
 */
export function tomVarianteJogo(baseHex: string, index: number): string {
  if (baseHex === "#6b7280") return baseHex;
  const mixes = [
    baseHex,
    `color-mix(in srgb, ${baseHex} 72%, white)`,
    `color-mix(in srgb, ${baseHex} 68%, black)`,
    `color-mix(in srgb, ${baseHex} 52%, white)`,
    `color-mix(in srgb, ${baseHex} 48%, black)`,
    `color-mix(in srgb, ${baseHex} 60%, white)`,
    `color-mix(in srgb, ${baseHex} 58%, black)`,
    `color-mix(in srgb, ${baseHex} 40%, white)`,
  ];
  return mixes[index % mixes.length]!;
}

/** Mapa Número da Mesa → cor (mesmas família por jogo, tons distintos entre mesas). */
export function mapaCoresMesasRotacao(
  mesas: { numeroMesa: string; tipoJogo: string }[],
): Record<string, string> {
  const porTipo = new Map<string, string[]>();
  for (const m of mesas) {
    const n = m.numeroMesa.trim();
    if (!n) continue;
    const list = porTipo.get(m.tipoJogo) ?? [];
    if (!list.includes(n)) list.push(n);
    porTipo.set(m.tipoJogo, list);
  }
  const out: Record<string, string> = {};
  for (const [tipo, numeros] of porTipo) {
    const base = corMesaPorTipoJogo(tipo);
    const ordenados = [...numeros].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    ordenados.forEach((n, i) => {
      out[n] = tomVarianteJogo(base, i);
    });
  }
  return out;
}

/** Fallback estável quando só há o rótulo da célula (ex.: rotação publicada sem catálogo). */
export function corMesaRotacao(tipoJogo: string, numeroMesa: string): string {
  const base = corMesaPorTipoJogo(tipoJogo);
  if (base === "#6b7280" || !numeroMesa.trim()) return base;
  return tomVarianteJogo(base, hashRotacaoSeed(numeroMesa.trim()) % 8);
}

/** True se a linha inteira é falta (legado F ou X). */
export function celulaEhFalta(valor: string): boolean {
  return valor === "X" || valor === "F";
}

export function minutosDesdeMeiaNoite(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return 0;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

export function gerarSlotsRotacao(inicio: string, fim: string, stepMin: number): string[] {
  let cur = minutosDesdeMeiaNoite(inicio);
  const end = minutosDesdeMeiaNoite(fim);
  const start = cur;
  const overnight = start > end || (start === end && stepMin > 0);
  const out: string[] = [];
  let guard = 0;
  while (guard++ < 200) {
    const h = Math.floor(cur / 60) % 24;
    const mi = cur % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
    cur += stepMin;
    if (cur >= 24 * 60) cur -= 24 * 60;
    if (!overnight) {
      if (cur >= end) break;
    } else if (cur < start && cur >= end) {
      break;
    }
  }
  return out;
}

export function slotMinutosPermitido(modeloN: number, slotEscolhido: number): number {
  if (modeloN === 5 || modeloN === 6) {
    return slotEscolhido === 20 ? 20 : 30;
  }
  return 30;
}

export function sugerirModeloN(elegiveis: number): RotacaoModeloN {
  if (elegiveis >= 8) return 8;
  if (elegiveis >= 7) return 7;
  if (elegiveis >= 6) return 6;
  return 5;
}

/**
 * Labels de mesa para a grade (Número da Mesa), únicos e na ordem do contexto.
 */
export function labelsMesasRotacao(mesas: { numeroMesa: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of mesas) {
    const n = m.numeroMesa.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/** Máximo de minutos contínuos em mesa antes do Break (regra de produto). */
export const ROTACAO_MAX_MINUTOS_CONTINUOS = 120;

/** Quantos slots seguidos cabem em 2h para o intervalo escolhido. */
export function maxSlotsSeguidosAntesBreak(slotMinutos: number): number {
  const step = slotMinutos === 20 ? 20 : 30;
  return Math.max(1, Math.floor(ROTACAO_MAX_MINUTOS_CONTINUOS / step));
}

/** @deprecated Use maxSlotsSeguidosAntesBreak(30) — mantido por compat. */
export const ROTACAO_MAX_MESAS_SEGUIDAS = 4;

type EstadoPessoaRotacao = {
  isShiftLead: boolean;
  consecutiveWork: number;
  lastMesa: string | null;
  totalMesas: number;
};

/**
 * Atribui mesas 1:1 aos workers.
 * Com `forcarSemRepeticao`: ninguém recebe a mesma mesa do slot anterior.
 * Retorna null se for impossível com este conjunto.
 */
function atribuirMesasSemRepeticao(
  workers: number[],
  mesas: string[],
  estado: EstadoPessoaRotacao[],
  forcarSemRepeticao: boolean,
): string[] | null {
  const n = workers.length;
  const result: (string | null)[] = Array.from({ length: n }, () => null);
  const used = new Set<string>();

  const ordem = workers
    .map((wi, idx) => {
      const last = estado[wi]!.lastMesa;
      const opts =
        forcarSemRepeticao && last ? mesas.filter((m) => m !== last) : [...mesas];
      return { idx, wi, opts };
    })
    .sort((a, b) => a.opts.length - b.opts.length || a.idx - b.idx);

  if (ordem.some((o) => o.opts.length === 0)) return null;

  function bt(k: number): boolean {
    if (k >= ordem.length) return true;
    const { idx, opts } = ordem[k]!;
    for (const m of opts) {
      if (used.has(m)) continue;
      used.add(m);
      result[idx] = m;
      if (bt(k + 1)) return true;
      used.delete(m);
      result[idx] = null;
    }
    return false;
  }

  if (!bt(0)) return null;
  return result.map((m, i) => m ?? mesas[i % mesas.length]!);
}

/**
 * Escolhe M workers e atribui mesas intercalando (sem mesma mesa seguida) quando há 2+ mesas.
 * Se o time inicial não admite derangement, troca quem está em mesa por quem está em Break.
 */
function alocarSlotRotacao(
  estado: EstadoPessoaRotacao[],
  mesas: string[],
  maxConsec: number,
): { workers: number[]; mesasAttr: string[] } | null {
  const M = mesas.length;
  const forcar = mesas.length >= 2;
  let workers = escolherWorkersSlot(estado, M, maxConsec);
  if (workers.length < M) return null;

  let mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado, forcar);
  if (mesasAttr) return { workers, mesasAttr };

  if (!forcar) {
    mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado, false);
    return mesasAttr ? { workers, mesasAttr } : null;
  }

  const resting = estado.map((_, i) => i).filter((i) => !workers.includes(i));
  const workerSet = new Set(workers);

  for (let round = 0; round < resting.length + 3; round++) {
    let resolved = false;
    for (const wi of [...workers]) {
      if (!estado[wi]!.lastMesa) continue;
      for (let r = 0; r < resting.length; r++) {
        const ri = resting[r]!;
        if (workerSet.has(ri)) continue;
        const trial = workers.map((w) => (w === wi ? ri : w));
        const attr = atribuirMesasSemRepeticao(trial, mesas, estado, true);
        if (attr) {
          workers = trial;
          mesasAttr = attr;
          workerSet.delete(wi);
          workerSet.add(ri);
          resting.splice(r, 1);
          resting.push(wi);
          resolved = true;
          break;
        }
      }
      if (resolved) break;
    }
    if (mesasAttr) return { workers, mesasAttr };
    if (!resolved) break;
  }

  // Busca exaustiva só em pools pequenos (evita explosão combinatória)
  if (estado.length <= 12) {
    const todos = estado.map((_, i) => i);
    const escolha: number[] = [];
    const comb = (start: number): boolean => {
      if (escolha.length === M) {
        const attr = atribuirMesasSemRepeticao(escolha, mesas, estado, true);
        if (attr) {
          workers = [...escolha];
          mesasAttr = attr;
          return true;
        }
        return false;
      }
      for (let i = start; i < todos.length; i++) {
        escolha.push(todos[i]!);
        if (comb(i + 1)) return true;
        escolha.pop();
      }
      return false;
    };
    if (comb(0) && mesasAttr) return { workers, mesasAttr };
  }

  // Último recurso: cobre mesas mesmo com repetição (só se derangement for impossível)
  mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado, false);
  return mesasAttr ? { workers, mesasAttr } : null;
}

function escolherWorkersSlot(
  estado: EstadoPessoaRotacao[],
  mesasCount: number,
  maxConsec: number,
): number[] {
  const M = mesasCount;
  const gpOk: number[] = [];
  const gpMustRest: number[] = [];
  const slIdx: number[] = [];

  for (let i = 0; i < estado.length; i++) {
    const e = estado[i]!;
    if (e.isShiftLead) {
      slIdx.push(i);
      continue;
    }
    if (e.consecutiveWork >= maxConsec) gpMustRest.push(i);
    else gpOk.push(i);
  }

  const nGp = gpOk.length + gpMustRest.length;

  gpOk.sort((a, b) => {
    const ea = estado[a]!;
    const eb = estado[b]!;
    const freshA = ea.consecutiveWork === 0 ? 0 : 1;
    const freshB = eb.consecutiveWork === 0 ? 0 : 1;
    if (freshA !== freshB) return freshA - freshB;
    if (ea.consecutiveWork !== eb.consecutiveWork) return ea.consecutiveWork - eb.consecutiveWork;
    return a - b;
  });

  let gpTarget = Math.min(gpOk.length, M);
  if (slIdx.length > 0 && gpOk.length >= M) {
    const nearLimit = gpOk.filter((i) => estado[i]!.consecutiveWork >= maxConsec - 1).length;
    if (nGp <= M || nearLimit >= 2) {
      gpTarget = Math.min(gpOk.length, M - 1);
    }
  }

  const workers: number[] = [];
  for (const i of gpOk) {
    if (workers.length >= gpTarget) break;
    workers.push(i);
  }

  if (workers.length < M) {
    const slSorted = [...slIdx].sort((a, b) => {
      const ea = estado[a]!;
      const eb = estado[b]!;
      if (ea.totalMesas !== eb.totalMesas) return ea.totalMesas - eb.totalMesas;
      return a - b;
    });
    for (const i of slSorted) {
      if (workers.length >= M) break;
      workers.push(i);
    }
  }

  if (workers.length < M) {
    gpMustRest.sort((a, b) => estado[a]!.totalMesas - estado[b]!.totalMesas || a - b);
    for (const i of gpMustRest) {
      if (workers.length >= M) break;
      workers.push(i);
    }
  }

  if (workers.length < M) {
    for (const i of gpOk) {
      if (workers.length >= M) break;
      if (workers.includes(i)) continue;
      workers.push(i);
    }
  }

  return workers.slice(0, M);
}

export type RotacaoGeracaoPessoa = {
  funcionarioId: string;
  isShiftLead: boolean;
};

export type RotacaoGeracaoResultado = {
  ok: true;
  pessoas: RotacaoGeracaoPessoa[];
  matrix: string[][];
} | {
  ok: false;
  erro: string;
};

/**
 * Gera a grade de rotação com as regras de produto:
 * — todas as mesas cobertas em todo slot;
 * — 1 GP/SL por mesa;
 * — GP não repete a mesma mesa no slot seguinte (intercala com outras; com 2+ mesas é regra rígida);
 * — GP no máximo ~2h contínuas (4×30 min ou 6×20 min) antes do Break;
 * — Shift Lead entra só para cobrir e faz o mínimo de mesas.
 */
export function gerarGradeRotacao(opts: {
  mesasLabels: string[];
  gps: RotacaoGeracaoPessoa[];
  shiftLeads: RotacaoGeracaoPessoa[];
  nSlots: number;
  /** Default 30. Define o teto de slots seguidos (2h). */
  slotMinutos?: number;
  /**
   * Se definido, preserva slots [0..fromSlot) da matrixBase e regenera só o futuro
   * (chegada atrasada / reingresso).
   */
  fromSlotIndex?: number;
  matrixBase?: string[][];
}): RotacaoGeracaoResultado {
  const mesas = opts.mesasLabels.filter((m) => m.trim());
  const gps = opts.gps.filter((p) => !p.isShiftLead);
  const shiftLeads = opts.shiftLeads.filter((p) => p.isShiftLead);
  const nSlots = opts.nSlots;
  const slotMin = opts.slotMinutos === 20 ? 20 : 30;
  const maxConsec = maxSlotsSeguidosAntesBreak(slotMin);
  const fromSlot = Math.max(0, Math.min(opts.fromSlotIndex ?? 0, nSlots));

  if (mesas.length === 0) {
    return { ok: false, erro: "Este estúdio não tem mesas com Número da Mesa cadastrado em Gestão de Mesas." };
  }
  if (nSlots <= 0) {
    return { ok: false, erro: "Não foi possível montar os horários do turno." };
  }
  if (gps.length + shiftLeads.length < mesas.length) {
    return {
      ok: false,
      erro: `Pessoas insuficientes (${gps.length} GPs + ${shiftLeads.length} Shift Lead) para cobrir ${mesas.length} mesa(s).`,
    };
  }

  const pessoas: RotacaoGeracaoPessoa[] = [
    ...gps.map((p) => ({ ...p, isShiftLead: false })),
    ...shiftLeads.map((p) => ({ ...p, isShiftLead: true })),
  ];
  const estado: EstadoPessoaRotacao[] = pessoas.map((p) => ({
    isShiftLead: p.isShiftLead,
    consecutiveWork: 0,
    lastMesa: null,
    totalMesas: 0,
  }));
  const rows: string[][] = Array.from({ length: pessoas.length }, () => []);

  // Replay slots passados para restaurar estado (reingresso)
  if (fromSlot > 0 && opts.matrixBase) {
    for (let s = 0; s < fromSlot; s++) {
      for (let p = 0; p < pessoas.length; p++) {
        const v = opts.matrixBase[p]?.[s] ?? "Break";
        rows[p]!.push(v);
        const e = estado[p]!;
        if (v === "Break" || v === "X" || v === "F") {
          e.consecutiveWork = 0;
          e.lastMesa = null;
        } else {
          e.consecutiveWork += 1;
          e.lastMesa = v;
          e.totalMesas += 1;
        }
      }
    }
  }

  for (let s = fromSlot; s < nSlots; s++) {
    const aloc = alocarSlotRotacao(estado, mesas, maxConsec);
    if (!aloc) {
      return {
        ok: false,
        erro: `Não foi possível cobrir todas as mesas no horário ${s + 1}. Use o aviso para incluir Shift Lead ou intervalo de 20 min.`,
      };
    }
    const { workers, mesasAttr } = aloc;
    const assignment = Array.from({ length: pessoas.length }, () => "Break");
    for (let w = 0; w < workers.length; w++) {
      assignment[workers[w]!] = mesasAttr[w]!;
    }

    for (let p = 0; p < pessoas.length; p++) {
      const v = assignment[p]!;
      rows[p]!.push(v);
      const e = estado[p]!;
      if (v === "Break") {
        e.consecutiveWork = 0;
        e.lastMesa = null;
      } else {
        e.consecutiveWork += 1;
        e.lastMesa = v;
        e.totalMesas += 1;
      }
    }
  }

  return { ok: true, pessoas, matrix: rows };
}

/**
 * Compat: só GPs (sem Shift Lead). Prefira `gerarGradeRotacao`.
 */
export function gerarPatternRotacao(
  mesasLabels: string[],
  nPeople: number,
  nSlots: number,
): string[][] {
  const gps: RotacaoGeracaoPessoa[] = Array.from({ length: nPeople }, (_, i) => ({
    funcionarioId: `gp-${i}`,
    isShiftLead: false,
  }));
  const res = gerarGradeRotacao({ mesasLabels, gps, shiftLeads: [], nSlots });
  return res.ok ? res.matrix : [];
}

function mapPessoaPool(row: Record<string, unknown>, isShiftLead: boolean): RotacaoGpPool {
  const nome = String(row.nome ?? "").trim();
  const nick = String(row.nickname ?? "").trim();
  const origem = String(row.alocacao_origem ?? "staff");
  return {
    funcionarioId: String(row.funcionario_id ?? ""),
    nomeCompleto: nome,
    nomeExibicao: primeiroUltimoNome(nome) || nome || "—",
    nickname: nick || "—",
    falta: false,
    isShiftLead,
    estudioStaff: String(row.estudio_staff ?? "").trim(),
    estudioEfetivo: String(row.estudio_efetivo ?? "").trim(),
    alocacaoOrigem: origem === "manual" ? "manual" : "staff",
    chegou: null,
  };
}

function mapContexto(raw: Record<string, unknown>): RotacaoContextoDia {
  const gpsRaw = Array.isArray(raw.gps) ? raw.gps : [];
  const gpsOutrosRaw = Array.isArray(raw.gps_outros) ? raw.gps_outros : [];
  const slRaw = Array.isArray(raw.shift_leads) ? raw.shift_leads : [];
  const mesasRaw = Array.isArray(raw.mesas) ? raw.mesas : [];
  return {
    dia: String(raw.dia ?? "").slice(0, 10),
    turno: (String(raw.turno ?? "noite") as RotacaoTurnoKey),
    turnoLabel: String(raw.turno_label ?? ""),
    estudioSlug: String(raw.estudio_slug ?? ""),
    estudioNome: String(raw.estudio_nome ?? ""),
    escalaAprovada: Boolean(raw.escala_aprovada),
    turnoInicio: String(raw.turno_inicio ?? "06:00"),
    turnoFim: String(raw.turno_fim ?? "14:00"),
    horarioTexto: String(raw.horario_texto ?? "—"),
    gps: gpsRaw.map((g) => mapPessoaPool(g as Record<string, unknown>, false)),
    gpsOutros: gpsOutrosRaw.map((g) => mapPessoaPool(g as Record<string, unknown>, false)),
    shiftLeads: slRaw.map((g) => mapPessoaPool(g as Record<string, unknown>, true)),
    mesas: mesasRaw.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        mesaIdentificacao: String(row.mesa_identificacao ?? "").trim(),
        numeroMesa: String(row.numero_mesa ?? "").trim(),
        nomeMesa: String(row.nome_mesa ?? "").trim(),
        tipoJogo: String(row.tipo_jogo ?? "").trim(),
      };
    }),
  };
}

export async function carregarContextoRotacaoDia(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  estudioSlug: string;
}): Promise<{ ok: true; data: RotacaoContextoDia } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc("escala_rotacao_contexto_dia", {
    p_dia: opts.diaIso,
    p_turno: opts.turno,
    p_estudio_slug: opts.estudioSlug,
  });
  if (error) {
    console.error(error);
    return { ok: false, erro: MSG_ERRO };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, erro: MSG_ERRO };
  }
  return { ok: true, data: mapContexto(data as Record<string, unknown>) };
}

export async function listarEstudiosAtivosRotacao(): Promise<{ slug: string; nome: string }[]> {
  const { data, error } = await supabase
    .from("estudios_spin")
    .select("slug, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []).map((e) => ({
    slug: String(e.slug),
    nome: (e.nome ?? "").trim() || String(e.slug),
  }));
}

export async function carregarRotacaoPublicada(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  estudioSlug: string;
}): Promise<{ ok: true; data: RotacaoPublicada | null } | { ok: false; erro: string }> {
  const { data: cab, error } = await supabase
    .from("escala_rotacao")
    .select(
      "id, dia, turno, estudio_slug, estudio_nome, modelo_n, slot_minutos, turno_inicio, turno_fim, publicado_em",
    )
    .eq("dia", opts.diaIso)
    .eq("turno", opts.turno)
    .eq("estudio_slug", opts.estudioSlug)
    .eq("status", "publicada")
    .maybeSingle();

  if (error) {
    console.error(error);
    return { ok: false, erro: MSG_ERRO };
  }
  if (!cab) return { ok: true, data: null };

  const { data: cells, error: errC } = await supabase
    .from("escala_rotacao_celula")
    .select("funcionario_id, nome_exibicao, nickname, linha_ordem, slot_inicio, valor")
    .eq("rotacao_id", cab.id)
    .order("linha_ordem", { ascending: true })
    .order("slot_inicio", { ascending: true });

  if (errC) {
    console.error(errC);
    return { ok: false, erro: MSG_ERRO };
  }

  const rows = cells ?? [];
  const slotsUnicos = [...new Set(rows.map((r) => String(r.slot_inicio)))];
  const startMin = minutosDesdeMeiaNoite(String(cab.turno_inicio ?? "00:00"));
  const slots = slotsUnicos.sort((a, b) => {
    let ma = minutosDesdeMeiaNoite(a) - startMin;
    let mb = minutosDesdeMeiaNoite(b) - startMin;
    if (ma < 0) ma += 24 * 60;
    if (mb < 0) mb += 24 * 60;
    return ma - mb;
  });

  const byFunc = new Map<
    string,
    { nomeExibicao: string; nickname: string; ordem: number; slots: Map<string, string> }
  >();
  for (const r of rows) {
    const fid = String(r.funcionario_id);
    let entry = byFunc.get(fid);
    if (!entry) {
      entry = {
        nomeExibicao: String(r.nome_exibicao ?? "—"),
        nickname: String(r.nickname ?? "—"),
        ordem: Number(r.linha_ordem ?? 0),
        slots: new Map(),
      };
      byFunc.set(fid, entry);
    }
    entry.slots.set(String(r.slot_inicio), String(r.valor ?? ""));
  }

  const ordenados = [...byFunc.entries()].sort((a, b) => a[1].ordem - b[1].ordem);
  const gps: RotacaoPublicada["gps"] = [];
  const faltosos: RotacaoPublicada["faltosos"] = [];
  const matrix: string[][] = [];

  for (const [fid, entry] of ordenados) {
    const vals = slots.map((s) => entry.slots.get(s) ?? "—");
    const soFalta = vals.length > 0 && vals.every((v) => celulaEhFalta(v));
    if (soFalta) {
      faltosos.push({
        funcionarioId: fid,
        nomeExibicao: entry.nomeExibicao,
        nickname: entry.nickname,
      });
    } else {
      gps.push({
        funcionarioId: fid,
        nomeExibicao: entry.nomeExibicao,
        nickname: entry.nickname,
      });
      matrix.push(vals);
    }
  }

  return {
    ok: true,
    data: {
      id: String(cab.id),
      dia: String(cab.dia).slice(0, 10),
      turno: cab.turno as RotacaoTurnoKey,
      estudioSlug: String(cab.estudio_slug),
      estudioNome: String(cab.estudio_nome),
      modeloN: Number(cab.modelo_n),
      slotMinutos: Number(cab.slot_minutos),
      turnoInicio: String(cab.turno_inicio),
      turnoFim: String(cab.turno_fim),
      publicadoEm: cab.publicado_em ? String(cab.publicado_em) : null,
      slots,
      gps,
      matrix,
      faltosos,
    },
  };
}

export async function publicarRotacao(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  estudioSlug: string;
  estudioNome: string;
  modeloN: number;
  slotMinutos: number;
  turnoInicio: string;
  turnoFim: string;
  celulas: RotacaoCelulaPayload[];
}): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc("escala_rotacao_publicar", {
    p_payload: {
      dia: opts.diaIso,
      turno: opts.turno,
      estudio_slug: opts.estudioSlug,
      estudio_nome: opts.estudioNome,
      modelo_n: opts.modeloN,
      slot_minutos: opts.slotMinutos,
      turno_inicio: opts.turnoInicio,
      turno_fim: opts.turnoFim,
      celulas: opts.celulas,
    },
  });
  if (error) {
    console.error(error);
    return { ok: false, erro: MSG_ERRO_PUB };
  }
  return { ok: true, id: String(data) };
}

export function diaIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDiaRotacaoLabel(diaIso: string): string {
  const [y, m, d] = diaIso.split("-").map(Number);
  if (!y || !m || !d) return diaIso;
  const dt = new Date(y, m - 1, d);
  return dt
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .replace(".", "");
}

export function shiftDiaIso(diaIso: string, delta: number): string {
  const [y, m, d] = diaIso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + delta);
  return diaIsoLocal(dt);
}

/** Índice do próximo slot ≥ agora (HH:MM local), ou 0 se o turno ainda não começou. */
export function indiceProximoSlotRotacao(slots: string[], agora = new Date()): number {
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  for (let i = 0; i < slots.length; i++) {
    const sm = minutosDesdeMeiaNoite(slots[i]!);
    // Turno overnight: slots após meia-noite têm sm < início — comparar de forma simples
    if (sm >= nowMin || (i > 0 && sm < minutosDesdeMeiaNoite(slots[0]!) && nowMin < sm + 24 * 60)) {
      // Preferir slot cujo início ainda não passou no mesmo “ciclo”
      if (sm >= nowMin) return i;
    }
  }
  // Fallback: primeiro slot com início >= agora no dia civil
  for (let i = 0; i < slots.length; i++) {
    if (minutosDesdeMeiaNoite(slots[i]!) >= nowMin) return i;
  }
  return Math.max(0, slots.length - 1);
}

export async function alocarEstudioRotacao(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  funcionarioId: string;
  estudioSlug: string;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc("escala_rotacao_alocar_estudio", {
    p_dia: opts.diaIso,
    p_turno: opts.turno,
    p_funcionario_id: opts.funcionarioId,
    p_estudio_slug: opts.estudioSlug,
  });
  if (error) {
    console.error(error);
    return { ok: false, erro: "Não foi possível mover o prestador. Se o problema persistir, entre em contato com o suporte." };
  }
  const res = data as { ok?: boolean; error?: string } | null;
  if (!res?.ok) {
    return { ok: false, erro: "Não foi possível mover o prestador. Verifique o estúdio de destino." };
  }
  return { ok: true };
}

export async function limparAlocacaoRotacao(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  funcionarioId: string;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc("escala_rotacao_limpar_alocacao", {
    p_dia: opts.diaIso,
    p_turno: opts.turno,
    p_funcionario_id: opts.funcionarioId,
  });
  if (error) {
    console.error(error);
    return { ok: false, erro: "Não foi possível restaurar a alocação. Se o problema persistir, entre em contato com o suporte." };
  }
  const res = data as { ok?: boolean } | null;
  if (!res?.ok) return { ok: false, erro: "Não foi possível restaurar a alocação." };
  return { ok: true };
}

/** Enriquece o pool com Chegou / Não chegou (ponto do dia). */
export async function anexarCheckinRotacao(
  diaIso: string,
  pessoas: RotacaoGpPool[],
): Promise<RotacaoGpPool[]> {
  if (!pessoas.length) return pessoas;
  const ids = [...new Set(pessoas.map((p) => p.funcionarioId).filter(Boolean))];
  const { mapa, error } = await carregarPontoRegistrosDiaLote(supabase, ids, diaIso);
  if (error) {
    return pessoas.map((p) => ({ ...p, chegou: null }));
  }
  return pessoas.map((p) => {
    const pt = mapa.get(p.funcionarioId);
    return { ...p, chegou: Boolean(pt?.check_in_at) };
  });
}

/** Salva (ou atualiza) rascunho da rotação para o dia/turno/estúdio. */
export async function salvarRascunhoRotacao(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  estudioSlug: string;
  estudioNome: string;
  modeloN: number;
  slotMinutos: number;
  turnoInicio: string;
  turnoFim: string;
  celulas: RotacaoCelulaPayload[];
}): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const modelo = Math.min(24, Math.max(1, opts.modeloN));
  const { data: existente, error: errEx } = await supabase
    .from("escala_rotacao")
    .select("id")
    .eq("dia", opts.diaIso)
    .eq("turno", opts.turno)
    .eq("estudio_slug", opts.estudioSlug)
    .eq("status", "rascunho")
    .maybeSingle();
  if (errEx) {
    console.error(errEx);
    return { ok: false, erro: MSG_ERRO_PUB };
  }

  let rotId = existente?.id ? String(existente.id) : "";
  if (rotId) {
    const { error: upErr } = await supabase
      .from("escala_rotacao")
      .update({
        estudio_nome: opts.estudioNome,
        modelo_n: modelo,
        slot_minutos: opts.slotMinutos,
        turno_inicio: opts.turnoInicio,
        turno_fim: opts.turnoFim,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rotId);
    if (upErr) {
      console.error(upErr);
      return { ok: false, erro: MSG_ERRO_PUB };
    }
    await supabase.from("escala_rotacao_celula").delete().eq("rotacao_id", rotId);
  } else {
    const { data: ins, error: insErr } = await supabase
      .from("escala_rotacao")
      .insert({
        dia: opts.diaIso,
        turno: opts.turno,
        estudio_slug: opts.estudioSlug,
        estudio_nome: opts.estudioNome,
        status: "rascunho",
        modelo_n: modelo,
        slot_minutos: opts.slotMinutos,
        turno_inicio: opts.turnoInicio,
        turno_fim: opts.turnoFim,
      })
      .select("id")
      .single();
    if (insErr || !ins) {
      console.error(insErr);
      return { ok: false, erro: MSG_ERRO_PUB };
    }
    rotId = String(ins.id);
  }

  if (opts.celulas.length) {
    const rows = opts.celulas.map((c) => ({
      rotacao_id: rotId,
      funcionario_id: c.funcionario_id,
      nome_exibicao: c.nome_exibicao,
      nickname: c.nickname,
      linha_ordem: c.linha_ordem,
      slot_inicio: c.slot_inicio,
      valor: c.valor,
    }));
    const { error: celErr } = await supabase.from("escala_rotacao_celula").insert(rows);
    if (celErr) {
      console.error(celErr);
      return { ok: false, erro: MSG_ERRO_PUB };
    }
  }
  return { ok: true, id: rotId };
}

/**
 * Gera prévias (rascunho) para todos os dias do mês × turnos × estúdios ativos.
 * Chamado após aprovar Escala Estúdio (Game Presenter). Melhor esforço — não bloqueia a aprovação.
 */
export async function gerarPreviewsMesRotacao(refMesIso: string): Promise<{ geradas: number; erros: number }> {
  const [y, m] = refMesIso.slice(0, 10).split("-").map(Number);
  if (!y || !m) return { geradas: 0, erros: 0 };
  const diasNoMes = new Date(y, m, 0).getDate();
  const estudos = await listarEstudiosAtivosRotacao();
  const turnos: RotacaoTurnoKey[] = ["manha", "tarde", "noite"];
  let geradas = 0;
  let erros = 0;

  for (let d = 1; d <= diasNoMes; d++) {
    const diaIso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    for (const turno of turnos) {
      for (const est of estudos) {
        try {
          const ctxRes = await carregarContextoRotacaoDia({
            diaIso,
            turno,
            estudioSlug: est.slug,
          });
          if (!ctxRes.ok || !ctxRes.data.escalaAprovada) continue;
          const ctx = ctxRes.data;
          const mesas = labelsMesasRotacao(ctx.mesas);
          const gps = ctx.gps.filter((g) => !g.falta);
          if (!mesas.length || !gps.length) continue;
          const slotMin = 30;
          const slots = gerarSlotsRotacao(ctx.turnoInicio, ctx.turnoFim, slotMin);
          const gerado = gerarGradeRotacao({
            mesasLabels: mesas,
            gps: gps.map((g) => ({ funcionarioId: g.funcionarioId, isShiftLead: false })),
            shiftLeads: ctx.shiftLeads.map((g) => ({
              funcionarioId: g.funcionarioId,
              isShiftLead: true,
            })),
            nSlots: slots.length,
            slotMinutos: slotMin,
          });
          if (!gerado.ok) {
            erros += 1;
            continue;
          }
          const porId = new Map(gps.concat(ctx.shiftLeads).map((g) => [g.funcionarioId, g]));
          const celulas: RotacaoCelulaPayload[] = [];
          gerado.pessoas.forEach((p, i) => {
            const g = porId.get(p.funcionarioId);
            slots.forEach((slot, si) => {
              celulas.push({
                funcionario_id: p.funcionarioId,
                nome_exibicao: g?.nomeExibicao ?? "—",
                nickname: g?.nickname === "—" ? "" : (g?.nickname ?? ""),
                linha_ordem: i,
                slot_inicio: slot,
                valor: gerado.matrix[i]?.[si] ?? "Break",
              });
            });
          });
          const salv = await salvarRascunhoRotacao({
            diaIso,
            turno,
            estudioSlug: ctx.estudioSlug,
            estudioNome: ctx.estudioNome,
            modeloN: gps.length,
            slotMinutos: slotMin,
            turnoInicio: ctx.turnoInicio,
            turnoFim: ctx.turnoFim,
            celulas,
          });
          if (salv.ok) geradas += 1;
          else erros += 1;
        } catch (e) {
          console.error(e);
          erros += 1;
        }
      }
    }
  }
  return { geradas, erros };
}
