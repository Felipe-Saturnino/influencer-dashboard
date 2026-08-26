/**
 * Sugestão de escala Customer Service — lógica alinhada ao simulado de Março/2026,
 * com sequência contínua entre meses (usa offset de dias + fase K).
 * Se existirem células salvas do mês anterior, infere a **fase φ mod 6** por prestador a partir
 * dos dias operacionais (MRN/AFT/NGT/Folga). Compra, Venda, Troca e Compra - Turno ficam fora
 * do ciclo e não deslocam a continuidade. Janela de referência: até 31 dias antes do mês novo.
 *
 * **Live no Estúdio** (`liveNoEstudioIso`): quando informado na Gestão de Staff, é o dia 0 do
 * padrão de escala (3×3, 4×2, 5×1, 5×2). Dias anteriores à live ficam em Folga; a partir da live
 * aplica-se o cadastro de escala + turno. Sem live, mantém offset legado desde 2000-01-01 UTC.
 */

import { normalizarEscalaCadastro, turnoStaffEhComercial5x2 } from "./rhEscalaTurnos";
import { valorCelulaHorarioComercialSintetico } from "./overviewPrestadorCalendarioHelpers";

export type DiaMesLite = {
  iso: string;
  isWeekend: boolean;
  isFeriadoSP: boolean;
};

export type LinhaCS = {
  id: string;
  escalaCadastro: string;
  siglaTurnoStaff: string;
  turnoStaffNome: string;
  /** YYYY-MM-DD — Live no Estúdio (Gestão de Staff); primeiro dia do ciclo de escala. */
  liveNoEstudioIso?: string | null;
};

