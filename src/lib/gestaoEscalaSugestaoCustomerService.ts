/**
 * Sugestão de escala Customer Service — lógica alinhada ao simulado de Março/2026:
 * - 5x2 (Horário Comercial): Comercial em dias úteis sem feriado SP; Folga em fim de semana e feriados.
 * - 3x3 Manhã: duas fases defasadas (Thais / Roberta) — ciclo 6 dias, 3 Manhã + 3 Folga.
 * - 3x3 Noite: padrão Stefani — ciclo 6 dias (Noite quando (diaIndex mod 6) ∈ {0,4,5}).
 * Demais escalas operacionais: aproximação 4x2 (4 trabalho / 2 folga) ou 5x1 (5/1) por índice do colaborador.
 */

import { normalizarEscalaCadastro } from "./rhEscalaTurnos";

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

function celulaHorarioComercial(dia: DiaMesLite): "Comercial" | "Folga" {
  if (dia.isWeekend || dia.isFeriadoSP) return "Folga";
  return "Comercial";
}

/** Thais: M nos primeiros 3 de cada bloco de 6 dias (índice 0 = 1.º dia do mês). */
function celulaManha3x3FaseA(di: number): "MRN" | "Folga" {
  return di % 6 < 3 ? "MRN" : "Folga";
}

/** Roberta: mesma cadência, defasagem de 3 dias. */
function celulaManha3x3FaseB(di: number): "MRN" | "Folga" {
  return (di + 3) % 6 < 3 ? "MRN" : "Folga";
}

/** Stefani: N no 1.º dia do bloco e nos dois últimos (0,4,5 mod 6). */
function celulaNoite3x3(di: number, deslocPrestador: number): "NGT" | "Folga" {
  const m = (di + deslocPrestador * 3) % 6;
  const work = m === 0 || m === 4 || m === 5;
  return work ? "NGT" : "Folga";
}

function celula4x2(di: number, desloc: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = (di + desloc) % 6;
  const work = m < 4;
  if (!work) return "Folga";
  return sigla;
}

function celula5x1(di: number, desloc: number, sigla: "MRN" | "AFT" | "NGT"): "MRN" | "AFT" | "NGT" | "Folga" {
  const m = (di + desloc) % 6;
  const work = m < 5;
  if (!work) return "Folga";
  return sigla;
}

/**
 * Gera mapa `rowId|iso` → valor da célula (MRN/AFT/NGT/Folga/Comercial).
 * `linhasOrdenadas`: mesma ordem da tabela (ex.: prestadores filtrados).
 */
export function gerarCelulasSugestaoCustomerService(
  linhasOrdenadas: LinhaCS[],
  dias: DiaMesLite[],
): Record<string, string> {
  const out: Record<string, string> = {};
  let idxMrn33 = 0;
  let idxNgt33 = 0;
  let idxAft33 = 0;
  let idxOutroOp = 0;

  for (const row of linhasOrdenadas) {
    const esc = normalizarEscalaCadastro(row.escalaCadastro);
    const sig = row.siglaTurnoStaff.trim() as "" | "MRN" | "AFT" | "NGT";
    const eh5x2 = esc === "5x2" || row.turnoStaffNome.trim() === "Horário Comercial";

    if (eh5x2) {
      for (const dia of dias) {
        const k = `${row.id}|${dia.iso}`;
        out[k] = celulaHorarioComercial(dia);
      }
      continue;
    }

    if (esc === "3x3" && sig === "MRN") {
      const useB = idxMrn33 % 2 === 1;
      dias.forEach((_, di) => {
        const k = `${row.id}|${dias[di]!.iso}`;
        out[k] = useB ? celulaManha3x3FaseB(di) : celulaManha3x3FaseA(di);
      });
      idxMrn33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "NGT") {
      dias.forEach((_, di) => {
        const k = `${row.id}|${dias[di]!.iso}`;
        out[k] = celulaNoite3x3(di, idxNgt33);
      });
      idxNgt33 += 1;
      continue;
    }

    if (esc === "3x3" && sig === "AFT") {
      const useB = idxAft33 % 2 === 1;
      dias.forEach((_, di) => {
        const k = `${row.id}|${dias[di]!.iso}`;
        out[k] = useB ? celulaManha3x3FaseB(di + 1) : celulaManha3x3FaseA(di + 1);
      });
      idxAft33 += 1;
      continue;
    }

    if (sig === "MRN" || sig === "AFT" || sig === "NGT") {
      const desloc = idxOutroOp * 2;
      dias.forEach((dia, di) => {
        const k = `${row.id}|${dia.iso}`;
        if (esc === "4x2") {
          out[k] = celula4x2(di, desloc, sig);
        } else if (esc === "5x1") {
          out[k] = celula5x1(di, desloc, sig);
        } else {
          out[k] = celula4x2(di, desloc, sig);
        }
      });
      idxOutroOp += 1;
      continue;
    }

    for (const dia of dias) {
      out[`${row.id}|${dia.iso}`] = "Folga";
    }
  }

  return out;
}
