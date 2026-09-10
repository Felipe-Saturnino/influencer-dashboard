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

/** Bloco único da Rotação para Shufflers (atendem todos os estúdios). */
export const ROTACAO_SHUFFLER_ESTUDIO_SLUG = "shuffler";
export const ROTACAO_SHUFFLER_ESTUDIO_NOME = "Shuffler";
/** Valor da célula / «mesa» na grade de Shuffler. */
export const ROTACAO_SHUFFLER_MESA_LABEL = "TODOS";
/** Cor da pill TODOS — distinta do Break (#6b7280). */
export const ROTACAO_SHUFFLER_MESA_COR = "#0891b2";

export function isBlocoRotacaoShuffler(estudioSlug: string): boolean {
  return estudioSlug === ROTACAO_SHUFFLER_ESTUDIO_SLUG;
}

export type RotacaoCargoLideranca = "shift_leader" | "service_manager";

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
  /** Quando vem da lista de liderança (SL / SM). */
  cargoLideranca?: RotacaoCargoLideranca;
  /** Chave staff_horario_turno (ex.: 08-20, 20-08). */
  horarioTurno?: string;
  /** Célula da Escala Estúdio no dia (MRN / AFT / NGT). */
  gradeValor?: string;
  /**
   * Controle de Turno: HH:MM de saída (Saída Antecipada / Hora Adicional).
   * Slots com início ≥ este horário ficam «X» na grade.
   */
  saidaLimiteHhmm?: string;
};

/** Janela HH:MM do `staff_horario_turno` (ex.: 08-20 → 08:00–20:00). */
export type RotacaoIntervaloHorario = { inicio: string; fim: string };

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
  /** Shift Leads do mesmo turno (RPC) — legado; a UI só inclui liderança via «Incluir Liderança». */
  shiftLeads: RotacaoGpPool[];
  /**
   * Shift Leaders + Service Managers escalados no dia (qualquer célula MRN/AFT/NGT),
   * para o seletor «Incluir Liderança».
   */
  liderancas: RotacaoGpPool[];
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
 * Fisher–Yates. Usado para embaralhar a ordem das linhas de GP na prévia
 * (evita sequência alfabética fixa dia após dia). `rng` opcional para testes.
 */
export function embaralharListaRotacao<T>(lista: T[], rng: () => number = Math.random): T[] {
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
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
    if (n === ROTACAO_SHUFFLER_MESA_LABEL) continue;
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
  if (mesas.some((m) => m.numeroMesa.trim() === ROTACAO_SHUFFLER_MESA_LABEL)) {
    out[ROTACAO_SHUFFLER_MESA_LABEL] = ROTACAO_SHUFFLER_MESA_COR;
  }
  return out;
}

/** Fallback estável quando só há o rótulo da célula (ex.: rotação publicada sem catálogo). */
export function corMesaRotacao(tipoJogo: string, numeroMesa: string): string {
  if (numeroMesa.trim() === ROTACAO_SHUFFLER_MESA_LABEL) return ROTACAO_SHUFFLER_MESA_COR;
  const base = corMesaPorTipoJogo(tipoJogo);
  if (base === "#6b7280" || !numeroMesa.trim()) return base;
  return tomVarianteJogo(base, hashRotacaoSeed(numeroMesa.trim()) % 8);
}

/** True se a linha inteira é falta (legado F ou X). */
export function celulaEhFalta(valor: string): boolean {
  return valor === "X" || valor === "F";
}

/** True se a célula é mesa (não Break / X / F / vazia). */
export function celulaEhMesaRotacao(valor: string): boolean {
  const v = (valor || "").trim();
  if (!v || v === "—" || v === "-") return false;
  return v !== "Break" && v !== "X" && v !== "F";
}

/**
 * Maior sequência contínua de mesa na grade, em minutos
 * (Break / X / F zeram a contagem).
 */
export function maxMinutosMesaContinuaNaGrade(matrix: string[][], slotMinutos: number): number {
  const step = slotMinutos === 20 ? 20 : 30;
  let max = 0;
  for (const row of matrix) {
    let run = 0;
    for (const cell of row) {
      if (celulaEhMesaRotacao(cell)) {
        run += step;
        if (run > max) max = run;
      } else {
        run = 0;
      }
    }
  }
  return max;
}

