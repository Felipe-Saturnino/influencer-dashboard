/** Dados de um dia civil do mês no PDF do Calendário (Compromissos). */
export type RhCalendarioPdfDia = {
  diaIso: string;
  /** 1–31 */
  diaNumero: number;
  /** Dom, Seg, Ter… */
  diaSemanaCurto: string;
  /** DOMINGO, SEGUNDA-FEIRA… (lista) */
  diaSemanaLista: string;
  /**
   * Texto do quadro: «Noite — 18h às 06h» ou null → exibir Folga.
   * Compra/Venda/Troca entram só o rótulo do turno (sem horário).
   */
  turnoLinha: string | null;
  /** Linhas «Reunião - Com quem». */
  reunioes: string[];
};

export type RhCalendarioCompromissosPdfInput = {
  /** Ex.: «Maio 2026» */
  mesLabel: string;
  nomePessoa: string;
  timeNome: string;
  ano: number;
  /** 0–11 */
  mes0: number;
  /** Todos os dias civis do mês (ordem crescente). */
  dias: RhCalendarioPdfDia[];
};

const DAYS_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DAYS_LIST_PT = [
  "DOMINGO",
  "SEGUNDA-FEIRA",
  "TERÇA-FEIRA",
  "QUARTA-FEIRA",
  "QUINTA-FEIRA",
  "SEXTA-FEIRA",
  "SÁBADO",
] as const;

