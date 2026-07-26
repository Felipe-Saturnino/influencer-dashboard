/**
 * Escala → Rotação: contexto do dia (RPC), geração de grade e publicação.
 */
import { supabase } from "./supabase";
import { primeiroUltimoNome } from "./rhGamePresenterDealerSync";
import {
  GAME_IDENTITY_HEX,
  type GameIdentityKey,
} from "./gameIdentityColors";

export type RotacaoTurnoKey = "manha" | "tarde" | "noite";

export type RotacaoGpPool = {
  funcionarioId: string;
  nomeCompleto: string;
  nomeExibicao: string;
  nickname: string;
  falta: boolean;
  /** Reserva operacional — só entra na grade para cobrir mesas. */
  isShiftLead: boolean;
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

/** Máximo de slots seguidos em mesa antes do Break (Game Presenters). */
export const ROTACAO_MAX_MESAS_SEGUIDAS = 4;

type EstadoPessoaRotacao = {
  isShiftLead: boolean;
  consecutiveWork: number;
  lastMesa: string | null;
  totalMesas: number;
};

/**
 * Atribui mesas 1:1 aos workers sem repetir a mesa do slot anterior (quando possível).
 */
function atribuirMesasSemRepeticao(
  workers: number[],
  mesas: string[],
  estado: EstadoPessoaRotacao[],
): string[] {
  const n = workers.length;
  const result: (string | null)[] = Array.from({ length: n }, () => null);
  const used = new Set<string>();

  const ordem = workers
    .map((wi, idx) => {
      const last = estado[wi]!.lastMesa;
      const opts = mesas.filter((m) => m !== last);
      return { idx, wi, opts: opts.length > 0 ? opts : mesas };
    })
    .sort((a, b) => a.opts.length - b.opts.length || a.idx - b.idx);

  function bt(k: number): boolean {
    if (k >= ordem.length) return true;
    const { idx, wi, opts } = ordem[k]!;
    const preferidos = opts.filter((m) => m !== estado[wi]!.lastMesa);
    const tentativas = preferidos.length > 0 ? [...preferidos, ...mesas.filter((m) => !preferidos.includes(m))] : mesas;
    for (const m of tentativas) {
      if (used.has(m)) continue;
      used.add(m);
      result[idx] = m;
      if (bt(k + 1)) return true;
      used.delete(m);
      result[idx] = null;
    }
    return false;
  }

  if (!bt(0)) {
    // Fallback determinístico
    for (let i = 0; i < n; i++) {
      result[i] = mesas[i % mesas.length]!;
    }
  }
  return result.map((m, i) => m ?? mesas[i % mesas.length]!);
}

function escolherWorkersSlot(
  estado: EstadoPessoaRotacao[],
  mesasCount: number,
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
    if (e.consecutiveWork >= ROTACAO_MAX_MESAS_SEGUIDAS) gpMustRest.push(i);
    else gpOk.push(i);
  }

  const nGp = gpOk.length + gpMustRest.length;

  // Preferir GPs frescos (saíram de Break) e com menor streak
  gpOk.sort((a, b) => {
    const ea = estado[a]!;
    const eb = estado[b]!;
    const freshA = ea.consecutiveWork === 0 ? 0 : 1;
    const freshB = eb.consecutiveWork === 0 ? 0 : 1;
    if (freshA !== freshB) return freshA - freshB;
    if (ea.consecutiveWork !== eb.consecutiveWork) return ea.consecutiveWork - eb.consecutiveWork;
    return a - b;
  });

  /**
   * Quantos GPs colocar em mesa neste slot.
   * Se N_GP ≤ M e há Shift Lead, deixa 1 vaga ao SL para os GPs poderem Break (ritmo 4+1).
   * Se vários GPs estão perto do limite (3/4), também abre 1 vaga ao SL.
   */
  let gpTarget = Math.min(gpOk.length, M);
  if (slIdx.length > 0 && gpOk.length >= M) {
    const nearLimit = gpOk.filter(
      (i) => estado[i]!.consecutiveWork >= ROTACAO_MAX_MESAS_SEGUIDAS - 1,
    ).length;
    if (nGp <= M || nearLimit >= 2) {
      gpTarget = Math.min(gpOk.length, M - 1);
    }
  }

  const workers: number[] = [];
  for (const i of gpOk) {
    if (workers.length >= gpTarget) break;
    workers.push(i);
  }

  // Cobertura: Shift Lead só o mínimo (quem menos fez mesa)
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

  // Último recurso: GP que já fez 4 (melhor que mesa vazia)
  if (workers.length < M) {
    gpMustRest.sort((a, b) => estado[a]!.totalMesas - estado[b]!.totalMesas || a - b);
    for (const i of gpMustRest) {
      if (workers.length >= M) break;
      workers.push(i);
    }
  }

  // Ainda faltou GP “ok” que sobrou e não usamos (ex.: gpTarget < disponíveis) — só se ainda faltar mesa
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
 * — GP não repete a mesma mesa no slot seguinte;
 * — GP faz no máximo 4 mesas seguidas e depois Break;
 * — Shift Lead entra só para cobrir falta de gente e faz o mínimo de mesas.
 */
export function gerarGradeRotacao(opts: {
  mesasLabels: string[];
  gps: RotacaoGeracaoPessoa[];
  shiftLeads: RotacaoGeracaoPessoa[];
  nSlots: number;
}): RotacaoGeracaoResultado {
  const mesas = opts.mesasLabels.filter((m) => m.trim());
  const gps = opts.gps.filter((p) => !p.isShiftLead);
  const shiftLeads = opts.shiftLeads.filter((p) => p.isShiftLead);
  const nSlots = opts.nSlots;

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

  for (let s = 0; s < nSlots; s++) {
    const workers = escolherWorkersSlot(estado, mesas.length);
    if (workers.length < mesas.length) {
      return {
        ok: false,
        erro: `Não foi possível cobrir todas as mesas no horário ${s + 1}. Inclua mais GPs elegíveis ou Shift Lead na escala.`,
      };
    }
    const mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado);
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
  return {
    funcionarioId: String(row.funcionario_id ?? ""),
    nomeCompleto: nome,
    nomeExibicao: primeiroUltimoNome(nome) || nome || "—",
    nickname: nick || "—",
    falta: false,
    isShiftLead,
  };
}

function mapContexto(raw: Record<string, unknown>): RotacaoContextoDia {
  const gpsRaw = Array.isArray(raw.gps) ? raw.gps : [];
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
