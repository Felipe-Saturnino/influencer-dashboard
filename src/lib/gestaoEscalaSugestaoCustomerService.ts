/**
 * Sugestão de escala Customer Service — lógica alinhada ao simulado de Março/2026,
 * com sequência contínua entre meses (usa offset de dias desde 2000-01-01 UTC + fase K).
 * Se existirem células salvas do mês anterior, infere K a partir delas para alinhar Maio a Abril, etc.
 */

import { normalizarEscalaCadastro, turnoStaffEhComercial5x2 } from "./rhEscalaTurnos";

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

function normOperacional(v: string): "MRN" | "AFT" | "NGT" | "Folga" | null {
  const t = v.trim();
  if (t === "MRN" || t === "AFT" || t === "NGT" || t === "Folga") return t;
  return null;
}

/**
 * Escolhe K ∈ [0,5] que melhor explica os valores do mês anterior; se empatar, prefere o que acerta o último dia conhecido.
 * `pred(off, K)` devolve MRN/NGT/Folga.
 */
function inferirKMod6(
  rowId: string,
  prevIsosAsc: string[],
  prevMap: Record<string, string>,
  pred: (off: number, K: number) => "MRN" | "AFT" | "NGT" | "Folga",
  KDefault: number,
): number {
  if (prevIsosAsc.length === 0) return KDefault;

  let bestK = KDefault;
  let bestScore = -1;
  let bestLastMatch = false;

  for (let K = 0; K < 6; K++) {
    let score = 0;
    let lastMatch = false;
    let any = false;
    for (const iso of prevIsosAsc) {
      const raw = prevMap[chaveCel(rowId, iso)]?.trim() ?? "";
      const v = normOperacional(raw);
      if (v === null) continue;
      any = true;
      const off = dayOffsetUtc2000(iso);
      const p = pred(off, K);
      if (p === v) {
        score++;
        if (iso === prevIsosAsc[prevIsosAsc.length - 1]) lastMatch = true;
      }
    }
    if (!any) continue;
    if (score > bestScore || (score === bestScore && lastMatch && !bestLastMatch)) {
      bestScore = score;
      bestK = K;
      bestLastMatch = lastMatch;
    }
  }
  return bestScore < 1 ? KDefault : bestK;
}

function celulaHorarioComercial(dia: DiaMesLite): "Comercial" | "Folga" {
  if (dia.isWeekend || dia.isFeriadoSP) return "Folga";
  return "Comercial";
}

function predMrn33FaseA(off: number, K: number): "MRN" | "Folga" {
  return mod(off + K, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseB(off: number, K: number): "MRN" | "Folga" {
  return mod(off + K + 3, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseAftA(off: number, K: number): "MRN" | "Folga" {
  return mod(off + K + 1, 6) < 3 ? "MRN" : "Folga";
}

function predMrn33FaseAftB(off: number, K: number): "MRN" | "Folga" {
  return mod(off + K + 4, 6) < 3 ? "MRN" : "Folga";
}

function predNgt33(off: number, K: number, deslocPrestador: number): "NGT" | "Folga" {
  const m = mod(off + K + deslocPrestador * 3, 6);
  const work = m === 0 || m === 4 || m === 5;
  return work ? "NGT" : "Folga";
}

function pred4x2(off: number, K: number, desloc: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = mod(off + K + desloc, 6);
  if (m >= 4) return "Folga";
  return sigla;
}

function pred5x1(off: number, K: number, desloc: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = mod(off + K + desloc, 6);
  if (m >= 5) return "Folga";
  return sigla;
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
  const prevIsosAsc = primeiroIso ? ultimosIsosAntesPrimeiroDiaMes(primeiroIso, 14) : [];
  const monthStartOff = primeiroIso ? dayOffsetUtc2000(primeiroIso) : 0;
  const KDefault = mod(-monthStartOff, 6);

  for (const row of linhasOrdenadas) {
    const esc = normalizarEscalaCadastro(row.escalaCadastro);
    const sig = row.siglaTurnoStaff.trim() as "" | "MRN" | "AFT" | "NGT";
    const eh5x2 = esc === "5x2" || turnoStaffEhComercial5x2(row.turnoStaffNome);

    if (eh5x2) {
      for (const dia of dias) {
        const k = `${row.id}|${dia.iso}`;
        out[k] = celulaHorarioComercial(dia);
      }
      continue;
    }

    if (esc === "3x3" && sig === "MRN") {
      const useB = idxMrn33 % 2 === 1;
      const K = inferirKMod6(
        row.id,
        prevIsosAsc,
        prevMap ?? {},
        (off, Kk) => (useB ? predMrn33FaseB(off, Kk) : predMrn33FaseA(off, Kk)),
        KDefault,
      );
      for (const dia of dias) {
        const off = dayOffsetUtc2000(dia.iso);
        const k = `${row.id}|${dia.iso}`;
        out[k] = useB ? predMrn33FaseB(off, K) : predMrn33FaseA(off, K);
      }
      idxMrn33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "NGT") {
      const desloc = idxNgt33;
      const K = inferirKMod6(
        row.id,
        prevIsosAsc,
        prevMap ?? {},
        (off, Kk) => predNgt33(off, Kk, desloc),
        KDefault,
      );
      for (const dia of dias) {
        const off = dayOffsetUtc2000(dia.iso);
        const k = `${row.id}|${dia.iso}`;
        out[k] = predNgt33(off, K, desloc);
      }
      idxNgt33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "AFT") {
      const useB = idxAft33 % 2 === 1;
      const K = inferirKMod6(
        row.id,
        prevIsosAsc,
        prevMap ?? {},
        (off, Kk) => (useB ? predMrn33FaseAftB(off, Kk) : predMrn33FaseAftA(off, Kk)),
        KDefault,
      );
      for (const dia of dias) {
        const off = dayOffsetUtc2000(dia.iso);
        const k = `${row.id}|${dia.iso}`;
        out[k] = useB ? predMrn33FaseAftB(off, K) : predMrn33FaseAftA(off, K);
      }
      idxAft33 += 1;
      continue;
    }

    if (sig === "MRN" || sig === "AFT" || sig === "NGT") {
      const desloc = idxOutroOp * 2;
      const K = inferirKMod6(
        row.id,
        prevIsosAsc,
        prevMap ?? {},
        (off, Kk) => {
          if (esc === "5x1") return pred5x1(off, Kk, desloc, sig);
          return pred4x2(off, Kk, desloc, sig);
        },
        KDefault,
      );
      for (const dia of dias) {
        const off = dayOffsetUtc2000(dia.iso);
        const k = `${row.id}|${dia.iso}`;
        if (esc === "4x2") {
          out[k] = pred4x2(off, K, desloc, sig);
        } else if (esc === "5x1") {
          out[k] = pred5x1(off, K, desloc, sig);
        } else {
          out[k] = pred4x2(off, K, desloc, sig);
        }
      }
      idxOutroOp += 1;
      continue;
    }

    for (const dia of dias) {
      out[`${row.id}|${dia.iso}`] = "Folga";
    }
  }

  return out;
}