export function partesDataIsoPdf(diaIso: string): { y: number; m: number; d: number } | null {
  const [ys, ms, ds] = diaIso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function diaSemanaCurtoPdf(diaIso: string): string {
  const p = partesDataIsoPdf(diaIso);
  if (!p) return "";
  return DAYS_SHORT_PT[new Date(p.y, p.m - 1, p.d).getDay()] ?? "";
}

export function diaSemanaListaPdf(diaIso: string): string {
  const p = partesDataIsoPdf(diaIso);
  if (!p) return "";
  return DAYS_LIST_PT[new Date(p.y, p.m - 1, p.d).getDay()] ?? "";
}

/** Situação resumida para a lista (turno ou Folga + reuniões). */
export function situacaoListaPdf(dia: RhCalendarioPdfDia): string {
  const base = dia.turnoLinha?.trim() || "Folga";
  if (dia.reunioes.length === 0) return base;
  return [base, ...dia.reunioes].join(" | ");
}

/** «DD/MM/AAAA - DIA DA SEMANA: SITUAÇÃO» */
export function linhaListaCalendarioPdf(dia: RhCalendarioPdfDia): string {
  const p = partesDataIsoPdf(dia.diaIso);
  if (!p) return dia.diaIso;
  const dd = String(p.d).padStart(2, "0");
  const mm = String(p.m).padStart(2, "0");
  return `${dd}/${mm}/${p.y} - ${dia.diaSemanaLista}: ${situacaoListaPdf(dia)}`;
}

/** Cabeçalho da célula da grade: «15 - Qua». */
export function cabecalhoCelulaGradePdf(dia: RhCalendarioPdfDia): string {
  return `${dia.diaNumero} - ${dia.diaSemanaCurto}`;
}

function slugArquivoCalendario(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return base.slice(0, 40) || "calendario";
}

type JsPdfDoc = {
  setFont: (name: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (w: number) => void;
  text: (text: string | string[], x: number, y: number, options?: { align?: string; maxWidth?: number }) => void;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  getTextWidth: (text: string) => number;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  addPage: () => void;
  save: (filename: string) => void;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
};

function desenharGradeMes(
  pdf: JsPdfDoc,
  input: RhCalendarioCompromissosPdfInput,
  marginX: number,
  startY: number,
  maxW: number,
): number {
  const colW = maxW / 7;
  const headerH = 6;
  const cellH = 24;
  let y = startY;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  for (let i = 0; i < 7; i++) {
    const label = DAYS_SHORT_PT[i]!;
    const tw = pdf.getTextWidth(label);
    pdf.text(label, marginX + i * colW + (colW - tw) / 2, y + 4);
  }
  y += headerH;

  const porIso = new Map(input.dias.map((d) => [d.diaIso, d]));
  const firstDow = new Date(input.ano, input.mes0, 1).getDay();
  const lastDay = new Date(input.ano, input.mes0 + 1, 0).getDate();
  const totalCells = firstDow + lastDay;
  const rows = Math.ceil(totalCells / 7);

  pdf.setLineWidth(0.25);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 7; col++) {
      const cellIndex = row * 7 + col;
      const dayNum = cellIndex - firstDow + 1;
      const x = marginX + col * colW;
      const cy = y + row * cellH;

      pdf.setDrawColor(210, 210, 215);
      pdf.rect(x, cy, colW, cellH, "S");

      if (dayNum < 1 || dayNum > lastDay) continue;

      const iso = `${input.ano}-${String(input.mes0 + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dia = porIso.get(iso);
      if (!dia) continue;

      let ty = cy + 4.2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(40, 40, 40);
      pdf.text(cabecalhoCelulaGradePdf(dia), x + 1.2, ty);
      ty += 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      const corpo = dia.turnoLinha?.trim() || "Folga";
      const corpoLinhas = pdf.splitTextToSize(corpo, colW - 2.4);
      if (dia.turnoLinha) {
        pdf.setTextColor(30, 54, 248);
      } else {
        pdf.setTextColor(120, 120, 120);
      }
      for (const linha of corpoLinhas.slice(0, 2)) {
        pdf.text(linha, x + 1.2, ty);
        ty += 3.3;
      }

      if (dia.reunioes.length > 0) {
        pdf.setTextColor(180, 120, 20);
        for (const reun of dia.reunioes.slice(0, 2)) {
          if (ty > cy + cellH - 2.5) break;
          const rl = pdf.splitTextToSize(reun, colW - 2.4);
          pdf.text(rl[0] ?? reun, x + 1.2, ty);
          ty += 3.3;
        }
      }
    }
  }

  return y + rows * cellH + 5;
}

/**
 * Gera e baixa o PDF do calendário pessoal (mês): título, subtítulo, grade e lista.
 * jspdf só carrega no download (chunk vendor-jspdf).
 */
export async function baixarCalendarioCompromissosPdf(
  input: RhCalendarioCompromissosPdfInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }) as unknown as JsPdfDoc;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 12;
  const marginBottom = 12;
  const maxW = pageW - marginX * 2;
  let y = 14;

  const ensureSpace = (need: number) => {
    if (y + need <= pageH - marginBottom) return;
    pdf.addPage();
    y = 14;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(30, 30, 30);
  pdf.text(`Calendário - ${input.mesLabel}`, marginX, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(70, 70, 75);
  const sub = `${input.nomePessoa.trim() || "—"} · ${input.timeNome.trim() || "—"}`;
  const subLinhas = pdf.splitTextToSize(sub, maxW);
  pdf.text(subLinhas, marginX, y);
  y += subLinhas.length * 5 + 4;

  y = desenharGradeMes(pdf, input, marginX, y, maxW);

  // Lista em página nova se sobrar pouco espaço após a grade
  if (y > pageH - 40) {
    pdf.addPage();
    y = 14;
  } else {
    y += 2;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(30, 30, 30);
  pdf.text("Lista do mês", marginX, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);
  for (const dia of input.dias) {
    const linha = linhaListaCalendarioPdf(dia);
    const wrapped = pdf.splitTextToSize(linha, maxW);
    ensureSpace(wrapped.length * 4.2 + 1.5);
    pdf.text(wrapped, marginX, y);
    y += wrapped.length * 4.2 + 1.2;
  }

  const slug = slugArquivoCalendario(input.nomePessoa);
  const ref = `${input.ano}-${String(input.mes0 + 1).padStart(2, "0")}`;
  pdf.save(`calendario-${slug}-${ref}.pdf`);
}