export type OpcoesSugestaoCs = {
  /** Chaves `prestadorId|YYYY-MM-DD` do mês anterior (ex.: vinda de `rh_gestao_escala_grade_carregar`). */
  celulasMesAnterior?: Record<string, string>;
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Dias desde 2000-01-01 UTC (inteiro) — sequência contínua entre meses. */
export function dayOffsetUtc2000(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const t0 = Date.UTC(2000, 0, 1);
  const t1 = Date.UTC(y, m - 1, d);
  return Math.round((t1 - t0) / 86400000);
}

/** Normaliza data da Live no Estúdio para YYYY-MM-DD ou null. */
export function liveNoEstudioIsoNorm(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().slice(0, 10);
  if (s.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Offset do dia para o padrão cíclico: dias desde a Live no Estúdio (se houver);
 * senão offset absoluto desde 2000-01-01 (legado).
 */
export function offsetDiaEscala(diaIso: string, liveNoEstudioIso: string | null): number {
  if (liveNoEstudioIso) {
    return dayOffsetUtc2000(diaIso) - dayOffsetUtc2000(liveNoEstudioIso);
  }
  return dayOffsetUtc2000(diaIso);
}

export function diaAntesLiveNoEstudio(diaIso: string, liveNoEstudioIso: string | null): boolean {
  return liveNoEstudioIso != null && offsetDiaEscala(diaIso, liveNoEstudioIso) < 0;
}

/** Lista os últimos `n` dias antes do primeiro dia do mês de `primeiroIso` (ordem cronológica crescente). */
export function ultimosIsosAntesPrimeiroDiaMes(primeiroIso: string, n: number): string[] {
  const [y, m, d] = primeiroIso.split("-").map(Number);
  if (!y || !m || !d || n <= 0) return [];
  const base = Date.UTC(y, m - 1, d);
  const rev: string[] = [];
  for (let i = 1; i <= n; i++) {
    const t = base - i * 86400000;
    const yy = new Date(t).getUTCFullYear();
    const mm = String(new Date(t).getUTCMonth() + 1).padStart(2, "0");
    const dd = String(new Date(t).getUTCDate()).padStart(2, "0");
    rev.push(`${yy}-${mm}-${dd}`);
  }
  return rev.reverse();
}

function chaveCel(rowId: string, iso: string): string {
  return `${rowId}|${iso}`;
}

/**
 * Valores da grade que entram na continuidade do ciclo (MRN/AFT/NGT/Folga).
 * Compra, Venda, Troca, Compra - Turno, Comercial e Atestado ficam **fora** da escala —
 * dias extras que não deslocam o padrão 3×3 / 4×2 / 5×1.
 */
function normOperacional(v: string): "MRN" | "AFT" | "NGT" | "Folga" | null {
  const t = v.trim();
  if (t === "MRN" || t === "AFT" || t === "NGT" || t === "Folga") return t;
  if (t === "F" || t.toLowerCase() === "folga") return "Folga";
  if (t === "Manhã" || t.toLowerCase() === "manha") return "MRN";
  if (t === "Tarde") return "AFT";
  if (t === "Noite") return "NGT";
  if (
    t === "Compra" ||
    t === "Venda" ||
    t === "Troca" ||
    t === "Atestado" ||
    t === "Comercial" ||
    t.toLowerCase() === "comercial" ||
    /^Compra - /.test(t)
  ) {
    return null;
  }
  return null;
}

/** Até `maxDias` antes de `primeiroIso`, unindo calendário e células gravadas do prestador. */
export function isosReferenciaContinuidade(
  rowId: string,
  primeiroIso: string,
  prevMap: Record<string, string>,
  maxDias = 31,
): string[] {
  const fromCal = ultimosIsosAntesPrimeiroDiaMes(primeiroIso, maxDias);
  const prefix = `${rowId}|`;
  const merged = new Set(fromCal);
  for (const key of Object.keys(prevMap)) {
    if (!key.startsWith(prefix)) continue;
    const iso = key.slice(prefix.length);
    if (iso < primeiroIso) merged.add(iso);
  }
  const sorted = [...merged].sort();
  return sorted.length > maxDias ? sorted.slice(-maxDias) : sorted;
}

type AmostraOperacional = { iso: string; off: number; v: "MRN" | "AFT" | "NGT" | "Folga" };

function amostrasOperacionaisReferencia(
  rowId: string,
  isosAsc: string[],
  prevMap: Record<string, string>,
  liveIso: string | null,
): AmostraOperacional[] {
  const out: AmostraOperacional[] = [];
  for (const iso of isosAsc) {
    const off = offsetDiaEscala(iso, liveIso);
    if (liveIso && off < 0) continue;
    const v = normOperacional(prevMap[chaveCel(rowId, iso)]?.trim() ?? "");
    if (v === null) continue;
    out.push({ iso, off, v });
  }
  return out;
}

/**
 * Infere fase φ ∈ [0,5] do ciclo mod 6 (equivale a K + desloc do legado) a partir do mês anterior.
 * Ignora dias fora da escala (Marketplace). Desempate pelo **último dia operacional**, não pelo último dia civil.
 */
function inferirFaseCicloMod6(
  amostras: AmostraOperacional[],
  pred: (off: number, phase: number) => "MRN" | "AFT" | "NGT" | "Folga",
  phaseDefault: number,
): number {
  if (amostras.length === 0) return phaseDefault;

  const lastOpIso = amostras[amostras.length - 1]!.iso;
  let bestPhase = phaseDefault;
  let bestScore = -1;
  let bestLastMatch = false;

  for (let phase = 0; phase < 6; phase++) {
    let score = 0;
    let lastMatch = false;
    for (const s of amostras) {
      if (pred(s.off, phase) === s.v) {
        score++;
        if (s.iso === lastOpIso) lastMatch = true;
      }
    }
    if (score > bestScore || (score === bestScore && lastMatch && !bestLastMatch)) {
      bestScore = score;
      bestPhase = phase;
      bestLastMatch = lastMatch;
    }
  }

  if (bestScore >= 1) return bestPhase;

  const last = amostras[amostras.length - 1]!;
  for (let phase = 0; phase < 6; phase++) {
    if (pred(last.off, phase) === last.v) return phase;
  }
  return phaseDefault;
}

function celulaHorarioComercial(dia: DiaMesLite): "Comercial" | "Folga" {
  return valorCelulaHorarioComercialSintetico(dia.iso);
}

function predMrn33FaseA(off: number, phase: number): "MRN" | "Folga" {
  return mod(off + phase, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseB(off: number, phase: number): "MRN" | "Folga" {
  return mod(off + phase + 3, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseAftA(off: number, phase: number): "MRN" | "Folga" {
  return mod(off + phase + 1, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseAftB(off: number, phase: number): "MRN" | "Folga" {
  return mod(off + phase + 4, 6) < 3 ? "MRN" : "Folga";
}

function predNgt33Fase(off: number, phase: number): "NGT" | "Folga" {
  const m = mod(off + phase, 6);
  const work = m === 0 || m === 4 || m === 5;
  return work ? "NGT" : "Folga";
}

function pred4x2Fase(off: number, phase: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = mod(off + phase, 6);
  if (m >= 4) return "Folga";
  return sigla;
}

function pred5x1Fase(off: number, phase: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = mod(off + phase, 6);
  if (m >= 5) return "Folga";
  return sigla;
}

function inferirFaseMrn33Variante(
  amostras: AmostraOperacional[],
  phaseDefault: number,
  variantes: ReadonlyArray<{
    pred: (off: number, phase: number) => "MRN" | "AFT" | "NGT" | "Folga";
  }>,
): { phase: number; pred: (off: number, phase: number) => "MRN" | "Folga" } {
  const fallbackPred = variantes[0]!.pred as (off: number, phase: number) => "MRN" | "Folga";
  if (amostras.length === 0) {
    return { phase: phaseDefault, pred: fallbackPred };
  }

  let bestPhase = phaseDefault;
  let bestPred = fallbackPred;
  let bestScore = -1;
  let bestLastMatch = false;

  const lastOpIso = amostras[amostras.length - 1]!.iso;

  for (const variante of variantes) {
    for (let phase = 0; phase < 6; phase++) {
      let score = 0;
      let lastMatch = false;
      for (const s of amostras) {
        if (variante.pred(s.off, phase) === s.v) {
          score++;
          if (s.iso === lastOpIso) lastMatch = true;
        }
      }
      if (score > bestScore || (score === bestScore && lastMatch && !bestLastMatch)) {
        bestScore = score;
        bestPhase = phase;
        bestPred = variante.pred as (off: number, phase: number) => "MRN" | "Folga";
        bestLastMatch = lastMatch;
      }
    }
  }

  if (bestScore >= 1) return { phase: bestPhase, pred: bestPred };

  const last = amostras[amostras.length - 1]!;
  for (const variante of variantes) {
    for (let phase = 0; phase < 6; phase++) {
      if (variante.pred(last.off, phase) === last.v) {
        return { phase, pred: variante.pred as (off: number, phase: number) => "MRN" | "Folga" };
      }
    }
  }

  return { phase: phaseDefault, pred: fallbackPred };
}

function preencherDiasOperacionais(
  out: Record<string, string>,
  rowId: string,
  dias: DiaMesLite[],
  liveIso: string | null,
  pred: (off: number) => "MRN" | "AFT" | "NGT" | "Folga" | "Comercial",
): void {
  for (const dia of dias) {
    const k = `${rowId}|${dia.iso}`;
    if (diaAntesLiveNoEstudio(dia.iso, liveIso)) {
      out[k] = "Folga";
      continue;
    }
    const off = offsetDiaEscala(dia.iso, liveIso);
    out[k] = pred(off);
  }
}

/**
 * Gera mapa `rowId|iso` → valor da célula (MRN/AFT/NGT/Folga/Comercial).
 * `linhasOrdenadas`: mesma ordem da tabela (ex.: prestadores filtrados).
 */
export function gerarCelulasSugestaoCustomerService(
  linhasOrdenadas: LinhaCS[],
  dias: DiaMesLite[],
  opcoes?: OpcoesSugestaoCs,
): Record<string, string> {
  const out: Record<string, string> = {};
  let idxMrn33 = 0;
  let idxNgt33 = 0;
  let idxAft33 = 0;
  let idxOutroOp = 0;

  const prevMap = opcoes?.celulasMesAnterior ?? undefined;
  const primeiroIso = dias[0]?.iso ?? "";
  const monthStartOff = primeiroIso ? dayOffsetUtc2000(primeiroIso) : 0;
  const KDefaultLegado = mod(-monthStartOff, 6);

  for (const row of linhasOrdenadas) {
    const liveIso = liveNoEstudioIsoNorm(row.liveNoEstudioIso);
    const phaseDefaultLegado = liveIso ? 0 : KDefaultLegado;
    const esc = normalizarEscalaCadastro(row.escalaCadastro);
    const sig = row.siglaTurnoStaff.trim() as "" | "MRN" | "AFT" | "NGT";
    const eh5x2 = esc === "5x2" || turnoStaffEhComercial5x2(row.turnoStaffNome);

    const isosRef =
      prevMap && primeiroIso ? isosReferenciaContinuidade(row.id, primeiroIso, prevMap, 31) : [];
    const amostras = amostrasOperacionaisReferencia(row.id, isosRef, prevMap ?? {}, liveIso);

    if (eh5x2) {
      for (const dia of dias) {
        const k = `${row.id}|${dia.iso}`;
        if (diaAntesLiveNoEstudio(dia.iso, liveIso)) {
          out[k] = "Folga";
        } else {
          out[k] = celulaHorarioComercial(dia);
        }
      }
      continue;
    }

    if (esc === "3x3" && sig === "MRN") {
      const useB = idxMrn33 % 2 === 1;
      const variantes = useB
        ? [{ pred: predMrn33FaseB }, { pred: predMrn33FaseA }]
        : [{ pred: predMrn33FaseA }, { pred: predMrn33FaseB }];
      const { phase, pred } = inferirFaseMrn33Variante(amostras, phaseDefaultLegado, variantes);
      preencherDiasOperacionais(out, row.id, dias, liveIso, (off) => pred(off, phase));
      idxMrn33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "NGT") {
      const phaseDefault = mod(phaseDefaultLegado + idxNgt33 * 3, 6);
      const phase = inferirFaseCicloMod6(amostras, predNgt33Fase, phaseDefault);
      preencherDiasOperacionais(out, row.id, dias, liveIso, (off) => predNgt33Fase(off, phase));
      idxNgt33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "AFT") {
      const useB = idxAft33 % 2 === 1;
      const variantes = useB
        ? [{ pred: predMrn33FaseAftB }, { pred: predMrn33FaseAftA }]
        : [{ pred: predMrn33FaseAftA }, { pred: predMrn33FaseAftB }];
      const { phase, pred } = inferirFaseMrn33Variante(amostras, phaseDefaultLegado, variantes);
      preencherDiasOperacionais(out, row.id, dias, liveIso, (off) => pred(off, phase));
      idxAft33 += 1;
      continue;
    }

    if (sig === "MRN" || sig === "AFT" || sig === "NGT") {
      const phaseDefault = mod(phaseDefaultLegado + idxOutroOp * 2, 6);
      const predFn =
        esc === "5x1"
          ? (off: number, phase: number) => pred5x1Fase(off, phase, sig)
          : (off: number, phase: number) => pred4x2Fase(off, phase, sig);
      const phase = inferirFaseCicloMod6(amostras, predFn, phaseDefault);
      preencherDiasOperacionais(out, row.id, dias, liveIso, (off) => predFn(off, phase));
      idxOutroOp += 1;
      continue;
    }

    for (const dia of dias) {
      out[`${row.id}|${dia.iso}`] = "Folga";
    }
  }

  return out;
}