/** Ex.: 120 → «2 horas»; 140 → «2 horas e 20 min». */
export function formatarTempoMesaContinuoPt(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h <= 0) return `${rest} min`;
  const horas = h === 1 ? "1 hora" : `${h} horas`;
  if (rest === 0) return horas;
  return `${horas} e ${rest} min`;
}

export function mensagemAvisoMesaContinuaPublicar(tempoLabel: string): string {
  return `Nesta rotação temos Prestadores realizando ${tempoLabel} tempo direto de mesa, quer seguir com esta rotação?`;
}

/**
 * Se algum prestador tem ≥ limiar (default 2h) contínuos em mesa, devolve o rótulo
 * do maior trecho; senão null (publicar sem aviso).
 */
export function tempoMesaContinuaQueExigeAviso(
  matrix: string[][],
  slotMinutos: number,
  limiarMinutos: number = 120,
): string | null {
  const max = maxMinutosMesaContinuaNaGrade(matrix, slotMinutos);
  if (max < limiarMinutos) return null;
  return formatarTempoMesaContinuoPt(max);
}

export function minutosDesdeMeiaNoite(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return 0;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

/** Turno imediatamente anterior (Manhã ← Noite do dia civil anterior). */
export function turnoAnteriorRotacao(
  diaIso: string,
  turno: RotacaoTurnoKey,
): { diaIso: string; turno: RotacaoTurnoKey } {
  if (turno === "tarde") return { diaIso, turno: "manha" };
  if (turno === "noite") return { diaIso, turno: "tarde" };
  return { diaIso: shiftDiaIso(diaIso, -1), turno: "noite" };
}

/**
 * True se o início do slot é ≥ saída, relativo ao início do turno (suporta overnight).
 * Usado para marcar «X» após Saída Antecipada / Hora Adicional.
 */
export function slotAtingiuOuPassouSaidaRotacao(
  slotHhmm: string,
  saidaHhmm: string,
  turnoInicio: string,
): boolean {
  const start = minutosDesdeMeiaNoite(turnoInicio);
  const norm = (hhmm: string) => {
    let m = minutosDesdeMeiaNoite(hhmm) - start;
    if (m < 0) m += 24 * 60;
    return m;
  };
  return norm(slotHhmm) >= norm(saidaHhmm);
}

/**
 * Converte chave `staff_horario_turno` (ex.: `08-20`, `20-08`, `18-06`) em HH:MM início/fim.
 */
export function parseIntervaloHorarioStaffRotacao(
  valor: string | null | undefined,
): RotacaoIntervaloHorario | null {
  const raw = (valor ?? "").trim().toLowerCase();
  if (!raw) return null;
  const v = raw.replace(/\s/g, "");
  // 08-20 | 08:00-20:00 | 8-20
  const m = /^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/.exec(v);
  if (m) {
    const hi = parseInt(m[1]!, 10);
    const mi = parseInt(m[2] ?? "0", 10);
    const hf = parseInt(m[3]!, 10);
    const mf = parseInt(m[4] ?? "0", 10);
    if (hi > 23 || hf > 23 || mi > 59 || mf > 59) return null;
    return {
      inicio: `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}`,
      fim: `${String(hf).padStart(2, "0")}:${String(mf).padStart(2, "0")}`,
    };
  }
  // 08h às 20h | 08h30 as 20h00
  const m2 = /^(\d{1,2})h(\d{2})?(?:às|as|-|–)(\d{1,2})h(\d{2})?$/.exec(v.replace(/à/g, "a"));
  if (m2) {
    const hi = parseInt(m2[1]!, 10);
    const mi = parseInt(m2[2] ?? "0", 10);
    const hf = parseInt(m2[3]!, 10);
    const mf = parseInt(m2[4] ?? "0", 10);
    if (hi > 23 || hf > 23 || mi > 59 || mf > 59) return null;
    return {
      inicio: `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}`,
      fim: `${String(hf).padStart(2, "0")}:${String(mf).padStart(2, "0")}`,
    };
  }
  return null;
}

/**
 * Slot dentro da janela de trabalho (relógio civil). Janela overnight (20–08) cobre
 * [20:00, 24:00) ∪ [00:00, 08:00). Fim exclusivo (slot 20:00 com fim 20:00 → fora).
 */
export function slotDentroJanelaHorarioRotacao(
  slotHhmm: string,
  janelaInicio: string,
  janelaFim: string,
): boolean {
  const s = minutosDesdeMeiaNoite(slotHhmm);
  const a = minutosDesdeMeiaNoite(janelaInicio);
  const b = minutosDesdeMeiaNoite(janelaFim);
  if (a === b) return true;
  if (a < b) return s >= a && s < b;
  return s >= a || s < b;
}

/**
 * Janela efetiva da liderança na rotação.
 * 1) `staff_horario_turno` (08-20, 20-08, 18-06, …)
 * 2) célula do dia (MRN/AFT → 08–20; NGT → 20–08)
 * 3) padrão diurno 08–20 (SL/SM sem cadastro de horário)
 */
export function janelaHorarioLiderancaRotacao(pessoa: {
  horarioTurno?: string | null;
  gradeValor?: string | null;
}): RotacaoIntervaloHorario {
  const fromKey = parseIntervaloHorarioStaffRotacao(pessoa.horarioTurno);
  if (fromKey) return fromKey;
  const g = siglaTurnoGradeRotacao(pessoa.gradeValor);
  if (g === "NGT") return { inicio: "20:00", fim: "08:00" };
  return { inicio: "08:00", fim: "20:00" };
}

/**
 * Máscara de disponibilidade por slot: liderança (08–20 / 20–08 / …) + saída CT.
 * `undefined` = sem restrição (GP típico do turno).
 * Liderança (`isShiftLead` / `cargoLideranca`) **sempre** tem janela — nunca cobre o turno inteiro
 * sem filtrar (ex.: Tarde até 22h30 com saída às 20h → X a partir de 20:00).
 */
export function disponivelPorSlotPessoaRotacao(
  slots: string[],
  pessoa: {
    horarioTurno?: string;
    gradeValor?: string;
    saidaLimiteHhmm?: string;
    isShiftLead?: boolean;
    cargoLideranca?: RotacaoCargoLideranca;
  },
  turnoInicio: string,
): boolean[] | undefined {
  const usarJanelaLid = Boolean(pessoa.isShiftLead || pessoa.cargoLideranca);
  const janela = usarJanelaLid ? janelaHorarioLiderancaRotacao(pessoa) : null;
  const saida = pessoa.saidaLimiteHhmm?.trim() || "";
  if (!janela && !saida) return undefined;
  return slots.map((slot) => {
    if (janela && !slotDentroJanelaHorarioRotacao(slot, janela.inicio, janela.fim)) {
      return false;
    }
    if (saida && slotAtingiuOuPassouSaidaRotacao(slot, saida, turnoInicio)) {
      return false;
    }
    return true;
  });
}

/**
 * Sobrescreve com «X» slots fora da janela da liderança e/ou ≥ saída (CT).
 * Preferir gerar a grade já com `disponivelPorSlot` para não deixar mesa descoberta.
 */
export function aplicarLimitesDisponibilidadeNaMatrixRotacao(
  slots: string[],
  matrix: string[][],
  pessoas: ReadonlyArray<{
    horarioTurno?: string;
    gradeValor?: string;
    saidaLimiteHhmm?: string;
    isShiftLead?: boolean;
    cargoLideranca?: RotacaoCargoLideranca;
  }>,
  turnoInicio: string,
): string[][] {
  return matrix.map((row, i) => {
    const mask = disponivelPorSlotPessoaRotacao(slots, pessoas[i] ?? {}, turnoInicio);
    if (!mask) return [...row];
    return row.map((val, si) => (mask[si] === false ? "X" : val));
  });
}

/** @deprecated Preferir `aplicarLimitesDisponibilidadeNaMatrixRotacao`. */
export function aplicarLimiteSaidaNaMatrixRotacao(
  slots: string[],
  matrix: string[][],
  pessoas: ReadonlyArray<{
    horarioTurno?: string;
    gradeValor?: string;
    saidaLimiteHhmm?: string;
    isShiftLead?: boolean;
    cargoLideranca?: RotacaoCargoLideranca;
  }>,
  turnoInicio: string,
): string[][] {
  return aplicarLimitesDisponibilidadeNaMatrixRotacao(slots, matrix, pessoas, turnoInicio);
}

/**
 * Troca quem ocupa cada linha da prévia: os padrões de mesa (matrix) ficam no índice;
 * só as pessoas (`gps`) trocam de lugar — assim quem vai para a linha da Amanda herda 6130….
 * Reaplica X fora da janela da liderança / saída CT; X órfão do ocupante anterior vira Break.
 */
export function trocarPessoasLinhasPreviaRotacao(opts: {
  gps: RotacaoGpPool[];
  matrix: string[][];
  fromIndex: number;
  toIndex: number;
  slots: string[];
  turnoInicio: string;
}): { gps: RotacaoGpPool[]; matrix: string[][] } | null {
  const { fromIndex: a, toIndex: b, slots, turnoInicio } = opts;
  if (a === b) return null;
  if (a < 0 || b < 0 || a >= opts.gps.length || b >= opts.gps.length) return null;
  if (opts.matrix.length !== opts.gps.length) return null;

  const gps = opts.gps.map((g) => ({ ...g }));
  const tmp = gps[a]!;
  gps[a] = gps[b]!;
  gps[b] = tmp;

  const masks = gps.map((p) => disponivelPorSlotPessoaRotacao(slots, p, turnoInicio));
  const matrix = opts.matrix.map((row, i) => {
    const mask = masks[i];
    return row.map((val, si) => {
      if (mask && mask[si] === false) return "X";
      if (val === "X" && (!mask || mask[si] === true)) return "Break";
      return val;
    });
  });

  return { gps, matrix };
}

/** Presença da Escala do Turno (shape mínimo) para filtrar o pool da Rotação no CT. */
export type PresencaRotacaoCt = {
  id: string;
  status: string;
  saida: string;
};

const STATUS_POOL_TURNO_ATUAL = new Set([
  "presente",
  "pendente",
  "saida_antecipada",
  "hora_adicional",
]);

/**
 * Pool da Rotação (CT): Presente / Pendente / Saída Antecipada / Hora Adicional do turno atual;
 * Hora Adicional do turno anterior (mesmo estúdio) também entra até a saída registrada (células ≥ saída = X).
 */
export function filtrarPoolRotacaoPorPresencaCt(opts: {
  gps: RotacaoGpPool[];
  presencaAtual: PresencaRotacaoCt[];
  presencaAnterior: PresencaRotacaoCt[];
  gpsTurnoAnteriorMesmoEstudio: RotacaoGpPool[];
}): RotacaoGpPool[] {
  const byIdAtual = new Map(opts.presencaAtual.map((r) => [r.id, r]));
  const pool: RotacaoGpPool[] = [];
  const ids = new Set<string>();

  for (const g of opts.gps) {
    const p = byIdAtual.get(g.funcionarioId);
    if (!p || !STATUS_POOL_TURNO_ATUAL.has(p.status)) continue;
    const saida = p.saida.trim();
    const comLimite =
      (p.status === "saida_antecipada" || p.status === "hora_adicional") && saida
        ? saida
        : undefined;
    pool.push({ ...g, saidaLimiteHhmm: comLimite });
    ids.add(g.funcionarioId);
  }

  const byIdAnt = new Map(opts.presencaAnterior.map((r) => [r.id, r]));
  for (const g of opts.gpsTurnoAnteriorMesmoEstudio) {
    if (ids.has(g.funcionarioId)) continue;
    const p = byIdAnt.get(g.funcionarioId);
    if (!p || p.status !== "hora_adicional") continue;
    const saida = p.saida.trim();
    pool.push({
      ...g,
      falta: false,
      isShiftLead: false,
      saidaLimiteHhmm: saida || undefined,
    });
    ids.add(g.funcionarioId);
  }

  return pool;
}

/** True se o nome do time Organograma indica Shuffler. */
export function timeIndicaShufflerRotacao(time: string | null | undefined): boolean {
  return (time ?? "").toLowerCase().includes("shuffler");
}

/**
 * Monta o pool de Shufflers a partir da Escala do Turno (presença CT).
 * Mesma regra de status que GPs; Hora Adicional do turno anterior também entra.
 */
export function montarPoolShufflerRotacaoDePresenca(opts: {
  presencaAtual: Array<{
    id: string;
    nome: string;
    nickname: string;
    time: string;
    status: string;
    saida: string;
  }>;
  presencaAnterior: Array<{
    id: string;
    nome: string;
    nickname: string;
    time: string;
    status: string;
    saida: string;
  }>;
}): RotacaoGpPool[] {
  const toGp = (p: {
    id: string;
    nome: string;
    nickname: string;
  }): RotacaoGpPool => {
    const nome = (p.nome || "").trim() || "—";
    const nick = (p.nickname || "").trim();
    return {
      funcionarioId: p.id,
      nomeCompleto: nome,
      nomeExibicao: primeiroUltimoNome(nome) || nome,
      nickname: nick || nome.split(/\s+/)[0] || "—",
      falta: false,
      isShiftLead: false,
      estudioStaff: "todos",
      estudioEfetivo: "todos",
      alocacaoOrigem: "staff",
    };
  };

  const atuais = opts.presencaAtual.filter((p) => timeIndicaShufflerRotacao(p.time));
  const anteriores = opts.presencaAnterior.filter((p) => timeIndicaShufflerRotacao(p.time));
  const gps = atuais.map(toGp);
  const gpsAnt = anteriores.map(toGp);

  return filtrarPoolRotacaoPorPresencaCt({
    gps,
    presencaAtual: atuais,
    presencaAnterior: anteriores,
    gpsTurnoAnteriorMesmoEstudio: gpsAnt,
  });
}

export function mesaRotacaoShufflerTodos(): RotacaoMesa {
  return {
    id: "todos",
    mesaIdentificacao: ROTACAO_SHUFFLER_MESA_LABEL,
    numeroMesa: ROTACAO_SHUFFLER_MESA_LABEL,
    nomeMesa: "Todos Estúdios",
    tipoJogo: "",
  };
}

/** Contexto sintético do bloco Shuffler — uma «mesa» TODOS, sem move entre estúdios. */
export function montarContextoRotacaoShuffler(opts: {
  diaIso: string;
  turno: RotacaoTurnoKey;
  turnoInicio: string;
  turnoFim: string;
  horarioTexto?: string;
  escalaAprovada: boolean;
  shufflers: RotacaoGpPool[];
}): RotacaoContextoDia {
  const label =
    opts.turno === "manha" ? "Manhã" : opts.turno === "tarde" ? "Tarde" : "Noite";
  return {
    dia: opts.diaIso.slice(0, 10),
    turno: opts.turno,
    turnoLabel: label,
    estudioSlug: ROTACAO_SHUFFLER_ESTUDIO_SLUG,
    estudioNome: ROTACAO_SHUFFLER_ESTUDIO_NOME,
    escalaAprovada: opts.escalaAprovada,
    turnoInicio: opts.turnoInicio,
    turnoFim: opts.turnoFim,
    horarioTexto:
      opts.horarioTexto?.trim() ||
      `${opts.turnoInicio} às ${opts.turnoFim}`,
    gps: opts.shufflers,
    gpsOutros: [],
    shiftLeads: [],
    liderancas: [],
    mesas: [mesaRotacaoShufflerTodos()],
  };
}

function hhmmMaisHoras(hhmm: string, horas: number): string {
  const base = minutosDesdeMeiaNoite(hhmm) + horas * 60;
  const norm = ((base % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Horário do turno para o bloco Shuffler (1º estúdio ativo com horário, +8h). */
export async function carregarHorarioTurnoRotacaoShuffler(
  turno: RotacaoTurnoKey,
): Promise<{ inicio: string; fim: string; horarioTexto: string }> {
  const fallbackInicio =
    turno === "manha" ? "06:00" : turno === "tarde" ? "12:00" : "18:00";
  const col =
    turno === "manha"
      ? "turno_manha_inicio"
      : turno === "tarde"
        ? "turno_tarde_inicio"
        : "turno_noite_inicio";

  const { data, error } = await supabase
    .from("estudios_spin")
    .select(`slug, ${col}`)
    .eq("ativo", true)
    .order("slug", { ascending: true });

  if (error) {
    console.error(error);
  }

  let inicio = fallbackInicio;
  for (const row of data ?? []) {
    const raw = String((row as Record<string, unknown>)[col] ?? "").trim();
    const m = /^(\d{1,2}):(\d{2})/.exec(raw);
    if (m) {
      inicio = `${m[1]!.padStart(2, "0")}:${m[2]}`;
      break;
    }
  }
  const fim = hhmmMaisHoras(inicio, 8);
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(":");
    return m === "00" ? `${h}h` : `${h}h${m}`;
  };
  return {
    inicio,
    fim,
    horarioTexto: `${fmt(inicio)} às ${fmt(fim)}`,
  };
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
  disponivel?: (idx: number) => boolean,
): { workers: number[]; mesasAttr: string[] } | null {
  const M = mesas.length;
  const forcar = mesas.length >= 2;
  const ok = disponivel ?? (() => true);
  let workers = escolherWorkersSlot(estado, M, maxConsec, ok);
  if (workers.length < M) return null;

  let mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado, forcar);
  if (mesasAttr) return { workers, mesasAttr };

  if (!forcar) {
    mesasAttr = atribuirMesasSemRepeticao(workers, mesas, estado, false);
    return mesasAttr ? { workers, mesasAttr } : null;
  }

  const resting = estado.map((_, i) => i).filter((i) => !workers.includes(i) && ok(i));
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
    const todos = estado.map((_, i) => i).filter((i) => ok(i));
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
  disponivel: (idx: number) => boolean = () => true,
): number[] {
  const M = mesasCount;
  const gpOk: number[] = [];
  const gpMustRest: number[] = [];
  const slIdx: number[] = [];

  for (let i = 0; i < estado.length; i++) {
    if (!disponivel(i)) continue;
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
  /**
   * Por índice de slot: `false` = fora da janela (liderança) ou ≥ saída CT — célula «X»,
   * não entra como worker.
   */
  disponivelPorSlot?: boolean[];
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
 * — Shift Lead entra só para cobrir e faz o mínimo de mesas;
 * — ordem das linhas de GP é **aleatória** em geração completa (não alfabética),
 *   para não repetir a mesma sequência de mesas/breaks todos os dias.
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
  /**
   * Em geração completa (`fromSlot` 0), embaralha a ordem dos GPs (default `true`).
   * Desligar ao incluir liderança sem querer trocar quem herda cada sequência.
   */
  embaralharGps?: boolean;
  /** RNG opcional (testes). */
  rng?: () => number;
}): RotacaoGeracaoResultado {
  const mesas = opts.mesasLabels.filter((m) => m.trim());
  let gps = opts.gps.filter((p) => !p.isShiftLead);
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

  const deveEmbaralhar = fromSlot === 0 && opts.embaralharGps !== false;
  if (deveEmbaralhar) {
    gps = embaralharListaRotacao(gps, opts.rng);
  }

  const pessoas: RotacaoGeracaoPessoa[] = [
    ...gps.map((p) => ({ ...p, isShiftLead: false as const })),
    ...shiftLeads.map((p) => ({ ...p, isShiftLead: true as const })),
  ];
  const estado: EstadoPessoaRotacao[] = pessoas.map((p) => ({
    isShiftLead: p.isShiftLead,
    consecutiveWork: 0,
    lastMesa: null,
    totalMesas: 0,
  }));
  const rows: string[][] = Array.from({ length: pessoas.length }, () => []);

  const disponivelEm = (pIdx: number, slotIdx: number): boolean => {
    const mask = pessoas[pIdx]?.disponivelPorSlot;
    if (!mask) return true;
    return mask[slotIdx] !== false;
  };

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
    const aloc = alocarSlotRotacao(estado, mesas, maxConsec, (i) => disponivelEm(i, s));
    if (!aloc) {
      return {
        ok: false,
        erro: `Não foi possível cobrir todas as mesas no horário ${s + 1}. Use Incluir Liderança ou Rotação de 20min.`,
      };
    }
    const { workers, mesasAttr } = aloc;
    const assignment = Array.from({ length: pessoas.length }, () => "Break");
    for (let w = 0; w < workers.length; w++) {
      assignment[workers[w]!] = mesasAttr[w]!;
    }

    for (let p = 0; p < pessoas.length; p++) {
      let v = assignment[p]!;
      if (!disponivelEm(p, s)) v = "X";
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
  const cargoRaw = String(row.cargo ?? row.area_key ?? "").trim().toLowerCase();
  let cargoLideranca: RotacaoCargoLideranca | undefined;
  if (cargoRaw === "shift_leader" || cargoRaw.includes("shift leader")) {
    cargoLideranca = "shift_leader";
  } else if (cargoRaw === "service_manager" || cargoRaw.includes("service manager")) {
    cargoLideranca = "service_manager";
  } else if (isShiftLead) {
    cargoLideranca = "shift_leader";
  }
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
    cargoLideranca,
    horarioTurno: String(row.staff_horario_turno ?? row.horario_turno ?? "").trim() || undefined,
    gradeValor: String(row.grade_valor ?? row.valor ?? "").trim() || undefined,
  };
}

/**
 * Normaliza célula da Escala Estúdio para sigla de turno (MRN/AFT/NGT).
 * Inclui Compra - Turno (Marketplace); Venda/Troca/Folga → null.
 */
export function siglaTurnoGradeRotacao(
  valor: string | null | undefined,
): "MRN" | "AFT" | "NGT" | null {
  const v = (valor ?? "").trim();
  if (v === "MRN" || v === "Manhã" || v === "Compra - Manhã") return "MRN";
  if (v === "AFT" || v === "Tarde" || v === "Compra - Tarde") return "AFT";
  if (v === "NGT" || v === "Noite" || v === "Compra - Noite") return "NGT";
  return null;
}

/**
 * Incluir Liderança: SL e SM escalados no dia ficam disponíveis em **qualquer** turno
 * (Manhã / Tarde / Noite) para inclusão sob demanda — sem filtro por janela 08h–20h / 20h–08h.
 * A disponibilidade por slot (X fora da janela) é tratada em `disponivelPorSlotPessoaRotacao`.
 */
export function liderancaCompativelComTurnoRotacao(
  _turno: RotacaoTurnoKey,
  _opts?: { horarioTurno?: string | null; gradeValor?: string | null },
): boolean {
  return true;
}

export function labelCargoLiderancaRotacao(cargo?: RotacaoCargoLideranca): string {
  if (cargo === "service_manager") return "Service Manager";
  return "Shift Leader";
}

function mapContexto(raw: Record<string, unknown>): RotacaoContextoDia {
  const gpsRaw = Array.isArray(raw.gps) ? raw.gps : [];
  const gpsOutrosRaw = Array.isArray(raw.gps_outros) ? raw.gps_outros : [];
  const slRaw = Array.isArray(raw.shift_leads) ? raw.shift_leads : [];
  const lidRaw = Array.isArray(raw.liderancas) ? raw.liderancas : [];
  const mesasRaw = Array.isArray(raw.mesas) ? raw.mesas : [];
  const liderancas =
    lidRaw.length > 0
      ? lidRaw.map((g) => mapPessoaPool(g as Record<string, unknown>, true))
      : slRaw.map((g) => mapPessoaPool(g as Record<string, unknown>, true));
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
    liderancas,
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
            gps: gps.map((g) => ({
              funcionarioId: g.funcionarioId,
              isShiftLead: false,
              disponivelPorSlot: disponivelPorSlotPessoaRotacao(slots, g, ctx.turnoInicio),
            })),
            // Prévia do mês: só GPs — liderança entra depois via «Incluir Liderança» na UI.
            shiftLeads: [],
            nSlots: slots.length,
            slotMinutos: slotMin,
          });
          if (!gerado.ok) {
            erros += 1;
            continue;
          }
          const porId = new Map(gps.map((g) => [g.funcionarioId, g]));
          const linhas = gerado.pessoas.map((p) => {
            const g = porId.get(p.funcionarioId);
            return (
              g ?? {
                funcionarioId: p.funcionarioId,
                nomeCompleto: "—",
                nomeExibicao: "—",
                nickname: "—",
                falta: false,
                isShiftLead: p.isShiftLead,
              }
            );
          });
          const matrix = aplicarLimitesDisponibilidadeNaMatrixRotacao(
            slots,
            gerado.matrix,
            linhas,
            ctx.turnoInicio,
          );
          const celulas: RotacaoCelulaPayload[] = [];
          gerado.pessoas.forEach((p, i) => {
            const g = linhas[i];
            slots.forEach((slot, si) => {
              celulas.push({
                funcionario_id: p.funcionarioId,
                nome_exibicao: g?.nomeExibicao ?? "—",
                nickname: g?.nickname === "—" ? "" : (g?.nickname ?? ""),
                linha_ordem: i,
                slot_inicio: slot,
                valor: matrix[i]?.[si] ?? "Break",
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
